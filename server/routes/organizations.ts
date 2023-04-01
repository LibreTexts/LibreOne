import express from 'express';
import * as OrganizationController from '../controllers/OrganizationController';
import * as OrganizationValidator from '../validators/organizations';
import { ensureActorIsAPIUser, validate, verifyAPIAuthentication } from '../middleware';
import { catchInternal } from '../helpers';

const organizationsRouter = express.Router();

organizationsRouter.route('/')
  .get(
    validate(OrganizationValidator.getAllOrganizationsSchema, 'query'),
    catchInternal(OrganizationController.getAllOrganizations)
  ).post(
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

export {
  organizationsRouter
};
