import express from 'express';
import { catchInternal } from '../helpers';
import { ServiceController } from '../controllers/ServiceController';
import { ensureActorIsAPIUser, ensureAPIUserHasPermission, verifyAPIAuthentication } from '../middleware';

const servicesRouter = express.Router();
const controller = new ServiceController();

servicesRouter.use(verifyAPIAuthentication);
servicesRouter.use(ensureActorIsAPIUser);

servicesRouter.route('/')
  .get(
    ensureAPIUserHasPermission(['services:read']),
    catchInternal((req, res) => controller.getAllServices(req, res)),
  )
  .post(
    ensureAPIUserHasPermission(['services:write']),
    catchInternal((req, res) => controller.createService(req, res)),
  );

servicesRouter.route('/:id')
  .get(
    ensureAPIUserHasPermission(['services:read']),
    catchInternal((req, res) => controller.getService(req, res)),
  )
  .put(
    ensureAPIUserHasPermission(['services:write']),
    catchInternal((req, res) => controller.updateService(req, res)),
  )
  .delete(
    ensureAPIUserHasPermission(['services:write']),
    catchInternal((req, res) => controller.deleteService(req, res)),
  );

export {
  servicesRouter,
};
