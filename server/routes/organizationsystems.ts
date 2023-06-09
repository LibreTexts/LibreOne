import express from 'express';
import { catchInternal } from '../helpers';
import { OrganizationSystemController } from '../controllers/OrganizationSystemController';
import { verifyAPIAuthentication } from '../middleware';

const organizationSystemsRouter = express.Router();
const controller = new OrganizationSystemController();

organizationSystemsRouter.use(verifyAPIAuthentication);

organizationSystemsRouter.route('/')
  .get(catchInternal((req, res) => controller.getAllOrganizationSystems(req, res)))
  .post(catchInternal((req, res) => controller.createOrganizationSystem(req, res)));

organizationSystemsRouter.route('/:orgSystemID')
  .get(catchInternal((req, res) => controller.getOrganizationSystem(req, res)))
  .put(catchInternal((req, res) => controller.updateOrganizationSystem(req, res)))
  .delete(catchInternal((req, res) => controller.deleteOrganizationSystem(req, res)));

export {
  organizationSystemsRouter,
};
