import express from 'express';
import { catchInternal } from '../helpers';
import * as SystemController from '../controllers/SystemController';
import { verifyAPIAuthentication } from '../middleware';

const systemsRouter = express.Router();
systemsRouter.use(verifyAPIAuthentication);

systemsRouter.route('/')
  .get(catchInternal(SystemController.getAllSystems))
  .post(catchInternal(SystemController.createSystem))

systemsRouter.route('/:systemID')
  .get(catchInternal(SystemController.getSystem))
  .put(catchInternal(SystemController.updateSystem))
  .delete(catchInternal(SystemController.deleteSystem));

export {
  systemsRouter
};
