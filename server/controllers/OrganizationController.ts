import _ from 'lodash';
import { Request, Response } from 'express';
import { ForeignKeyConstraintError, Op, UniqueConstraintError } from 'sequelize';
import {
  Alias,
  Domain,
  Organization,
  OrganizationAlias,
  OrganizationDomain,
  sequelize,
  OrganizationSystem,
} from '../models';
import errors from '../errors';
import type {
  CreateOrganizationAliasBody,
  CreateOrganizationBody,
  CreateOrganizationDomainBody,
  GetAllOrganizationsQuery,
  OrganizationAliasIDParams,
  OrganizationDomainIDParams,
  OrganizationIDParams,
  UpdateOrganizationBody,
} from '../types/organizations';
import { EventSubscriberEmitter } from '@server/events/EventSubscriberEmitter';

export class OrganizationController {
  /**
   * Creates a new Organization.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async createOrganization(req: Request, res: Response): Promise<Response> {
    const props = req.body as CreateOrganizationBody;
    try {
      const newOrgId = await sequelize.transaction(async (transaction) => {
        const newOrganization = await Organization.create({
          name: props.name,
          logo: props.logo,
          system_id: props.system_id || null,
        }, { transaction });

        // create and associate Aliases
        const existingAliasObjs = (await Alias.findAll({
          where: {
            alias: {
              [Op.in]: props.aliases,
            },
          },
        }));
        const existingAliases = existingAliasObjs.map((a) => a.get('alias'));
        const aliasesToCreate = props.aliases.filter((a) => !existingAliases.includes(a));
        const createdAliases = await Alias.bulkCreate(
          aliasesToCreate.map((alias) => ({ alias })),
          { validate: true, transaction },
        );
        await OrganizationAlias.bulkCreate([...existingAliasObjs, ...createdAliases].map((aliasObj) => ({
          organization_id: newOrganization.id,
          alias_id: aliasObj.id,
        })), { validate: true, transaction });
    
        // create and associate Domains
        const existingDomainObjs = (await Domain.findAll({
          where: {
            domain: {
              [Op.in]: props.domains,
            },
          },
        }));
        const existingDomains = existingDomainObjs.map((d) => d.get('domain'));
        const domainsToCreate = props.domains.filter((d) => !existingDomains.includes(d));
        const createdDomains = await Domain.bulkCreate(
          domainsToCreate.map((domain) => ({ domain })),
          { validate: true, transaction },
        );
        await OrganizationDomain.bulkCreate([...existingDomainObjs, ...createdDomains].map((domainObj) => ({
          organization_id: newOrganization.id,
          domain_id: domainObj.id,
        })), { validate: true, transaction });
    
        return newOrganization.id;
      });

      const organization = await Organization.findByPk(newOrgId, {
        include: [
          { model: Alias },
          { model: Domain },
        ],
      });
      if (!organization) {
        throw new Error('Could not find newly created Organization');
      }

      EventSubscriberEmitter.emit('organization:created', organization.get());

      return res.status(201).send({
        data: {
          ...organization.get(),
          aliases: (organization.get('aliases') || []).map((a) => a.get()),
          domains: (organization.get('domains') || []).map((d) => d.get()),
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
   * Creates a new Organization Alias.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async createOrganizationAlias(req: Request, res: Response): Promise<Response> {
    const { orgID } = (req.params as unknown) as OrganizationIDParams;
    const props = req.body as CreateOrganizationAliasBody;

    const foundOrg = await Organization.findByPk(orgID);
    if (!foundOrg) {
      return errors.notFound(res);
    }

    try {
      const [aliasToUse] = await Alias.findOrCreate({
        where: { alias: props.alias },
      });
      const newOrgAlias = await OrganizationAlias.create({
        organization_id: orgID,
        alias_id: aliasToUse.id,
      });

      return res.status(201).send({
        data: {
          id: aliasToUse.get('id'),
          ..._.omit(newOrgAlias.get(), ['alias_id']),
          alias: props.alias,
        },
      });
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        return errors.conflict(res, 'That alias already exists.');
      }
      throw err;
    }
  }

  /**
   * Creates a new Organization Domain.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async createOrganizationDomain(req: Request, res: Response): Promise<Response> {
    const { orgID } = (req.params as unknown) as OrganizationIDParams;
    const props = req.body as CreateOrganizationDomainBody;

    const foundOrg = await Organization.findByPk(orgID);
    if (!foundOrg) {
      return errors.notFound(res);
    }

    try {
      const [domainToUse] = await Domain.findOrCreate({
        where: { domain: props.domain },
      });
      const newOrgDomain = await OrganizationDomain.create({
        organization_id: orgID,
        domain_id: domainToUse.id,
      });

      return res.status(201).send({
        data: {
          id: domainToUse.get('id'),
          ..._.omit(newOrgDomain.get(), ['domain_id']),
          domain: props.domain,
        },
      });
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        return errors.conflict(res, 'That domain already exists.');
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
  public async getOrganization(req: Request, res: Response): Promise<Response> {
    const { orgID } = (req.params as unknown) as OrganizationIDParams;
    const foundOrg = await Organization.findByPk(orgID, {
      include: [
        { model: OrganizationSystem, attributes: ['id', 'name', 'logo'] },
        { model: Alias, through: { attributes: [] } },
        { model: Domain, through: { attributes: [] } },
      ],
    });
    if (!foundOrg) {
      return errors.notFound(res);
    }

    const result = {
      ...foundOrg.get(), // convert to POJO
      aliases: (foundOrg.get('aliases') || []).map((a) => a.get()),
      domains: (foundOrg.get('domains') || []).map((d) => d.get()),
    };

    return res.send({ data: result });
  }

  /**
   * Retrieves information about a specified Organization Alias.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getOrganizationAlias(req: Request, res: Response): Promise<Response> {
    const { orgID, aliasID } = (req.params as unknown) as OrganizationAliasIDParams;
    const foundAlias = await Alias.findByPk(aliasID, {
      include: [
        {
          model: Organization,
          through: { attributes: [] },
          where: { id: orgID },
          attributes: [],
        },
      ],
    });
    if (!foundAlias) {
      return errors.notFound(res);
    }

    return res.send({
      data: foundAlias.get(),
    });
  }

  /**
   * Retrieves information about a specified Organization Domain.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getOrganizationDomain(req: Request, res: Response): Promise<Response> {
    const { orgID, domainID } = (req.params as unknown) as OrganizationDomainIDParams;
    const foundDomain = await Domain.findByPk(domainID, {
      include: [
        {
          model: Organization,
          through: { attributes: [] },
          where: { id: orgID },
          attributes: [],
        },
      ],
    });
    if (!foundDomain) {
      return errors.notFound(res);
    }

    return res.send({
      data: {
        domain: foundDomain.get(),
      },
    });
  }

  /**
   * Retrieves a list of all known Organizations using optional searching and pagination.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getAllOrganizations(req: Request, res: Response): Promise<Response> {
    const { offset, limit, query, onlyUnassociated } = (req.query as unknown) as GetAllOrganizationsQuery;

    const fuzzyQuery = query ? `%${query}%` : null;
    const queryCriteria = [
      { name: { [Op.like]: fuzzyQuery } },
      { '$aliases.alias$': { [Op.like]: fuzzyQuery } },
      { '$domains.domain$': { [Op.like]: fuzzyQuery } },
    ];
    const unassociatedCriteria = { system_id: { [Op.is]: null } };
    const whereSearch = query 
      ? {
        ...(onlyUnassociated ? {
          [Op.and]: [
            unassociatedCriteria,
            { [Op.or]: queryCriteria },
          ],
        } : {
          [Op.or]: queryCriteria,
        }),
      }
      : onlyUnassociated
        ? unassociatedCriteria
        : null;

    const { count, rows } = await Organization.findAndCountAll({
      ...(whereSearch && { where: whereSearch }),
      ...(offset !== undefined && { offset: Number(offset) }),
      ...(limit !== undefined && { limit: Number(limit) }),
      order: [['created_at', 'DESC']],
      attributes: ['id', 'name', 'logo', 'is_default'],
      include: [
        { model: OrganizationSystem, attributes: ['id', 'name', 'logo'] },
        { model: Alias, through: { attributes: [] } },
        { model: Domain, through: { attributes: [] } },
      ],
      subQuery: false,
    });

    const results = rows.map((row) => ({
      ...row.get(), // convert to POJO
      aliases: (row.get('aliases') || []).map((a) => a.get()),
      domains: (row.get('domains') || []).map((d) => d.get()),
    }));

    return res.send({
      meta: {
        ...(offset !== undefined && { offset: Number(offset) }),
        ...(limit !== undefined && { limit: Number(limit) }),
        total: count,
      },
      data: results,
    });
  }

  /**
   * Retrieves a list of all the aliases associated with a single Organization.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getAllOrganizationAliases(req: Request, res: Response): Promise<Response> {
    const { orgID } = (req.params as unknown) as OrganizationIDParams;
    const foundAliases = await Alias.findAll({
      include: [
        {
          model: Organization,
          through: { attributes: [] },
          where: { id: orgID },
          attributes: [],
        },
      ],
    });

    return res.send({
      data: {
        aliases: foundAliases.map((a) => a.get()),
      },
    });
  }

  /**
   * Retrieves a list of all known Domains associated with a single Organization.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getAllOrganizationDomains(req: Request, res: Response): Promise<Response> {
    const { orgID } = (req.params as unknown) as OrganizationIDParams;
    const foundDomains = await Domain.findAll({
      include: [
        {
          model: Organization,
          through: { attributes: [] },
          where: { id: orgID },
          attributes: [],
        },
      ],
    });

    return res.send({
      data: {
        domains: foundDomains.map((d) => d.get()) || [],
      },
    });
  }

  /**
   * Updates an existing Organization.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async updateOrganization(req: Request, res: Response): Promise<Response> {
    const { orgID } = (req.params as unknown) as OrganizationIDParams;
    const props = req.body as UpdateOrganizationBody;
    const foundOrg = await Organization.findByPk(orgID);
    if (!foundOrg) {
      return errors.notFound(res);
    }

    const updateObj: Record<string, string | number> = {};
    const allowedKeys = ['name', 'logo', 'system_id'];
    Object.entries(props).forEach(([key, value]) => {
      if (allowedKeys.includes(key)) {
        updateObj[key] = value;
      }
    });

    try {
      await foundOrg.update(updateObj);

      const organization = await Organization.findByPk(foundOrg.id, {
        include: [
          { model: Alias, through: { attributes: [] } },
          { model: Domain, through: { attributes: [] } },
        ],
      });
      if (!organization) {
        throw new Error('Could not find updated Organization');
      }

      EventSubscriberEmitter.emit('organization:updated', organization.get());

      return res.send({
        data: {
          ...organization.get(),
          aliases: (organization.get('aliases') || []).map((a) => a.get()),
          domains: (organization.get('domains') || []).map((d) => d.get()),
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
   * Deletes a specified Organization and its associated aliases and Domain associations.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async deleteOrganization(req: Request, res: Response): Promise<Response> {
    const { orgID } = (req.params as unknown) as OrganizationIDParams;
    const foundOrg = await Organization.findByPk(orgID);
    if (!foundOrg) {
      return errors.notFound(res);
    }
    
    await OrganizationDomain.destroy({ where: { organization_id: foundOrg.id }});
    await OrganizationAlias.destroy({ where: { organization_id: foundOrg.id }});
    await foundOrg.destroy();

    EventSubscriberEmitter.emit('organization:deleted', foundOrg.get());

    return res.send({});
  }

  /**
   * Deletes a specified Organization Alias.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async deleteOrganizationAlias(req: Request, res: Response): Promise<Response> {
    const { orgID, aliasID } = (req.params as unknown) as OrganizationAliasIDParams;

    const foundOrgAlias = await OrganizationAlias.findOne({
      where: {
        organization_id: orgID,
        alias_id: aliasID,
      },
    });
    if (!foundOrgAlias) {
      return errors.notFound(res);
    }

    await foundOrgAlias.destroy();

    return res.send({});
  }

  /**
   * Deletes a specified Organization Domain.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async deleteOrganizationDomain(req: Request, res: Response): Promise<Response> {
    const { orgID, domainID } = (req.params as unknown) as OrganizationDomainIDParams;

    const foundOrgDomain = await OrganizationDomain.findOne({
      where: {
        organization_id: orgID,
        domain_id: domainID,
      },
    });
    if (!foundOrgDomain) {
      return errors.notFound(res);
    }

    await foundOrgDomain.destroy();

    return res.send({});
  }

}