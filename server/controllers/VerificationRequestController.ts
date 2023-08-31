import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { marked } from 'marked';
import {
  AccessRequestApplication,
  Application,
  sequelize,
  User,
  UserApplication,
  VerificationRequest,
  VerificationRequestHistory,
} from '../models';
import errors from '../errors';
import { AccessRequest } from '../models/AccessRequest';
import { MailController } from './MailController';
import {
  CreateVerificationRequestProps,
  GetAllVerificationRequestsQuery,
  UpdateVerificationRequestBody,
  UpdateVerificationRequestByUserProps,
  VerificationRequestIDParams,
} from '../types/verificationrequests';

export const verificationRequestEffects = ['approve', 'deny', 'request_change'];
export const verificationRequestStatuses = ['approved', 'denied', 'needs_change', 'open'];

export const accessRequestEffects = ['approve', 'deny', 'partially_approve'];
export const accessRequestStatuses = ['open', 'denied', 'approved', 'partially_approved'];

export class VerificationRequestController {

  /**
   * Creates a new Verification Request, including history and underlying Access Request.
   *
   * @param uuid - Corresponding user identifier.
   * @param props - Verification Request inputs.
   * @returns The newly created Request.
   */
  public async createVerificationRequest(uuid: string, props: CreateVerificationRequestProps): Promise<VerificationRequest> {
    const { bio_url, applications } = props;
    const createdRequest = await sequelize.transaction(async (transaction) => {
      const newRequest = await VerificationRequest.create({
        user_id: uuid,
        status: 'open',
        bio_url,
      }, { validate: true, transaction });
      await VerificationRequestHistory.create({
        verification_request_id: newRequest.id,
        status: 'open',
        bio_url,
      }, { validate: true, transaction });
      const newAccessRequest = await AccessRequest.create({
        user_id: uuid,
        verification_request_id: newRequest.id,
        status: 'open',
      }, { validate: true, transaction });
      if (applications) {
        await AccessRequestApplication.bulkCreate(
          applications.map((app_id) => ({
            access_request_id: newAccessRequest.get('id'),
            application_id: app_id,
          })),
          { validate: true, transaction },
        );
      }
      return newRequest;
    });

    await this.sendAdminNewRequestNotification();
    return createdRequest;
  }

  /**
   * Retrieves a single Verification Request.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getVerificationRequest(req: Request, res: Response): Promise<Response> {
    const { verificationRequestID } = (req.params as unknown) as VerificationRequestIDParams;
    const foundReq = await VerificationRequest.findByPk(
      verificationRequestID,
      {
        include: [
          {
            model: AccessRequest,
            include: [{ model: AccessRequestApplication }],
          },
        ],
      },
    );
    if (!foundReq) {
      return errors.notFound(res);
    }

    return res.send({ data: foundReq.get() });
  }

  /**
   * Retrieves all Verification Requests using optional searching and pagination.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getAllVerificationRequests(req: Request, res: Response): Promise<Response> {
    const { offset, limit, status } = (req.query as unknown) as GetAllVerificationRequestsQuery;

    const { count, rows } = await VerificationRequest.findAndCountAll({
      ...(status && { where: { status } }),
      offset,
      limit,
      order: sequelize.literal('created_at'),
      include: [
        {
          model: AccessRequest,
          include: [{ model: AccessRequestApplication }],
        },
      ],
    });
    const results = rows.map((row) => row.get());

    return res.send({
      meta: {
        offset,
        limit,
        total: count,
      },
      data: results,
    });
  }

  /**
   * Updates a Verification Request according to the effect specified (by an API User).
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async updateVerificationRequest(req: Request, res: Response): Promise<Response> {
    const { verificationRequestID } = (req.params as unknown) as VerificationRequestIDParams;
    const props = req.body as UpdateVerificationRequestBody;

    const foundReq = await VerificationRequest.findByPk(verificationRequestID);
    if (!foundReq) {
      return errors.notFound(res);
    }
    const foundUser = await User.findByPk(foundReq.get('user_id'));
    if (!foundUser) {
      return errors.notFound(res);
    }

    if (props.effect === 'request_change' && props.approved_applications?.length) {
      return errors.badRequest(res);
    }

    const foundAccessReq = await AccessRequest.findOne({
      where: { verification_request_id: foundReq.id },
      include: [{ model: Application }],
    });

    await sequelize.transaction(async (transaction) => {
      // <request change>
      if (props.effect === 'request_change') {
        await foundReq.update({
          status: 'needs_change',
          ...(props.reason && { decision_reason: props.reason }),
        }, { transaction });
        await VerificationRequestHistory.create({
          verification_request_id: foundReq.id,
          status: 'needs_change',
          bio_url: foundReq.get('bio_url'),
          ...(props.reason && { decision_reason: props.reason }),
        }, { validate: true, transaction });
        await this.sendUserRequestChangeRequestedNotification(foundUser.get('email'), props.reason);
        return foundReq;
      }
      // </request change>

      // <deny>
      if (props.effect === 'deny') {
        await foundReq.update({
          status: 'denied',
          ...(props.reason && { decision_reason: props.reason }),
        });
        await VerificationRequestHistory.create({
          verification_request_id: foundReq.id,
          status: 'denied',
          bio_url: foundReq.get('bio_url'),
          ...(props.reason && { decision_reason: props.reason }),
        }, { validate: true, transaction });
        if (foundAccessReq) {
          await foundAccessReq.update({ status: 'denied' }, { transaction });
        }
        await this.sendUserRequestDeniedNotification(foundUser.get('email'), props.reason);
        return foundReq;
      }
      // </deny>

      // <approve>
      await foundReq.update({
        status: 'approved',
        ...(props.reason && { decision_reason: props.reason }),
      });
      if (foundAccessReq)
        await VerificationRequestHistory.create({
          verification_request_id: foundReq.id,
          status: 'approved',
          bio_url: foundReq.get('bio_url'),
          ...(props.reason && { decision_reason: props.reason }),
        }, { validate: true, transaction });

      // process application access
      const defaultApps = await Application.findAll({
        where: {
          [Op.and]: [
            { default_access: 'all' },
            { app_type: 'standalone' },
          ],
        },
      });
      let userAppsToCreate = defaultApps.map((app) => ({
        user_id: foundUser.get('uuid'),
        application_id: app.get('id'),
      }));
      if (props.approved_applications) {
        const specificApps = await Application.findAll({
          where: {
            [Op.and]: [
              { id: { [Op.in]: props.approved_applications } },
              { app_type: 'standalone' },
            ],
          },
        });
        userAppsToCreate = [...userAppsToCreate, ...specificApps.map((app) => ({
          user_id: foundUser.get('uuid'),
          application_id: app.get('id'),
        }))];
        if (foundAccessReq) {
          await foundAccessReq.update({ status: 'partially_approved' }, { transaction });
        }
      } else if (foundReq) {
        const specificApps = foundAccessReq?.get('applications') || [];
        userAppsToCreate = [...userAppsToCreate, ...specificApps.map((app) => ({
          user_id: foundUser.get('uuid'),
          application_id: app.get('id'),
        }))];
        if (foundAccessReq) {
          await foundAccessReq.update({ status: 'approved' }, { transaction });
        }
      }

      // process library access
      let userLibsToCreate: { user_id: string; application_id: number }[] = [];
      const allLibraries = await Application.findAll({ where: { app_type: 'library' } });
      if (props.library_access_option === 'all') {
        userLibsToCreate = allLibraries.map((l) => ({
          user_id: foundUser.get('uuid'),
          application_id: l.get('id'),
        }));
      }
      if (props.library_access_option === 'default') {
        userLibsToCreate = allLibraries.filter((l) => l.get('is_default_library') === true).map((l) => ({
          user_id: foundUser.get('uuid'),
          application_id: l.get('id'),
        }));
      }
      if (props.library_access_option === 'specific') {
        userLibsToCreate = allLibraries
          .filter((l) => !!(props.libraries || [])
            .find((approvedLib) => approvedLib === l.get('id')))
          .map((l) => ({
            user_id: foundUser.get('uuid'),
            application_id: l.get('id'),
          }));
      }

      // create user apps
      const uniqueAppIDs = new Set();
      const allUserAppsToCreate = [...userAppsToCreate, ...userLibsToCreate].filter((ua) => {
        if (!uniqueAppIDs.has(ua.application_id)) {
          uniqueAppIDs.add(ua.application_id);
          return true;
        }
        return false;
      });
      await UserApplication.bulkCreate(allUserAppsToCreate, { validate: true, transaction });

      // TODO: handle library user creation

      await this.sendUserRequestApprovedNotification(foundUser.get('email'), props.reason);
      return foundReq;
    });

    return res.send({ data: foundReq.get() });
  }

  /**
   * Updates a Verification Request given properties allowed to be modified by the user.
   *
   * @param verification_request_id - Identifier of the existing Verification Request.
   * @param props - Update inputs.
   * @returns The updated Request or null if failed.
   */
  public async updateVerificationRequestByUser(verification_request_id: number, props: UpdateVerificationRequestByUserProps) {
    const foundVerifyReq = await VerificationRequest.findByPk(verification_request_id);
    if (!foundVerifyReq) {
      return null;
    }

    const prevStatus = foundVerifyReq.get('status');
    const { bio_url, status } = props;
    const updatedReq = await sequelize.transaction(async (transaction) => {
      await foundVerifyReq.update({ ...props }, { transaction });
      await VerificationRequestHistory.create({
        verification_request_id: foundVerifyReq.id,
        status: status || foundVerifyReq.get('status'),
        bio_url,
      }, { validate: true, transaction });
      return foundVerifyReq;
    });

    if (prevStatus === 'needs_change' && status === 'open') {
      await this.sendAdminUpdatedRequestNotification();
    }
    return updatedReq;
  }

  public async sendAdminNewRequestNotification() {
    const mailSender = new MailController();
    if (mailSender.isReady()) {
      const emailRes = await mailSender.send({
        destination: { to: [mailSender.adminNotificationEmailAddress] },
        subject: 'LibreOne: New Verification Request Submitted',
        htmlContent: `
          <p>A new Instructor Verification Request has been submitted. Please open the Verification Requests Console in Conductor to review.</p>
          <br />
          <p><i>This message was autogenerated by LibreOne.</i></p>
        `,
      });
      if (!emailRes) {
        console.error(`Error sending new Verification Request notification to administrators at "${mailSender.adminNotificationEmailAddress}"`);
        return false;
      }
    } else {
      console.error('Mail sender not ready for verification request administrator alert.');
      return false;
    }
    return true;
  }

  public async sendAdminUpdatedRequestNotification() {
    const mailSender = new MailController();
    if (mailSender.isReady()) {
      const emailRes = await mailSender.send({
        destination: { to: [mailSender.adminNotificationEmailAddress] },
        subject: 'LibreOne: Verification Request Updated',
        htmlContent: `
          <p>A previously reviewed Instructor Verification Request has been updated by the requester. Please open the Verification Requests Console in Conductor to review again.</p>
          <br />
          <p><i>This message was autogenerated by LibreOne.</i></p>
        `,
      });
      if (!emailRes) {
        console.error(`Error sending updated Verification Request notification to administrators at "${mailSender.adminNotificationEmailAddress}"`);
        return false;
      }
    } else {
      console.error('Mail sender not ready for verification request update administrator alert.');
      return false;
    }
    return true;
  }

  public async sendUserRequestApprovedNotification(userEmail: string, comment?: string) {
    const mailSender = new MailController();
    if (mailSender.isReady()) {
      const emailRes = await mailSender.send({
        destination: { to: [userEmail] },
        subject: 'Your LibreTexts Verification Request Was Approved',
        htmlContent: `
          <p>Hello there,</p>
          <p>Good news! Your Instructor Verification Request was approved by the LibreTexts team!</p>
          ${comment ? `
            <p>The team member reviewing your request provided this comment:</p>
            <p>${marked.parseInline(comment)}</p>
          ` : ''}
          <p>If you have further questions, please feel free to reach out to <a href="mailto:support@libretexts.org">support@libretexts.org</a>.</p>
          <p>Best,</p>
          <p>The LibreTexts Team</p>
        `,
      });
      if (!emailRes) {
        console.error(`Error sending updated Verification Request Approved notification to user at "${userEmail}"`);
        return false;
      }
    } else {
      console.error('Mail sender not ready for verification request approved user notification.');
      return false;
    }
    return true;
  }

  public async sendUserRequestChangeRequestedNotification(userEmail: string, comment?: string) {
    const mailSender = new MailController();
    if (mailSender.isReady()) {
      const emailRes = await mailSender.send({
        destination: { to: [userEmail] },
        subject: 'Your LibreTexts Verification Request Needs More Information',
        htmlContent: `
          <p>Hello there,</p>
          <p>Your Instructor Verification Request has been reviewed by the LibreTexts team. We've determined we need more information to complete your request.</p>
          ${comment ? `
            <p>The team member reviewing your request provided this comment:</p>
            <p>${marked.parseInline(comment)}</p>
          ` : ''}
          <p>You can update your request in <a href="https://one.libretexts.org/instructor" target="_blank" rel="noopener noreferrer">LibreOne</a>.</p>
          <p>If you have further questions, please feel free to reach out to <a href="mailto:support@libretexts.org">support@libretexts.org</a>.</p>
          <p>Best,</p>
          <p>The LibreTexts Team</p>
        `,
      });
      if (!emailRes) {
        console.error(`Error sending updated Verification Request Change Requested notification to user at "${userEmail}"`);
        return false;
      }
    } else {
      console.error('Mail sender not ready for verification request change requested user notification.');
      return false;
    }
    return true; 
  }

  public async sendUserRequestDeniedNotification(userEmail: string, comment?: string) {
    const mailSender = new MailController();
    if (mailSender.isReady()) {
      const emailRes = await mailSender.send({
        destination: { to: [userEmail] },
        subject: 'Your LibreTexts Verification Request',
        htmlContent: `
          <p>Hello there,</p>
          <p>Your Instructor Verification Request has been reviewed by the LibreTexts team. Unfortunately, we have decided not to approve your request.</p>
          ${comment ? `
            <p>The team member reviewing your request provided this comment:</p>
            <p>${marked.parseInline(comment)}</p>
          ` : ''}
          <p>If you have further questions, please feel free to reach out to <a href="mailto:support@libretexts.org">support@libretexts.org</a>.</p>
          <p>Best,</p>
          <p>The LibreTexts Team</p>
        `,
      });
      if (!emailRes) {
        console.error(`Error sending Verification Request Denied notification to user at "${userEmail}"`);
        return false;
      }
    } else {
      console.error('Mail sender not ready for verification request denied user notification.');
      return false;
    }
    return true;
  }

}
