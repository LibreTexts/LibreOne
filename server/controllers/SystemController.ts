import { Request, Response } from 'express';
import { Organization, sequelize, System } from '../models';

/**
 * @todo Implement
 */
export async function createSystem(req: Request, res: Response): Promise<Response> {
  return res.status(201);
}

/**
 * @todo Implement
 */
export async function getSystem(req: Request, res: Response): Promise<Response> {
  return res.status(200);
}

/**
 * Retrieves all known Systems using pagination.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function getAllSystems(req: Request, res: Response): Promise<Response> {
  const offset = Number(req.query.offset);
  const limit = Number(req.query.limit);
  const { count, rows } = await System.findAndCountAll({
    offset,
    limit,
    order: sequelize.col('name'),
    include: [Organization]
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
export async function updateSystem(req: Request, res: Response): Promise<Response> {
  return res.status(200);
}

/**
 * @todo Implement
 */
export async function deleteSystem(req: Request, res: Response): Promise<Response> {
  return res.status(200);
}
