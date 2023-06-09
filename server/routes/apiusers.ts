import express from 'express';
import { APIUserController } from '../controllers/APIUserController';
import * as APIUserValidator from '../validators/apiusers';
import { ensureAPIUserHasPermission, ensureActorIsAPIUser, validate, verifyAPIAuthentication } from '../middleware';
import { catchInternal } from '../helpers';

const apiUsersRouter = express.Router();
const controller = new APIUserController();

apiUsersRouter.route('*').all(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
);

apiUsersRouter.route('/')
  .get(
    ensureAPIUserHasPermission(['api_users:read']),
    validate(APIUserValidator.getAllAPIUsersSchema, 'query'),
    catchInternal((req, res) => controller.getAllAPIUsers(req, res)),
  ).post(
    ensureAPIUserHasPermission(['api_users:write']),
    validate(APIUserValidator.createAPIUserSchema, 'body'),
    catchInternal((req, res) => controller.createAPIUser(req, res)),
  );

apiUsersRouter.route('/:id')
  .all(
    validate(APIUserValidator.idParamSchema, 'params'),
  ).get(
    ensureAPIUserHasPermission(['api_users:read']),
    catchInternal((req, res) => controller.getAPIUser(req, res)),
  ).patch(
    ensureAPIUserHasPermission(['api_users:write']),
    validate(APIUserValidator.updateAPIUserSchema, 'body'),
    catchInternal((req, res) => controller.updateAPIUser(req, res)),
  ).delete(
    ensureAPIUserHasPermission(['api_users:write']),
    catchInternal((req, res) => controller.deleteAPIUser(req, res)),
  );

export {
  apiUsersRouter,
};
