import { Request, Response } from 'express';
import { Organization, OrganizationSystem, sequelize } from '../models';
import { EventSubscriberEmitter } from '@server/events/EventSubscriberEmitter';
import type {
  GetAllOrganizationSystemsQuery,
  CreateOrganizationSystemBody,
  OrganizationSystemIDParams
} from '../types/organizationsystems';

export class OrganizationSystemController {
  /**
   * Creates a new Organization System.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async createOrganizationSystem(req: Request, res: Response): Promise<Response> {
    try {
      const { name, logo } = req.body as CreateOrganizationSystemBody;

      if (!name) {
        return res.status(400).send({ error: 'Missing required fields: name' });
      }
  
      const newSystem = await OrganizationSystem.create({ name, logo });
  
      return res.status(201).send({ data: newSystem });
    } catch (error) {
      console.error('Error creating organization system:', error);
      return res.status(500).send({ error: 'Internal Server Error' });
    }
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
      return res.status(400).send({ error: 'Missing orgSystemID in params' });
    }

    try {
      const system = await OrganizationSystem.findByPk(orgSystemID, {
        include: [Organization],
      });

      if (!system) {
        return res.status(404).send({ error: 'System not found' });
      }

      return res.status(200).send({ data: system });
    } catch (error) {
      console.error("Failed to fetch organization system:", error);
      return res.status(500).send({ error: 'Internal Server Error' });
    } 
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
    try {
      const { orgSystemID } = (req.params as unknown) as OrganizationSystemIDParams;
      const { name, logo } = req.body as CreateOrganizationSystemBody;

      const system = await OrganizationSystem.findByPk(orgSystemID);

      if (!system) {
        return res.status(404).json({ message: 'OrganizationSystem not found' });
      }

      system.name = name ?? system.name;
      system.logo = logo ?? system.logo;

      await system.save();

      return res.status(200).json({ message: 'OrganizationSystem updated successfully', data: system });
    } catch (error) {
      console.error('Update failed:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * Deletes an existing Organization System.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async deleteOrganizationSystem(req: Request, res: Response): Promise<Response> {
    return res.status(200);
  }
}
