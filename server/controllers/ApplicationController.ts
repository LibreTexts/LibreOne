import { Op, UniqueConstraintError, WhereOptions } from 'sequelize';
import { Request, Response } from 'express';
import { Application, UserApplication, sequelize } from '../models';
import {
  ApplicationIDParams,
  CreateApplicationBody,
  GetAllApplicationsQuery,
  UpdateApplicationBody,
} from '../types/applications';
import errors from '../errors';
import { APIResponse } from '@server/types/misc';

export class ApplicationController {

  /**
   * Creates a new Application.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API request.
   * @returns The fulfilled API response.
   */
  public async createApplication(req: Request, res: Response): Promise<Response> {
    try {
      const props = req.body as CreateApplicationBody;
      const newApp = await Application.create(props);
      return res.status(201).send({
        data: newApp.get(),
      });
    } catch (e) {
      if (e instanceof UniqueConstraintError) {
        return errors.conflict(res);
      }
      throw e;
    }
  }

  /**
   * Retrieves a single Application.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API request.
   * @returns The fulfilled API response.
   */
  public async getApplication(req: Request, res: Response): Promise<Response> {
    const { applicationID } = (req.params as unknown) as ApplicationIDParams;
    const foundApp = await Application.findOne({
      where: {
        [Op.and]: [
          { id: applicationID },
          { hide_from_apps: false },
        ],
      },
    });
    if (!foundApp) {
      return errors.notFound(res);
    }

    return res.send({
      data: foundApp.get(),
    });
  }

  /**
   * Retrieves all Applications using optional searching and pagination.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API request.
   * @returns The fulfilled API response.
   */
  public async getAllApplications(req: Request, res: Response): Promise<Response> {
    const {
      offset,
      limit,
      query,
      type,
      onlyCASSupported,
      default_access,
    } = (req.query as unknown) as GetAllApplicationsQuery;

    const criteria: WhereOptions[] = [{ hide_from_apps: false }];
    if (query) {
      criteria.push({
        name: { [Op.like]: `%${query}%` },
      });
    }
    if (type) {
      criteria.push({ app_type: type });
    }
    if (onlyCASSupported) {
      criteria.push({ supports_cas: true });
    }
    if (default_access) {
      criteria.push({ default_access });
    }

    const { count, rows } = await Application.findAndCountAll({
      where: criteria.length > 1 ? { [Op.and]: criteria } : criteria[0],
      offset,
      limit,
      order: sequelize.literal('name'),
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
   * Retrieves all Applications using optional searching and pagination.
   *
   * @param {object} options - The options for the query.
   * @returns {Promise<APIResponse<Application[]>>} The fulfilled API response.
   */
  public async getAllApplicationsInternal({
    offset,
    limit,
    query,
    type,
    onlyCASSupported,
    default_access,
  }:{
      offset?: number;
      limit?: number;
      query?: string;
      type?: string;
      onlyCASSupported?: boolean;
      default_access?: string;
    } ): Promise<APIResponse<Application[]>> {
    
    const criteria: WhereOptions[] = [{ hide_from_apps: false }];
    if (query) {
      criteria.push({
        name: { [Op.like]: `%${query}%` },
      });
    }
    if (type) {
      criteria.push({ app_type: type });
    }
    if (onlyCASSupported) {
      criteria.push({ supports_cas: true });
    }
    if (default_access) {
      criteria.push({ default_access });
    }
  
    const { count, rows } = await Application.findAndCountAll({
      where: criteria.length > 1 ? { [Op.and]: criteria } : criteria[0],
      offset,
      limit,
      order: sequelize.literal('name'),
    });
    const results = rows.map((row) => row.get()) as unknown as Application[];
  
    return {
      meta: {
        offset,
        limit,
        total: count,
      },
      data: results,
    };
  }

  /**
   * Updates a single Application.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API request.
   * @returns The fulfilled API response.
   */
  public async updateApplication(req: Request, res: Response): Promise<Response> {
    try {
      const { applicationID } = (req.params as unknown) as ApplicationIDParams;
      const props = req.body as UpdateApplicationBody;

      const foundApp = await Application.findByPk(applicationID);
      if (!foundApp) {
        return errors.notFound(res);
      }

      await foundApp.update(props);
      return res.send({
        data: foundApp,
      });
    } catch (e) {
      if (e instanceof UniqueConstraintError) {
        return errors.conflict(res);
      }
      throw e;
    }
  }

  /**
   * Deletes a single Application and all associated UserApplication records.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API request.
   * @returns The fulfilled API response.
   */
  public async deleteApplication(req: Request, res: Response): Promise<Response> {
    const { applicationID } = (req.params as unknown) as ApplicationIDParams;
    const foundApp = await Application.findByPk(applicationID);
    if (!foundApp) {
      return errors.notFound(res);
    }

    await UserApplication.destroy({ where: { application_id: applicationID } });
    await foundApp.destroy();

    return res.send({});
  }
}
