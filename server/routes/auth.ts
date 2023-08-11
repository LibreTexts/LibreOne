import express from 'express';
import { AuthController } from '../controllers/AuthController';
import * as AuthValidator from '../validators/auth';
import { ensureActorIsAPIUser, ensureAPIUserHasPermission, validate, verifyAPIAuthentication } from '../middleware';
import { catchInternal } from '../helpers';

const authRouter = express.Router();
const controller = new AuthController();

authRouter.route('/register').post(
  validate(AuthValidator.registerSchema, 'body'),
  catchInternal((req, res) => controller.register(req, res)),
);

authRouter.route('/verify-email').post(
  validate(AuthValidator.verifyEmailSchema, 'body'),
  catchInternal((req, res) => controller.verifyRegistrationEmail(req, res)),
);

authRouter.route('/complete-registration').post(
  verifyAPIAuthentication,
  catchInternal((req, res) => controller.completeRegistration(req, res)),
);

authRouter.route('/external-provision').post(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['users:write']),
  catchInternal((req, res) => controller.createUserFromExternalIdentityProvider(req, res)),
);

authRouter.route('/cas-interrupt-check').get(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['users:read']),
  catchInternal((req, res) => controller.checkCASInterrupt(req, res)),
);

authRouter.route('/login').get(
  validate(AuthValidator.initLoginQuerySchema, 'query'),
  catchInternal((req, res) => controller.initLogin(req, res)),
);

authRouter.route('/cas-callback').get(
  validate(AuthValidator.completeLoginSchema, 'query'),
  catchInternal((req, res) => controller.completeLogin(req, res)),
);

authRouter.route('/logout').get(
  catchInternal((req, res) => controller.logout(req, res)),
);

authRouter.route('/passwordrecovery').post(
  validate(AuthValidator.initResetPasswordSchema, 'body'),
  catchInternal((req, res) => controller.sendResetPasswordLink(req, res)),
);

authRouter.route('/passwordrecovery/complete').post(
  validate(AuthValidator.resetPasswordSchema, 'body'),
  catchInternal((req, res) =>  controller.resetPassword(req, res)),
);

export {
  authRouter,
};