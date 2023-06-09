import { Request, Response } from 'express';
import { Organization, OrganizationSystem, sequelize } from '../models';

export class OrganizationSystemController {
  /**
   * @todo Implement
   */
  public async createOrganizationSystem(req: Request, res: Response): Promise<Response> {
    return res.status(201);
  }

  /**
   * @todo Implement
   */
  public async getOrganizationSystem(req: Request, res: Response): Promise<Response> {
    return res.status(200);
  }

  /**
   * Retrieves all known Organization Systems using pagination.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getAllOrganizationSystems(req: Request, res: Response): Promise<Response> {
    const offset = Number(req.query.offset);
    const limit = Number(req.query.limit);
    const { count, rows } = await OrganizationSystem.findAndCountAll({
      offset,
      limit,
      order: sequelize.col('name'),
      include: [Organization],
    });
    return res.send({
      meta: {
        offset,
        limit,
        total: count,
      },
      data: rows,
    });
  }

  /**
   * @todo Implement
   */
  public async updateOrganizationSystem(req: Request, res: Response): Promise<Response> {
    return res.status(200);
  }

  /**
   * @todo Implement
   */
  public async deleteOrganizationSystem(req: Request, res: Response): Promise<Response> {
    return res.status(200);
  }
}
