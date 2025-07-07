import errors from '../errors';
import { AccessCode, Application, ApplicationLicense, License, LicenseVersion, User, UserLicense, sequelize } from '../models';
import { GetAllLicensesQuery, LicenseIDParams } from '@server/types/licenses';
import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { MailController } from './MailController';
import { BulkGenerateAccessCodesRequestBody, GenerateAccessCodeRequestBody } from '@server/types/store';

export class StoreController {

  /**
   * Generates a new access code for a given application license
   * 
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async generateAccessCode(req: Request, res: Response): Promise<Response> {
    const data = req.body as GenerateAccessCodeRequestBody;

    if (!('stripe_price_id' in data) && !('application_license_id' in data)) {
      return errors.badRequest(res, 'Either application_license_id or stripe_price_id must be provided');
    }

    if ('stripe_price_id' in data) {
      if (!data.stripe_price_id) {
        return errors.badRequest(res, 'stripe_price_id cannot be empty');
      }
    }

    if ('application_license_id' in data) {
      if (!data.application_license_id) {
        return errors.badRequest(res, 'application_license_id cannot be empty');
      }
    }

    const whereClause = 'stripe_price_id' in data ? { stripe_id: data.stripe_price_id } : { uuid: data.application_license_id };

    const license = await ApplicationLicense.findOne({ where: whereClause });
    if (!license) {
      return errors.notFound(res, 'Application license not found');
    }

    // TODO: We need to move this logic to a redeem endpoint instead
    // const reqUser = await User.findByPk(user_id);
    // if (!reqUser) {
    //   return errors.notFound(res, 'User not found');
    // }

    // const existingLicense = await UserLicense.findOne({
    //   where: {
    //     user_id,
    //     application_license_id
    //   }
    // });

    // if (existingLicense) {
    //   const now = new Date();
    //   let status: 'active' | 'expired' | 'revoked';
    //   let errorMessage: string;

    //   // TODO: Determine how to handle revoked/expired licenses
    //   if (existingLicense.revoked) {
    //     status = 'revoked';
    //     errorMessage = 'User has a revoked license for this application';
    //   } else if (existingLicense.expires_at && existingLicense.expires_at < now) {
    //     status = 'expired';
    //     errorMessage = 'User has an expired license for this application';
    //   } else {
    //     status = 'active';
    //     errorMessage = 'User already has active access to this application';
    //   }

    //   return res.status(400).json({
    //     success: false,
    //     error: errorMessage,
    //     meta: {
    //       status,
    //       license_id: existingLicense.uuid
    //     }
    //   });
    // }

    const results = await AccessCode.create({
      application_license_id: license.get('uuid'),
    });

    const supportLine = 'If you have any questions, please contact our <a href="https://commons.libretexts.org/support" target="_blank" rel="noopener noreferrer">Support Center</a>.';

    const accessCodeGenerationMessage = (accessCode: string, appName: string) => {
      return `
        <p>Hi there,</p>
        <p>We've received your order for ${appName}.</p>
        <br/>
        <p>Your access code is: </p>
        <p><strong>${accessCode}</strong></p>
        <br/>
        <p>Please visit the following link to redeem your access code: <a href="https://one.libretexts.org/redeem?access_code=${accessCode}">https://one.libretexts.org/redeem?access_code=${accessCode}</a>.</p>
        <p>Caution: Do not share this access code with anyone else, as it can only be used once!</p>
        <br/>
        <p>${supportLine}</p>
        <br/>
        <p>Best,</p>
        <p>The LibreTexts Team</p>
      `;
    };

    const mailSender = new MailController();
    if (mailSender.isReady()) {
      const emailRes = await mailSender.send({
        destination: { to: [data.email] },
        subject: `Your Access Code - ${license.name}`,
        htmlContent: accessCodeGenerationMessage(results.id, license.name),
      });
      mailSender.destroy();
      if (!emailRes) {
        console.error(`Error sending access code generation email to "${data.email}"`);
      }
    }

    return res.json({
      data: results
    });
  }

  /**
  * Generates a set number of access codes for a given application license
  *
  * @param req - Incoming API request.
  * @param res - Outgoing API response.
  * @returns The fulfilled API response.
  */
  public async bulkGenerateAccessCodes(req: Request, res: Response): Promise<Response> {
    const { application_license_id, quantity } = req.body as BulkGenerateAccessCodesRequestBody;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be greater than 0'
      });
    }

    const license = await ApplicationLicense.findOne({
      where: { uuid: application_license_id }
    });

    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'Application license not found'
      });
    }

    const accessCodesToCreate = Array(quantity).fill({
      application_license_id,
      redeemed: false,
      void: false
    });

    const createdCodes = await AccessCode.bulkCreate(accessCodesToCreate);

    return res.status(201).json({
      success: true,
      message: `Successfully generated ${quantity} access codes`,
      meta: {
        total_generated: createdCodes.length
      },
      data: createdCodes.map(code => code.code)
    });
  }


  /**
   * Retrieves a list of all known Application Licenses using optional searching.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getAllAppLicenses(req: Request, res: Response): Promise<Response> {
    const { query } = req.query;

    // Build fuzzy search query (only search by name)
    const fuzzyQuery = query ? `%${query}%` : null;
    const queryCriteria = { name: { [Op.like]: fuzzyQuery } };
    const whereSearch = query ? queryCriteria : null;

    const { count, rows } = await ApplicationLicense.findAndCountAll({
      ...(whereSearch && { where: whereSearch }),
      order: [['name', 'ASC']],
      attributes: ['uuid', 'name', 'stripe_id', 'perpetual'],
    });

    const results = rows.map((row) => ({
      ...row.get(),
    }));

    return res.json({
      meta: {
        total: count
      },
      data: results
    });
  }

}
