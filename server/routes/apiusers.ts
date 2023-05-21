import express from 'express';
import * as APIUserController from '../controllers/APIUserController';
import * as APIUserValidator from '../validators/apiusers';
import { ensureAPIUserHasPermission, ensureActorIsAPIUser, validate, verifyAPIAuthentication } from '../middleware';
import { catchInternal } from '../helpers';

const apiUsersRouter = express.Router();

apiUsersRouter.route('*').all(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
);

apiUsersRouter.route('/')
  .get(
    ensureAPIUserHasPermission(['api_users:read']),
    validate(APIUserValidator.getAllAPIUsersSchema, 'query'),
    catchInternal(APIUserController.getAllAPIUsers),
  ).post(
    ensureAPIUserHasPermission(['api_users:write']),
    validate(APIUserValidator.createAPIUserSchema, 'body'),
    catchInternal(APIUserController.createAPIUser),
  );

apiUsersRouter.route('/:id')
  .all(
    validate(APIUserValidator.idParamSchema, 'params'),
  ).get(
    ensureAPIUserHasPermission(['api_users:read']),
    catchInternal(APIUserController.getAPIUser),
  ).patch(
    ensureAPIUserHasPermission(['api_users:write']),
    validate(APIUserValidator.updateAPIUserSchema, 'body'),
    catchInternal(APIUserController.updateAPIUser),
  ).delete(
    ensureAPIUserHasPermission(['api_users:write']),
    catchInternal(APIUserController.deleteAPIUser),
  );

export {
  apiUsersRouter,
};
