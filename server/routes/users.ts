import express from 'express';
import * as UserController from '../controllers/UserController';
import * as UserValidator from '../validators/user';
import { ensureAPIUserHasPermission, ensureActorIsAPIUser, validate, verifyAPIAuthentication } from '../middleware';
import { catchInternal } from '../helpers';

const usersRouter = express.Router();

usersRouter.route('/').get(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['users:read']),
  validate(UserValidator.getAllUsersSchema, 'query'),
  catchInternal(UserController.getAllUsers),
);

usersRouter.route('/principal-attributes').get(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  catchInternal(UserController.resolvePrincipalAttributes),
);

usersRouter.route('/:uuid')
  .get(
    verifyAPIAuthentication,
    validate(UserValidator.uuidParamSchema, 'params'),
    catchInternal(UserController.getUser),
  ).patch(
    verifyAPIAuthentication,
    validate(UserValidator.updateUserSchema, 'body'),
    catchInternal(UserController.updateUser),
  );

usersRouter.route('/:uuid/avatar').post(
  verifyAPIAuthentication,
  validate(UserValidator.uuidParamSchema, 'params'),
  UserController.avatarUploadHandler,
  catchInternal(UserController.updateUserAvatar),
);

export {
  usersRouter
}