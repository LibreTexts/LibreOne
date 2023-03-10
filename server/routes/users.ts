import express from 'express';
import * as UserController from '../controllers/UserController';
import * as UserValidator from '../validators/user';
import { ensureActorIsAPIUser, validate, verifyAPIAuthentication } from '../middleware';
import { catchInternal } from '../helpers';

const usersRouter = express.Router();

usersRouter.route('/').get(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
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

export {
  usersRouter
}