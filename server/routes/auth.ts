import createCasClientExpressMiddleware from 'http-cas-client/wrap/express';
import express from 'express';
import { AuthController } from '../controllers/AuthController';
import * as AuthValidator from '../validators/auth';
import {
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission,
  useLibreTextsCORS,
  validate,
  verifyAPIAuthentication,
} from '../middleware';
import { catchInternal } from '../helpers';

const authRouter = express.Router();
const controller = new AuthController();

const _selfDomain = process.env.DOMAIN || 'localhost:5001';
const _selfDomainSafe = _selfDomain.startsWith('https://') ? _selfDomain : `https://${_selfDomain}`;
const CAS_BRIDGE_SERVER_URL = process.env.CAS_BRIDGE_SERVER_URL || 'http://localhost:8443/cas';
const SELF_URL = `${_selfDomainSafe}/api/v1/auth/cas-bridge`;


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
  validate(AuthValidator.completeRegistrationSchema, 'body'),
  catchInternal((req, res) => controller.completeRegistration(req, res)),
);

authRouter.route('/external-provision').post(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['users:write']),
  catchInternal((req, res) => controller.createUserFromExternalIdentityProvider(req, res)),
);

authRouter.route('/auto-provision').post(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['users:write']),
  validate(AuthValidator.autoProvisionUserSchema, 'body'),
  catchInternal((req, res) => controller.autoProvisionUser(req, res)),
)

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
  catchInternal((req, res) => controller.resetPassword(req, res)),
);

authRouter.route('/cas-bridge').get(
  (req, _res, next) => { req.url = req.originalUrl; return next(); }, // force proper endpoint
  createCasClientExpressMiddleware({ casServerUrlPrefix: CAS_BRIDGE_SERVER_URL, serverName: SELF_URL }),
  catchInternal((req, res) => controller.handleCASBridgeAuthentication(req, res)),
);

authRouter.route('/cas-bridge/jwks').get(
  useLibreTextsCORS,
  catchInternal((req, res) => controller.retrieveCASBridgePublicKey(req, res)),
);

export {
  authRouter,
};