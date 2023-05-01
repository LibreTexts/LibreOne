import { Request, Response } from 'express';
import { ForeignKeyConstraintError, Op, UniqueConstraintError } from 'sequelize';
import { Domain, Organization, OrganizationAlias, OrganizationDomain, sequelize, System } from '../models';
import errors from '../errors';
import type { CreateOrganizationBody, GetAllOrganizationsQuery, OrganizationIDParams } from '../types/organizations';

const simplifyAliases = (aliases: { alias: string }[]) => aliases
  .map((aliasObj) => aliasObj.alias)
  .filter((alias) => !!alias);
const simplifyDomains = (domains: { domain: string }[]) => domains
  .map((domainObj) => domainObj.domain)
  .filter((domain) => !!domain);

/**
 * Creates a new Organization.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function createOrganization(req: Request, res: Response): Promise<Response> {
  const props = req.body as CreateOrganizationBody;
  try {
    const newOrgId = await sequelize.transaction(async (transaction) => {
      const newOrganization = await Organization.create({
        name: props.name,
        logo: props.logo,
        system_id: props.system_id || null,
      }, { transaction });
  
      await OrganizationAlias.bulkCreate(props.aliases.map((alias) => ({
        alias,
        organization_id: newOrganization.id,
      })), { validate: true, transaction });
  
      const existingDomainObjs = (await Domain.findAll({
        where: {
          domain: {
            [Op.in]: props.domains,
          },
        },
      }));
      const existingDomains = existingDomainObjs.map((d) => d.get('domain'));
      const domainsToCreate = props.domains.filter((d) => !existingDomains.includes(d));
      const createdDomains = await Domain.bulkCreate(domainsToCreate.map((domain) => ({
        domain,
      })), { validate: true, transaction });
      await OrganizationDomain.bulkCreate([...existingDomainObjs, ...createdDomains].map((domainObj) => ({
        organization_id: newOrganization.id,
        domain_id: domainObj.id,
      })), { validate: true, transaction });
  
      return newOrganization.id;
    });

    const organization = await Organization.findByPk(newOrgId, {
      include: [
        { model: OrganizationAlias, attributes: ['alias'] },
        { model: Domain, attributes: ['domain'] },
      ],
    });
    if (!organization) {
      throw new Error('Could not find newly created Organization');
    }

    return res.status(201).send({
      data: {
        ...organization.get(),
        aliases: (organization.get('aliases') || []).map((a) => a.get('alias')),
        domains: (organization.get('domains') || []).map((d) => d.get('domain')),
      },
    });
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      return errors.conflict(res, 'An Organization with that name already exists.');
    }
    if (err instanceof ForeignKeyConstraintError) {
      return errors.badRequest(res, 'Referenced System does not exist.');
    }
    throw err;
  }
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
 * Deletes a specified Organization and its associated aliases and Domain associations.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function deleteOrganization(req: Request, res: Response): Promise<Response> {
  const { orgID } = (req.params as unknown) as OrganizationIDParams;
  const foundOrg = await Organization.findByPk(orgID);
  if (!foundOrg) {
    return errors.notFound(res);
  }

  await OrganizationDomain.destroy({ where: { organization_id: foundOrg.id }});
  await OrganizationAlias.destroy({ where: { organization_id: foundOrg.id }});
  await foundOrg.destroy();

  return res.send({});
}
