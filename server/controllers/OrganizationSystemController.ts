import { Request, Response } from 'express';
import { Organization, OrganizationSystem } from '../models';
import { EventSubscriberEmitter } from '@server/events/EventSubscriberEmitter';
import type {
  GetAllOrganizationSystemsQuery,
  CreateOrganizationSystemBody,
  OrganizationSystemIDParams
} from '../types/organizationsystems';
import errors from '@server/errors';

export class OrganizationSystemController {
  /**
   * Creates a new Organization System.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async createOrganizationSystem(req: Request, res: Response): Promise<Response> {
    const { name, logo } = req.body as CreateOrganizationSystemBody;

    if (!name) {
      return errors.badRequest(res, 'Missing required fields: name');
    }

    const newSystem = await OrganizationSystem.create({ name, logo });
    
    EventSubscriberEmitter.emit('organization_system:created', newSystem);

    return res.status(201).send({ data: newSystem });
  }

  /**
   * Retrieves a specific Organization System.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getOrganizationSystem(req: Request, res: Response): Promise<Response> {
    const { orgSystemID } = (req.params as unknown) as OrganizationSystemIDParams;

    if (!orgSystemID) {
      return errors.badRequest(res, 'Missing required parameter: orgSystemID');
    }

    const system = await OrganizationSystem.findByPk(orgSystemID, {
      include: [Organization],
    });

    if (!system) {
      return errors.notFound(res, 'Organization System not found');
    }

    return res.status(200).send({ data: system });
  }

  /**
   * Retrieves all known Organization Systems.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getAllOrganizationSystems(req: Request, res: Response): Promise<Response> {
    const { offset, limit } = (req.query as unknown) as GetAllOrganizationSystemsQuery; 

    const { count, rows } = await OrganizationSystem.findAndCountAll({
      ...(offset !== undefined && { offset: Number(offset) }),
      ...(limit !== undefined && { limit: Number(limit) }),
      order: [['created_at', 'DESC']],
      include: [Organization],
    });
    return res.send({
      meta: {
        ...(offset !== undefined && { offset: Number(offset) }),
        ...(limit !== undefined && { limit: Number(limit) }),
        total: count,
      },
      data: rows,
    });
  }

  /**
   * Updates an existing Organization System.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async updateOrganizationSystem(req: Request, res: Response): Promise<Response> {
    const { orgSystemID } = (req.params as unknown) as OrganizationSystemIDParams;
    const { name, logo } = req.body as CreateOrganizationSystemBody;

    const system = await OrganizationSystem.findByPk(orgSystemID);

    if (!system) {
      return errors.notFound(res, 'Organization System not found');
    }

    system.name = name ?? system.name;
    system.logo = logo ?? system.logo;

    await system.save();

    EventSubscriberEmitter.emit('organization_system:updated', system);

    return res.status(200).json({ message: 'OrganizationSystem updated successfully', data: system });
  }

  /**
   * Deletes an existing Organization System.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async deleteOrganizationSystem(req: Request, res: Response): Promise<Response> {
    return res.status(501).send({})
  }
}
