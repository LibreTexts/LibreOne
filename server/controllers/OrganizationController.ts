import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Domain, Organization, OrganizationAlias, sequelize, System } from '../models';
import type { GetAllOrganizationsQuery } from '../types/organizations';

/**
 * @todo Implement
 */
export async function createOrganization(req: Request, res: Response): Promise<Response> {
  return res.status(201);
}

/**
 * @todo Implement
 */
export async function getOrganization(req: Request, res: Response): Promise<Response> {
  return res.status(200);
}

/**
 * Retrieves a list of all known Organizations using optional searching and pagination.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function getAllOrganizations(req: Request, res: Response): Promise<Response> {
  const { offset, limit, query } = (req.query as unknown) as GetAllOrganizationsQuery;
  const fuzzyQuery = query ? `%${query}%` : null;
  const { count, rows } = await Organization.findAndCountAll({
    ...(query && {
      where: {
        [Op.or]: [
          { name: { [Op.like]: fuzzyQuery } },
          { '$aliases.alias$': { [Op.like]: fuzzyQuery } },
          { '$domains.domain$': { [Op.like]: fuzzyQuery } },
        ],
      },
    }),
    offset,
    limit,
    order: sequelize.col('name'),
    attributes: ['id', 'name', 'logo'],
    include: [
      { model: System, attributes: ['id', 'name', 'logo'] },
      { model: OrganizationAlias, attributes: ['alias'] },
      {
        model: Domain,
        attributes: ['domain'],
        through: { attributes: [] },
      },
    ],
    subQuery: false,
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
export async function updateOrganization(req: Request, res: Response): Promise<Response> {
  return res.status(200);
}

/**
 * @todo Implement
 */
export async function deleteOrganization(req: Request, res: Response): Promise<Response> {
  return res.status(200);
}
