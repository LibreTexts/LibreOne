import express from 'express';
import { catchInternal } from '../helpers';
import { ServiceController } from '../controllers/ServiceController';
import { ensureActorIsAPIUser, verifyAPIAuthentication } from '../middleware';

const servicesRouter = express.Router();
const controller = new ServiceController();

servicesRouter.use(verifyAPIAuthentication);
servicesRouter.use(ensureActorIsAPIUser);

servicesRouter.route('/')
  .get(catchInternal((req, res) => controller.getAllServices(req, res)))
  .post(catchInternal((req, res) => controller.createService(req, res)));

servicesRouter.route('/:serviceID')
  .get(catchInternal((req, res) => controller.getService(req, res)))
  .put(catchInternal((req, res) => controller.updateService(req, res)))
  .delete(catchInternal((req, res) => controller.deleteService(req, res)));

export {
  servicesRouter,
};
