import express from 'express';
import { UserController } from '../controllers/UserController';
import * as UserValidator from '../validators/user';
import {
  ensureAPIUserHasPermission,
  ensureActorIsAPIUser,
  ensureUserResourcePermission,
  useLibreTextsCORS,
  validate,
  verifyAPIAuthentication,
  extract_X_User_ID,
} from '../middleware';
import { catchInternal } from '../helpers';

const usersRouter = express.Router();
const controller = new UserController();

usersRouter.route('/').get(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['users:read']),
  validate(UserValidator.getAllUsersSchema, 'query'),
  catchInternal((req, res) => controller.getAllUsers(req, res)),
);

usersRouter.route('/principal-attributes').get(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['users:read']),
  catchInternal((req, res) => controller.resolvePrincipalAttributes(req, res)),
);

usersRouter.route('/organizations').get(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['users:read', 'organizations:read']),
  validate(UserValidator.getMultipleUserOrganizationsSchema, 'query'),
  catchInternal((req, res) => controller.getMultipleUserOrganizations(req, res)),
)

usersRouter.route('/:uuid')
  .get(
    verifyAPIAuthentication,
    ensureUserResourcePermission(),
    validate(UserValidator.uuidParamSchema, 'params'),
    catchInternal((req, res) => controller.getUser(req, res)),
  ).patch(
    verifyAPIAuthentication,
    ensureUserResourcePermission(true),
    validate(UserValidator.updateUserSchema, 'body'),
    catchInternal((req, res) => controller.updateUser(req, res)),
  );

usersRouter.route('/:uuid/academy-online').patch(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['users:write']),
  validate(UserValidator.uuidParamSchema, 'params'),
  validate(UserValidator.updateUserAcademyOnlineSchema, 'body'),
  catchInternal((req, res) => controller.updateUserAcademyOnline(req, res)),
)

usersRouter.route('/:uuid/applications')
  .all(
    verifyAPIAuthentication,
    validate(UserValidator.uuidParamSchema, 'params'),
  ).get(
    validate(UserValidator.getAllUserApplicationsSchema, 'query'),
    ensureUserResourcePermission(false),
    catchInternal((req, res) => controller.getAllUserApplications(req, res)),
  ).post(
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['applications:write', 'users:write']),
    validate(UserValidator.createUserApplicationSchema, 'body'),
    catchInternal((req, res) => controller.createUserApplication(req, res)),
  );

usersRouter.route('/:uuid/applications/:applicationID').delete(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['applications:write', 'users:write']),
  validate(UserValidator.uuidApplicationIDParamsSchema, 'params'),
  catchInternal((req, res) => controller.deleteUserApplication(req, res)),
);

usersRouter.route('/:uuid/disable').patch(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['users:write']),
  validate(UserValidator.uuidParamSchema, 'params'),
  validate(UserValidator.disableUserSchema, 'body'),
  catchInternal((req, res) => controller.disableUser(req, res))
);

usersRouter.route('/:uuid/re-enable').patch(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['users:write']),
  validate(UserValidator.uuidParamSchema, 'params'),
  catchInternal((req, res) => controller.reEnableUser(req, res))
);

usersRouter.route('/:uuid/organizations')
  .all(
    verifyAPIAuthentication,
    validate(UserValidator.uuidParamSchema, 'params'),
  ).get(
    ensureUserResourcePermission(),
    catchInternal((req, res) => controller.getAllUserOrganizations(req, res)),
  ).post(
    ensureUserResourcePermission(true),
    validate(UserValidator.createUserOrganizationSchema, 'body'),
    catchInternal((req, res) => controller.createUserOrganization(req, res)),
  );

usersRouter.route('/:uuid/organizations/:orgID').delete(
  verifyAPIAuthentication,
  ensureUserResourcePermission(true),
  validate(UserValidator.uuidOrgIDParamsSchema, 'params'),
  catchInternal((req, res) => controller.deleteUserOrganization(req, res)),
);

usersRouter.route('/:uuid/organizations/:orgID/admin-role')
  .all(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['users:write', 'organizations:write']),
    validate(UserValidator.uuidOrgIDParamsSchema, 'params'),
  ).post(
    validate(UserValidator.updateUserOrganizationAdminRoleSchema, 'body'),
    catchInternal((req, res) => controller.updateUserOrganizationAdminRole(req, res)),
  ).delete(
    catchInternal((req, res) => controller.deleteUserOrganizationAdminRole(req, res)),
  );

usersRouter.route('/:uuid/verification-request')
  .all(
    verifyAPIAuthentication,
    ensureUserResourcePermission(true),
    validate(UserValidator.uuidParamSchema, 'params'),
  ).patch(
    validate(UserValidator.updateUserVerificationRequestSchema, 'body'),
    catchInternal((req, res) => controller.updateUserVerificationRequest(req, res)),
  ).post(
    validate(UserValidator.createUserVerificationRequestSchema, 'body'),
    catchInternal((req, res) => controller.createUserVerificationRequest(req, res)),
  );

usersRouter.route('/:uuid/avatar').post(
  verifyAPIAuthentication,
  ensureUserResourcePermission(true),
  validate(UserValidator.uuidParamSchema, 'params'),
  (...args) => controller.avatarUploadHandler(...args),
  catchInternal((req, res) => controller.updateUserAvatar(req, res)),
);

usersRouter.route('/:uuid/email-change-direct').post(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['users:write']),
  validate(UserValidator.uuidParamSchema, 'params'),
  validate(UserValidator.updateUserEmailDirectSchema, 'body'),
  catchInternal((req, res) => controller.updateUserEmailDirect(req, res)),
);

usersRouter.route('/:uuid/email-change').post(
  verifyAPIAuthentication,
  ensureUserResourcePermission(true),
  validate(UserValidator.uuidParamSchema, 'params'),
  validate(UserValidator.createUserEmailChangeRequestSchema, 'body'),
  catchInternal((req, res) => controller.createUserEmailChangeRequest(req, res)),
);

usersRouter.route('/:uuid/verify-email-change').post(
  verifyAPIAuthentication,
  ensureUserResourcePermission(true),
  validate(UserValidator.uuidParamSchema, 'params'),
  validate(UserValidator.updateUserEmailSchema, 'body'),
  catchInternal((req, res) => controller.updateUserEmail(req, res)),
);

usersRouter.route('/:uuid/password-change').post(
  verifyAPIAuthentication,
  ensureUserResourcePermission(true),
  validate(UserValidator.uuidParamSchema, 'params'),
  validate(UserValidator.updateUserPasswordSchema, 'body'),
  catchInternal((req, res) => controller.updateUserPassword(req, res)),
);

usersRouter.route('/:uuid/init-delete-account').post(
  verifyAPIAuthentication,
  ensureUserResourcePermission(true),
  validate(UserValidator.uuidParamSchema, 'params'),
  catchInternal((req, res) => controller.initDeleteAccount(req, res)),
);

usersRouter.route('/:uuid/notes')
  .get(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['users:write']),
    validate(UserValidator.uuidParamSchema, 'params'),
    validate(UserValidator.getUserNotesSchema, 'query'),
    catchInternal((req, res) => controller.getNotes(req, res)),
  )
  .post(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['users:write']),
    validate(UserValidator.uuidParamSchema, 'params'),
    validate(UserValidator.createUserNoteSchema, 'body'),
    extract_X_User_ID,
    catchInternal((req, res) => controller.createNote(req, res)),
  );

usersRouter.route('/:uuid/notes/:noteID')
  .patch(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['users:write']),
    validate(UserValidator.userNoteParamSchema, 'params'),
    validate(UserValidator.updateUserNoteSchema, 'body'),
    extract_X_User_ID,
    catchInternal((req, res) => controller.updateNote(req, res)),
  )
  .delete(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['users:write']),
    validate(UserValidator.userNoteParamSchema, 'params'),
    catchInternal((req, res) => controller.deleteNote(req, res)),
  );

export {
  usersRouter,
};