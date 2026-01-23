import { UniqueConstraintError } from 'sequelize';
import { Request, Response } from 'express';
import { marked } from 'marked';
import {
  AccessRequest,
  AccessRequestApplication,
  Application,
  User,
  UserApplication,
  sequelize,
} from '../models';
import {
  AccessRequestEffect,
  AccessRequestIDParams,
  CreateAccessRequestBody,
  GetAllAccessRequestsQuery,
  UpdateAccessRequestBody,
} from '../types/accessrequests';
import errors from '../errors';
import { MailController } from './MailController';

export const accessRequestEffects = ['approve', 'deny', 'partially_approve'];
export const accessRequestStatuses = ['open', 'denied', 'approved', 'partially_approved'];

export class AccessRequestController {

  /**
   * Validates that all application identifiers provided correspond to a
   * registered application.
   *
   * @param application_ids - Application identifiers to validate.
   * @returns If all identifiers are valid.
   */
  public async validateRequestedApplications(application_ids: number[]) {
    const allApps = await Application.findAll({
      where: { hide_from_apps_api: false },
    });
    return application_ids.reduce((acc, curr) => {
      if (!acc) {
        return acc;
      }
      const foundExisting = allApps.find((a) => a.get('id') === curr);
      if (!foundExisting) {
        return false;
      }
      return acc;
    }, true);
  }

  /**
   * Creates a new Access Request.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API request.
   * @returns The fulfilled API response.
   */
  public async createAccessRequest(req: Request, res: Response): Promise<Response> {
    try {
      const props = req.body as CreateAccessRequestBody;

      const allApps = await Application.findAll({ where: { hide_from_apps_api: false } });
      const { allValid, numLibrary } = props.applications.reduce((acc, curr) => {
        if (!acc.allValid) {
          return acc;
        }
        const foundExisting = allApps.find((a) => a.get('id') === curr);
        if (!foundExisting) {
          return { ...acc, allValid: false };
        }
        return {
          ...acc,
          numStandalone: foundExisting.get('app_type') === 'standalone'
            ? acc.numStandalone + 1
            : acc.numStandalone,
          numLibrary: foundExisting.get('app_type') === 'library'
            ? acc.numLibrary + 1
            : acc.numLibrary,
        };
      }, { allValid: true, numStandalone: 0, numLibrary: 0 });
      if (!allValid || numLibrary > 3) {
        return errors.badRequest(res);
      }

      const newAccessRequestId = await sequelize.transaction(async (transaction) => {
        const newRequest = await AccessRequest.create(
          {
            user_id: req.userUUID,
            status: 'open',
          },
          { transaction },
        );

        // create request applications
        await AccessRequestApplication.bulkCreate(
          props.applications.map((app_id) => ({
            access_request_id: newRequest.get('id'),
            application_id: app_id,
          })),
          { validate: true, transaction },
        );

        return newRequest.get('id');
      });

      const newRequest = await AccessRequest.findByPk(
        newAccessRequestId,
        {
          include: [{ model: Application, attributes: ['id'] }],
        },
      );

      return res.status(201).send({
        data: {
          ...newRequest?.get(),
          applications: (newRequest?.get('applications') || []).map((a) => a.get()),
        },
      });
    } catch (e) {
      if (e instanceof UniqueConstraintError) {
        return errors.conflict(res);
      }
      throw e;
    }
  }

  /**
   * Retrieves a single Access Request.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API request.
   * @returns The fulfilled API response.
   */
  public async getAccessRequest(req: Request, res: Response): Promise<Response> {
    const { accessRequestID } = (req.params as unknown) as AccessRequestIDParams;
    const foundReq = await AccessRequest.findByPk(
      accessRequestID,
      {
        include: [{ model: Application, attributes: ['id'] }],
      },
    );
    if (!foundReq) {
      return errors.notFound(res);
    }

    return res.send({
      data: {
        ...foundReq.get(),
        applications: (foundReq.get('applications') || []).map((a) => a.get()),
      },
    });
  }

  /**
   * Retrieves all Access Requests using optional searching and pagination.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API request.
   * @returns The fulfilled API response.
   */
  public async getAllAccessRequests(req: Request, res: Response): Promise<Response> {
    const { offset, limit, status } = (req.query as unknown) as GetAllAccessRequestsQuery;

    const { count, rows } = await AccessRequest.findAndCountAll({
      ...(status && { where: { status } }),
      offset,
      limit,
      order: sequelize.literal('created_at'),
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
   * Updates a single Access Request.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API request.
   * @returns The fulfilled API response.
   */
  public async updateAccessRequest(req: Request, res: Response): Promise<Response> {
    try {
      const { accessRequestID } = (req.params as unknown) as AccessRequestIDParams;
      const props = req.body as UpdateAccessRequestBody;

      const foundReq = await AccessRequest.findByPk(accessRequestID, {
        include: [{ model: Application, attributes: ['id', 'app_type', 'name'] }],
      });
      if (!foundReq) {
        return errors.notFound(res);
      }
      const reqUser = await User.findByPk(foundReq.user_id);
      if (!reqUser) {
        return errors.notFound(res);
      }

      const reqApps = foundReq.get('applications');
      if (props.effect === 'approve' && props.approved) {
        return errors.badRequest(res);
      }
      if (props.effect === 'partial' && (!props.approved || props.approved?.length < 1)) {
        return errors.badRequest(res);
      }
      const approvedApps = (reqApps || []).filter((a) => {
        const appID = a.get('id');
        if (props.approved) {
          const foundApproved = props.approved.find((i) => i === appID);
          return !!foundApproved;
        }
        return true;
      });
      if (props.effect !== 'deny' && approvedApps.length < 1) {
        return errors.badRequest(res);
      }

      await sequelize.transaction(async (transaction) => {
        const reqStandalone = approvedApps.filter((a) => a.get('app_type') === 'standalone');
        // const reqLibs = approvedApps.filter((a) => a.get('app_type') === 'library');

        if (reqStandalone?.length) {
          await UserApplication.bulkCreate(
            reqStandalone.map((a) => ({
              user_id: foundReq.get('user_id'),
              application_id: a.get('id'),
            })),
            { validate: true, transaction },
          );
        }

        // TODO: handle library setup
        // if (reqLibs?.length) {}

        await foundReq.update(
          {
            status: props.effect === 'approve' ? 'approved' : 'denied',
            ...(props.reason && { decision_reason: props.reason }),
          },
          { transaction },
        );
      });

      // <send decision email>
      const signatureLine = `
        <p>Best,</p>
        <p>The LibreTexts Team</p>
      `;
      const supportLine = 'If you have any further questions, please feel free to reach out to <a href="mailto:support@libretexts.org">support@libretexts.org</a>.';
      const generateApplicationsList = (apps: Application[]) => {
        const appNames = apps.map((a) => a.get('name'));
        return `<ul><${appNames.reduce((acc, curr) => `${acc}<li>${curr}</li>`, '')}/ul>`;
      };
      const getSubjectByEffect = (effect: AccessRequestEffect) => {
        switch (effect) {
          case 'approve':
            return 'Approved';
          case 'partial':
            return 'Partially Approved';
          default:
            return 'Denied';
        }
      };
      const getMessageByEffect = (effect: AccessRequestEffect) => {
        switch (effect) {
          case 'approve':
            return `
              <p>Hello there,</p>
              <p>Good news! Your applications access request was approved by the LibreTexts team!</p>
              <p>You can now access the following applications:</p>
              ${generateApplicationsList(approvedApps)}
              ${props.reason ? `
                <p>The team member reviewing your request provided this comment:</p>
                <p>${marked.parseInline(props.reason)}</p>
              ` : ''}
              <p>${supportLine}</p>
              ${signatureLine}
            `;
          case 'partial':
            return `
              <p>Hello there,</p>
              <p>Your applications access request has been reviewed by the LibreTexts team and we have decided to partially approve your request.</p>
              <p>You requested access to the following applications:</p>
              ${generateApplicationsList(reqApps || [])}
              <p>You now have access to the following applications:</p>
              ${generateApplicationsList(approvedApps)}
              ${props.reason ? `
                <p>The team member reviewing your request provided this comment:</p>
                <p>${marked.parseInline(props.reason)}</p>
              ` : ''}
              <p>${supportLine}</p>
              ${signatureLine}
            `;
          default:
            return `
              <p>Hello there,</p>
              <p>Your applications access request has been reviewed by the LibreTexts team. Unfortunately, we have decided to deny your request to access the following applications:</p>
              ${generateApplicationsList(reqApps || [])}
              ${props.reason ? `
                <p>The team member reviewing your request provided this reasoning:</p>
                <p>${marked.parseInline(props.reason)}</p>
              ` : ''}
              <p>If you still need access to the requested applications, please address any comments provided. ${supportLine}</p>
              ${signatureLine}
            `;
        }
      };

      const mailSender = new MailController();
      if (mailSender.isReady()) {
        const emailRes = await mailSender.send({
          destination: { to: [reqUser.get('email')] },
          subject: `Your LibreTexts Access Request Was ${getSubjectByEffect(props.effect)}`,
          htmlContent: getMessageByEffect(props.effect),
        });
        mailSender.destroy();
        if (!emailRes) {
          console.error(`Error sending decision email to "${reqUser.get('email')}"`);
        }
      }
      // </send decision email>

      return res.send({ data: foundReq });
    } catch (e) {
      if (e instanceof UniqueConstraintError) {
        return errors.conflict(res);
      }
      throw e;
    }
  }

}
