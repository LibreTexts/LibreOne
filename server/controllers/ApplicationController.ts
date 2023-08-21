import { Op, UniqueConstraintError } from 'sequelize';
import { Request, Response } from 'express';
import { Application, UserApplication, sequelize } from '../models';
import {
  ApplicationIDParams,
  CreateApplicationBody,
  GetAllApplicationsQuery,
  UpdateApplicationBody,
} from '../types/applications';
import errors from '../errors';

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
      where: { id: applicationID },
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
    const { offset, limit, query } = (req.query as unknown) as GetAllApplicationsQuery;

    const { count, rows } = await Application.findAndCountAll({
      ...(query && {
        where: {
          name: {
            [Op.like]: `%${query}%`,
          },
        },
      }),
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
