import express from 'express';
import { catchInternal } from '../helpers';
import { OrganizationSystemController } from '../controllers/OrganizationSystemController';
import { ensureAPIUserHasPermission, verifyAPIAuthentication, validate, ensureActorIsAPIUser } from '../middleware';
import * as OrganizationSystemValidator from '../validators/organizationsystems';

const organizationSystemsRouter = express.Router();
const controller = new OrganizationSystemController();

organizationSystemsRouter.use(verifyAPIAuthentication);

organizationSystemsRouter.route('/')
  .get(
    validate(OrganizationSystemValidator.getAllOrganizationSystemsSchema, 'query'),
    catchInternal((req, res) => controller.getAllOrganizationSystems(req, res))
  )
  .post(
    validate(OrganizationSystemValidator.createOrganizationSystemSchema, 'body'),
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['organization_systems:write']),
    catchInternal((req, res) => controller.createOrganizationSystem(req, res))
  );

organizationSystemsRouter.route('/:orgSystemID')
  .get(
    validate(OrganizationSystemValidator.orgSystemIDParamSchema, 'params'),
    catchInternal((req, res) => controller.getOrganizationSystem(req, res))
  )
  .put(
    validate(OrganizationSystemValidator.updateOrganizationSystemSchema, 'body'),
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['organization_systems:write']),
    catchInternal((req, res) => controller.updateOrganizationSystem(req, res))
  )
  .delete(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['organization_systems:write']),
    catchInternal((req, res) => controller.deleteOrganizationSystem(req, res))
  );

export {
  organizationSystemsRouter,
};
