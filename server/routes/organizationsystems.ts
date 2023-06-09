import express from 'express';
import { catchInternal } from '../helpers';
import * as OrganizationSystemController from '../controllers/OrganizationSystemController';
import { verifyAPIAuthentication } from '../middleware';

const organizationSystemsRouter = express.Router();
organizationSystemsRouter.use(verifyAPIAuthentication);

organizationSystemsRouter.route('/')
  .get(catchInternal(OrganizationSystemController.getAllOrganizationSystems))
  .post(catchInternal(OrganizationSystemController.createOrganizationSystem));

organizationSystemsRouter.route('/:orgSystemID')
  .get(catchInternal(OrganizationSystemController.getOrganizationSystem))
  .put(catchInternal(OrganizationSystemController.updateOrganizationSystem))
  .delete(catchInternal(OrganizationSystemController.deleteOrganizationSystem));

export {
  organizationSystemsRouter,
};
