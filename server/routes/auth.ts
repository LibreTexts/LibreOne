import express from 'express';
import * as AuthController from '../controllers/AuthController';
import * as AuthValidator from '../validators/auth';
import { validate } from '../middleware';
import { catchInternal } from '../helpers';

const authRouter = express.Router();

authRouter.route('/register').post(
  validate(AuthValidator.registerSchema, 'body'),
  catchInternal(AuthController.register),
);

authRouter.route('/verify-email').post(
  validate(AuthValidator.verifyEmailSchema, 'body'),
  catchInternal(AuthController.verifyRegistrationEmail),
);

authRouter.route('/login').get(
  validate(AuthValidator.initLoginQuerySchema, 'query'),
  catchInternal(AuthController.initLogin),
);

authRouter.route('/cas-callback').get(
  validate(AuthValidator.completeLoginSchema, 'query'),
  catchInternal(AuthController.completeLogin),
);

authRouter.route('/logout').get(
  catchInternal(AuthController.logout),
);

authRouter.route('/passwordrecovery').post(
  validate(AuthValidator.initResetPasswordSchema, 'body'),
  catchInternal(AuthController.sendResetPasswordLink),
);

authRouter.route('/passwordrecovery/complete').post(
  validate(AuthValidator.resetPasswordSchema, 'body'),
  catchInternal(AuthController.resetPassword),
);

export {
  authRouter
}