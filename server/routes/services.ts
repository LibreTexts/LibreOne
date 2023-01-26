import express from 'express';
import { catchInternal } from '../helpers';
import * as ServiceController from '../controllers/ServiceController';
import { ensureActorIsAPIUser, verifyAPIAuthentication } from '../middleware';

const servicesRouter = express.Router();
servicesRouter.use(verifyAPIAuthentication);
servicesRouter.use(ensureActorIsAPIUser);

servicesRouter.route('/')
  .get(catchInternal(ServiceController.getAllServices))
  .post(catchInternal(ServiceController.createService))

servicesRouter.route('/:serviceID')
  .get(catchInternal(ServiceController.getService))
  .put(catchInternal(ServiceController.updateService))
  .delete(catchInternal(ServiceController.deleteService));

export {
  servicesRouter
};
