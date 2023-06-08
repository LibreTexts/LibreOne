import express from 'express';
import * as UserController from '../controllers/UserController';
import * as UserValidator from '../validators/user';
import { ensureAPIUserHasPermission, ensureActorIsAPIUser, ensureUserResourcePermission, validate, verifyAPIAuthentication } from '../middleware';
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
  ensureAPIUserHasPermission(['users:read']),
  catchInternal(UserController.resolvePrincipalAttributes),
);

usersRouter.route('/:uuid')
  .get(
    verifyAPIAuthentication,
    ensureUserResourcePermission(),
    validate(UserValidator.uuidParamSchema, 'params'),
    catchInternal(UserController.getUser),
  ).patch(
    verifyAPIAuthentication,
    ensureUserResourcePermission(true),
    validate(UserValidator.updateUserSchema, 'body'),
    catchInternal(UserController.updateUser),
  );

usersRouter.route('/:uuid/organizations')
  .all(
    verifyAPIAuthentication,
    validate(UserValidator.uuidParamSchema, 'params'),
  ).get(
    ensureUserResourcePermission(),
    catchInternal(UserController.getAllUserOrganizations),
  ).post(
    ensureUserResourcePermission(true),
    validate(UserValidator.createUserOrganizationSchema, 'body'),
    catchInternal(UserController.createUserOrganization),
  );

usersRouter.route('/:uuid/organizations/:orgID').delete(
  verifyAPIAuthentication,
  ensureUserResourcePermission(true),
  validate(UserValidator.uuidOrgIDParamsSchema, 'params'),
  catchInternal(UserController.deleteUserOrganization),
);

usersRouter.route('/:uuid/organizations/:orgID/admin-role')
  .all(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['users:write', 'organizations:write']),
    validate(UserValidator.uuidOrgIDParamsSchema, 'params'),
  ).post(
    validate(UserValidator.updateUserOrganizationAdminRoleSchema, 'body'),
    catchInternal(UserController.updateUserOrganizationAdminRole),
  ).delete(
    catchInternal(UserController.deleteUserOrganizationAdminRole),
  );

usersRouter.route('/:uuid/avatar').post(
  verifyAPIAuthentication,
  ensureUserResourcePermission(true),
  validate(UserValidator.uuidParamSchema, 'params'),
  UserController.avatarUploadHandler,
  catchInternal(UserController.updateUserAvatar),
);

export {
  usersRouter,
};