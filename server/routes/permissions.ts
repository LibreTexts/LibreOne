import express from 'express';
import { PermissionsController } from '../controllers/PermissionsController';
import * as PermissionsValidator from '../validators/permissions';
import { ensureAPIUserHasPermission, ensureActorIsAPIUser, validate, verifyAPIAuthentication } from '../middleware';
import { catchInternal } from '../helpers';

const permissionsRouter = express.Router();
const controller = new PermissionsController();

permissionsRouter.route('/check').post(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['users:read']),
  validate(PermissionsValidator.checkPermissionSchema, 'body'),
  catchInternal((req, res) => controller.checkPermission(req, res)),
);

export { permissionsRouter };