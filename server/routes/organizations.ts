import express from 'express';
import { OrganizationController } from '../controllers/OrganizationController';
import * as OrganizationValidator from '../validators/organizations';
import { ensureAPIUserHasPermission, ensureActorIsAPIUser, validate, verifyAPIAuthentication } from '../middleware';
import { catchInternal } from '../helpers';

const organizationsRouter = express.Router();
const controller = new OrganizationController();

organizationsRouter.route('/')
  .get(
    validate(OrganizationValidator.getAllOrganizationsSchema, 'query'),
    catchInternal((req, res) => controller.getAllOrganizations(req, res)),
  ).post(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['organizations:write', 'domains:read', 'domains:write']),
    validate(OrganizationValidator.createOrganizationSchema, 'body'),
    catchInternal((req, res) => controller.createOrganization(req, res)),
  );

organizationsRouter.route('/:orgID')
  .get(
    validate(OrganizationValidator.orgIDParamSchema, 'params'),
    validate(OrganizationValidator.getOrgQuerySchema, 'query'),
    catchInternal((req, res) => controller.getOrganization(req, res)),
  ).patch(
    validate(OrganizationValidator.updateOrganizationSchema, 'body'),
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['organizations:write']),
    catchInternal((req, res) => controller.updateOrganization(req, res)),
  ).delete(
    validate(OrganizationValidator.orgIDParamSchema, 'params'),
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['organizations:write']),
    catchInternal((req, res) => controller.deleteOrganization(req, res)),
  );

organizationsRouter.route('/:orgID/admins')
  .all(
    validate(OrganizationValidator.orgIDParamSchema, 'params'),
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['organizations:read']),
  )
  .get(catchInternal((req, res) => controller.getOrganizationAdmins(req, res)))

organizationsRouter.route('/:orgID/aliases')
  .all(validate(OrganizationValidator.orgIDParamSchema, 'params'))
  .get(catchInternal((req, res) => controller.getAllOrganizationAliases(req, res)))
  .post(
    validate(OrganizationValidator.createOrganizationAliasSchema, 'body'),
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['organizations:write']),
    catchInternal((req, res) => controller.createOrganizationAlias(req, res)),
  );

organizationsRouter.route('/:orgID/aliases/:aliasID')
  .all(validate(OrganizationValidator.orgAliasIDParamsSchema, 'params'))
  .get(catchInternal((req, res) => controller.getOrganizationAlias(req, res)))
  .delete(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['organizations:write']),
    catchInternal((req, res) => controller.deleteOrganizationAlias(req, res)),
  );

organizationsRouter.route('/:orgID/domains')
  .all(validate(OrganizationValidator.orgIDParamSchema, 'params'))
  .get(catchInternal((req, res) => controller.getAllOrganizationDomains(req, res)))
  .post(
    validate(OrganizationValidator.createOrganizationDomainSchema, 'body'),
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['organizations:write', 'domains:write']),
    catchInternal((req, res) => controller.createOrganizationDomain(req, res)),
  );

organizationsRouter.route('/:orgID/domains/:domainID')
  .all(validate(OrganizationValidator.orgDomainIDParamsSchema, 'params'))
  .get(catchInternal((req, res) => controller.getOrganizationDomain(req, res)))
  .delete(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['organizations:write', 'domains:write']),
    catchInternal((req, res) => controller.deleteOrganizationDomain(req, res)),
  );

export {
  organizationsRouter,
};
