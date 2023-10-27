import errors from '../errors';
import { License, sequelize } from '../models';
import { GetAllLicensesQuery, LicenseIDParams } from '@server/types/licenses';
import { Request, Response } from 'express';
import { Op } from 'sequelize';

export class LicenseController {
  /**
   * Retrieves a list of all known Licenses using optional searching and pagination.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getAllLicenses(req: Request, res: Response): Promise<Response> {
    const { query } =
      req.query as unknown as GetAllLicensesQuery;

    const fuzzyQuery = query ? `%${query}%` : null;
    const queryCriteria = { name: { [Op.like]: fuzzyQuery } };
    const whereSearch = query ? queryCriteria : null;

    const { count, rows } = await License.findAndCountAll({
      ...(whereSearch && { where: whereSearch }),
      order: sequelize.col('name'),
    });

    const results = rows.map((row) => ({
      ...row.get(), // convert to POJO
    }));

    return res.send({
      meta: {
        total: count,
      },
      data: results,
    });
  }

  /**
   * Retrieves information about a specified license.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getLicense(req: Request, res: Response): Promise<Response> {
    const { licenseID } = req.params as unknown as LicenseIDParams;
    const foundLicense = await License.findByPk(licenseID);
    if (!foundLicense) {
      return errors.notFound(res);
    }

    const result = {
      ...foundLicense.get(), // convert to POJO
    };

    return res.send({ data: result });
  }
}
