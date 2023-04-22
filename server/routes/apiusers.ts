import express from 'express';
import * as APIUserController from '../controllers/APIUserController';
import * as APIUserValidator from '../validators/apiusers';
import { ensureAPIUserHasPermission, ensureActorIsAPIUser, validate, verifyAPIAuthentication } from '../middleware';
import { catchInternal } from '../helpers';

const apiUsersRouter = express.Router();


apiUsersRouter.route('/')
  .get(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['api_users:read']),
    validate(APIUserValidator.getAllAPIUsersSchema, 'query'),
    catchInternal(APIUserController.getAllAPIUsers),
  ).post(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['api_users:write']),
    validate(APIUserValidator.createAPIUserSchema, 'body'),
    catchInternal(APIUserController.createAPIUser),
  );

apiUsersRouter.route('/:id')
  .all(
    validate(APIUserValidator.idParamSchema, 'params'),
  ).get(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['api_users:read']),
    catchInternal(APIUserController.getAPIUser),
  ).patch(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['api_users:write']),
    validate(APIUserValidator.updateAPIUserSchema, 'body'),
    catchInternal(APIUserController.updateAPIUser),
  );

export {
  apiUsersRouter
}
