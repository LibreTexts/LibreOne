import errors from '../errors';
import { AccessCode, Application, ApplicationLicense, License, LicenseVersion, User, sequelize } from '../models';
import { GetAllLicensesQuery, LicenseIDParams } from '@server/types/licenses';
import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { MailController } from './MailController';

export class BookstoreController {

    /**
     * Generates a new access code
     * 
     * @param req - Incoming API request.
     * @param res - Outgoing API response.
     * @returns The fulfilled API response.
     */
    public async generateAccessCode(req: Request, res: Response): Promise<Response> {
        console.log("IN generateAccessCode");

        try {
            console.log("req.body:", req.body);
            const { application_license_id, user_id } = req.body;

            console.log("app_id:", application_license_id);

            const license = await ApplicationLicense.findOne({ where: { uuid: application_license_id } });

            if (!license) {
                return errors.notFound(res);
            }

            const reqUser = await User.findByPk(user_id);
            if (!reqUser) {
                return errors.notFound(res);
            }

            const results = await AccessCode.create({
                application_license_id: application_license_id
            });

            const signatureLine = `
                <p>Best,</p>
                <p>The LibreTexts Team</p>
            `;

            const supportLine = 'If you have any further questions, please feel free to reach out to <a href="mailto:support@libretexts.org">support@libretexts.org</a>.';

            const accessCodeGenerationMessage = (accessCode) => {
                return `
                    <p>Hello there,</p>
                    <p>We received a request to purchase a Libretexts license through your email address.</p>
                    <p>Your access code is: </p>
                    ${accessCode}
                    <p>${supportLine}</p>
                    ${signatureLine}
                    `
            };

            const mailSender = new MailController();
            if (mailSender.isReady()) {
                const emailRes = await mailSender.send({
                destination: { to: [reqUser.get('email')] },
                subject: `LibreTexts License Access Code`,
                htmlContent: accessCodeGenerationMessage(results.id),
            });
                mailSender.destroy();
            if (!emailRes) {
                console.error(`Error sending access code generation email to "${reqUser.get('email')}"`);
            }
            }

            return res.json({
                data: results
            });

        } catch (error) {
            console.error('Error generating access code:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to generate access code'
            });
        }

    }

    public async bulkGenerateAccessCodes(req: Request, res: Response): Promise<Response> {

        const { application_license_id, noAccessCodes } = req.body;
        return res.json({
            data: "hi"
        });
    }


  /**
   * Retrieves a list of all known Application Licenses using optional searching and pagination.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
    public async getAllAppLicenses(req: Request, res: Response): Promise<Response> {
    
        console.log("IN getAllAppLicenses");

        try {
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

        } catch (error) {
            console.error('Error fetching application licenses:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch application licenses'
            });
        }
    }
}
