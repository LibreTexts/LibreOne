import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Domain, Organization, OrganizationAlias, sequelize, System } from '../models';
import errors from '../errors';
import type { GetAllOrganizationsQuery, OrganizationIDParams } from '../types/organizations';

const simplifyAliases = (aliases: { alias: string }[]) => aliases
  .map((aliasObj) => aliasObj.alias)
  .filter((alias) => !!alias);
const simplifyDomains = (domains: { domain: string }[]) => domains
  .map((domainObj) => domainObj.domain)
  .filter((domain) => !!domain);

/**
 * @todo Implement
 */
export async function createOrganization(req: Request, res: Response): Promise<Response> {
  return res.status(201);
}

/**
 * Retrieves information about a specified organization.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function getOrganization(req: Request, res: Response): Promise<Response> {
  const { orgID } = (req.params as unknown) as OrganizationIDParams;
  const foundOrg = await Organization.findByPk(orgID, {
    include: [
      { model: System, attributes: ['id', 'name', 'logo'] },
      { model: OrganizationAlias, attributes: ['alias'] },
      { model: Domain, attributes: ['domain'] },
    ],
  });
  if (!foundOrg) {
    return errors.notFound(res);
  }

  const result = {
    ...foundOrg.get(), // convert to POJO
    aliases: foundOrg.aliases ? simplifyAliases(foundOrg.aliases) : [],
    domains: foundOrg.domains ? simplifyDomains(foundOrg.domains) : [],
  };

  return res.send({ data: result });
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
      { model: Domain, attributes: ['domain'] },
    ],
    subQuery: false,
  });

  const results = rows.map((row) => ({
    ...row.get(), // convert to POJO
    aliases: row.aliases ? simplifyAliases(row.aliases) : [],
    domains: row.domains ? simplifyDomains(row.domains) : [],
  }));

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
