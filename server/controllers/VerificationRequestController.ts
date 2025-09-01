import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { marked } from 'marked';
import {
  AccessRequest,
  AccessRequestApplication,
  Application,
  sequelize,
  User,
  UserApplication,
  VerificationRequest,
  VerificationRequestHistory,
} from '../models';
import errors from '../errors';
import { MailController } from './MailController';
import {
  GetAllVerificationRequestsQuery,
  UpdateVerificationRequestByAdminBody,
  VerificationRequestIDParams,
} from '../types/verificationrequests';
import { UserController } from './UserController';
import { AuthController } from "@server/controllers/AuthController";
import { CreateUserVerificationRequestBody, UpdateUserVerificationRequestBody } from '@server/types/users';
import { EventSubscriberEmitter } from '@server/events/EventSubscriberEmitter';

export const verificationRequestEffects = ['approve', 'deny', 'request_change'];
export const verificationRequestStatuses = ['approved', 'denied', 'needs_change', 'open'];

export class VerificationRequestController {

  /**
   * Creates a new Verification Request, including history and underlying Access Request.
   *
   * @param uuid - Corresponding user identifier.
   * @param props - Verification Request inputs.
   * @returns The newly created Request.
   */
  public async createVerificationRequest(uuid: string, props: CreateUserVerificationRequestBody): Promise<VerificationRequest> {
    const { bio_url, addtl_info,  applications } = props;

    if(!bio_url && !addtl_info) {
      throw new Error('bad_request');
    }

    const createdRequest = await sequelize.transaction(async (transaction) => {
      const newRequest = await VerificationRequest.create({
        user_id: uuid,
        status: 'open',
        bio_url: bio_url || null,
        addtl_info: addtl_info || null,
      }, { validate: true, transaction });
      await VerificationRequestHistory.create({
        verification_request_id: newRequest.id,
        status: 'open',
        bio_url: bio_url || null,
        addtl_info: addtl_info || null,
      }, { validate: true, transaction });
      if (applications) {
        const newAccessRequest = await AccessRequest.create({
          user_id: uuid,
          verification_request_id: newRequest.id,
          status: 'open',
        }, { validate: true, transaction });
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
            include: [{ model: Application }],
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
      distinct: true,
      include: [
        {
          model: AccessRequest,
          include: [{ model: Application }],
        },
        {
          model: User,
          attributes: ['uuid', 'first_name', 'last_name', 'email'],
        }
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
    const props = req.body as UpdateVerificationRequestByAdminBody;

    const foundReq = await VerificationRequest.findByPk(verificationRequestID);
    if (!foundReq) {
      return errors.notFound(res);
    }
    const foundUser = await User.findByPk(foundReq.get('user_id'));
    if (!foundUser) {
      return errors.notFound(res);
    }
    const existingUserApps = await UserApplication.findAll({ where: { user_id: foundUser.get('uuid') } });

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
        await foundUser.update({ verify_status: 'needs_review' }, { transaction });
        await VerificationRequestHistory.create({
          verification_request_id: foundReq.id,
          status: 'needs_change',
          bio_url: foundReq.get('bio_url'),
          addtl_info: foundReq.get('addtl_info'),
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
        }, { transaction });
        await foundUser.update({ verify_status: 'denied' }, { transaction });
        await VerificationRequestHistory.create({
          verification_request_id: foundReq.id,
          status: 'denied',
          bio_url: foundReq.get('bio_url'),
          addtl_info: foundReq.get('addtl_info'),
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
      }, { transaction });
      await foundUser.update({ verify_status: 'verified' }, { transaction });
      if (foundAccessReq)
        await VerificationRequestHistory.create({
          verification_request_id: foundReq.id,
          status: 'approved',
          bio_url: foundReq.get('bio_url'),
          addtl_info: foundReq.get('addtl_info'),
          ...(props.reason && { decision_reason: props.reason }),
        }, { validate: true, transaction });

      // process application access
      if (!props.approved_applications) {
        return errors.badRequest(res);
      }
      const approvedApps = await Application.findAll({
        where: { id: { [Op.in]: props.approved_applications } },
      });
      if (props.approved_applications.length !== approvedApps.length) {
        console.warn({
          msg: 'Number of found applications does not match number of provided approved application identifiers.',
          approvedApplications: props.approved_applications,
          foundApplications: approvedApps.map((a) => a.get()),
        });
      }
      const existingUserAppIds = existingUserApps.map((ua) => ua.get('application_id'));
      const userAppsToCreate = approvedApps.map((app) => ({
        user_id: foundUser.get('uuid'),
        application_id: app.get('id'),
      })).filter((ua) => !existingUserAppIds.includes(ua.application_id));
      if (foundAccessReq) {
        await foundAccessReq.update({ status: 'approved' }, { transaction });
      }

      // create user apps
      const userController = new UserController();
      const promises = userAppsToCreate.map((ua) => userController.createUserApplicationInternal(
        ua.user_id,
        ua.application_id,
        transaction,
      ));

      await Promise.all(promises);

      // Notify conductor of verification update
      const authController = new AuthController();
      const webhookPromises = [
        authController.notifyConductorOfVerificationUpdate(foundUser),
        authController.notifyADAPTOfVerificationUpdate(foundUser)
      ];

      await Promise.all(webhookPromises); // Both calls return false and log if failed, so one shouldn't affect the other
      
      EventSubscriberEmitter.emit('user:updated', foundUser.get({ plain: true }));

      await this.sendUserRequestApprovedNotification(
        foundUser.get('email'),
        props.reason,
        approvedApps.map((a) => a.get('name')),
      );
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
  public async updateVerificationRequestByUser(verification_request_id: number, props: UpdateUserVerificationRequestBody) {
    const foundVerifyReq = await VerificationRequest.findByPk(verification_request_id);
    if (!foundVerifyReq) {
      return null;
    }

    const prevStatus = foundVerifyReq.get('status');
    const { bio_url, addtl_info } = props;
    const updatedReq = await sequelize.transaction(async (transaction) => {
      await foundVerifyReq.update({ ...props }, { transaction });
      await VerificationRequestHistory.create({
        verification_request_id: foundVerifyReq.id,
        bio_url: bio_url ?? foundVerifyReq.get('bio_url'),
        addtl_info: addtl_info ?? foundVerifyReq.get('addtl_info'),
      }, { validate: true, transaction });
      return foundVerifyReq;
    });

    if (prevStatus === 'needs_change' && props.status === "open") {
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
          <p>A new Instructor Verification Request has been submitted. Please open the <a href="https://commons.libretexts.org/controlpanel/libreone/instructor-verifications" target="_blank" rel="noopener noreferrer">Verification Requests Console</a> in Conductor to review.</p>
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
          <p>A previously reviewed Instructor Verification Request has been updated by the requester. Please open the <a href="https://commons.libretexts.org/controlpanel/libreone/instructor-verifications" target="_blank" rel="noopener noreferrer">Verification Requests Console</a> in Conductor to review again.</p>
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

  public async sendUserRequestApprovedNotification(userEmail: string, comment?: string, applicationNames?: string[]) {
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
          ${applicationNames?.length ? `
            <p>You now have access to the following applications:</p>
            <ul>
            ${applicationNames.map((a) => `<li>${a}</li>`).join('')}
            </ul>
          ` : ''}
          <p>If you have further questions, please feel free to submit a ticket in our <a href="https://commons.libretexts.org/support/contact" target="_blank">Support Center</a>.</p>
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
