import express from 'express';
import * as OrganizationController from '../controllers/OrganizationController';
import * as OrganizationValidator from '../validators/organizations';
import { ensureAPIUserHasPermission, ensureActorIsAPIUser, validate, verifyAPIAuthentication } from '../middleware';
import { catchInternal } from '../helpers';

const organizationsRouter = express.Router();

organizationsRouter.route('/')
  .get(
    validate(OrganizationValidator.getAllOrganizationsSchema, 'query'),
    catchInternal(OrganizationController.getAllOrganizations)
  ).post(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['organizations:write', 'domains:read', 'domains:write']),
    validate(OrganizationValidator.createOrganizationSchema, 'body'),
    catchInternal(OrganizationController.createOrganization)
  );

organizationsRouter.route('/:orgID')
  .get(
    validate(OrganizationValidator.orgIDParamSchema, 'params'),
    catchInternal(OrganizationController.getOrganization)
  ).put(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    catchInternal(OrganizationController.updateOrganization)
  ).delete(
    validate(OrganizationValidator.orgIDParamSchema, 'params'),
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    catchInternal(OrganizationController.deleteOrganization)
  );

organizationsRouter.route('/:orgID/aliases')
  .all(validate(OrganizationValidator.orgIDParamSchema, 'params'))
  .get(catchInternal(OrganizationController.getAllOrganizationAliases))
  .post(
    validate(OrganizationValidator.createOrganizationAliasSchema, 'body'),
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['organizations:write']),
    catchInternal(OrganizationController.createOrganizationAlias),
  );

organizationsRouter.route('/:orgID/aliases/:aliasID')
  .all(validate(OrganizationValidator.orgAliasIDParamsSchema, 'params'))
  .get(catchInternal(OrganizationController.getOrganizationAlias))
  .delete(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['organizations:write']),
    catchInternal(OrganizationController.deleteOrganizationAlias),
  );

organizationsRouter.route('/:orgID/domains')
  .all(validate(OrganizationValidator.orgIDParamSchema, 'params'))
  .get(catchInternal(OrganizationController.getAllOrganizationDomains))
  .post(
    validate(OrganizationValidator.createOrganizationDomainSchema, 'body'),
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['organizations:write', 'domains:write']),
    catchInternal(OrganizationController.createOrganizationDomain),
  );

organizationsRouter.route('/:orgID/domains/:domainID')
  .all(validate(OrganizationValidator.orgDomainIDParamsSchema, 'params'))
  .get(catchInternal(OrganizationController.getOrganizationDomain))
  .delete(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['organizations:write', 'domains:write']),
    catchInternal(OrganizationController.deleteOrganizationDomain),
  );

export {
  organizationsRouter
};
