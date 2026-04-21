import createCasClientExpressMiddleware from 'http-cas-client/wrap/express';
import express, { CookieOptions } from 'express';
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
import bodyParser from 'body-parser';

const authRouter = express.Router();
const controller = new AuthController();

const _selfDomain = process.env.DOMAIN || 'localhost:5001';
const _selfDomainSafe = _selfDomain.startsWith('https://') ? _selfDomain : `https://${_selfDomain}`;
const _casPrefix = process.env.CAS_BRIDGE_SERVER_URL || 'http://localhost:8443/cas';
const CAS_BRIDGE_SERVER_URL = (_casPrefix.startsWith('https://') || _casPrefix.startsWith('http://')) ? _casPrefix : `https://${_casPrefix}`;
const SELF_URL = `${_selfDomainSafe}/api/v1/auth/cas-bridge`;


authRouter.route('/register').post(
  validate(AuthValidator.registerSchema, 'body'),
  catchInternal((req, res) => controller.register(req, res)),
);

authRouter.route('/verify-email-code').post(
  validate(AuthValidator.verifyEmailCodeSchema, 'body'),
  catchInternal((req, res) => controller.verifyRegistrationEmailCode(req, res)),
);

authRouter.route('/verify-email-token').post(
  validate(AuthValidator.verifyEmailTokenSchema, 'body'),
  catchInternal((req, res) => controller.verifyRegistrationEmailToken(req, res)),
);

authRouter.route('/resend-verification-email').post(
  validate(AuthValidator.resendVerificationEmailSchema, 'body'),
  catchInternal((req, res) => controller.resendVerificationEmail(req, res)),
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
  validate(AuthValidator.externalProvisionUserSchema, 'body'),
  catchInternal((req, res) => controller.createUserFromExternalIdentityProvider(req, res)),
);

authRouter.route('/auto-provision').post(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['users:write']),
  validate(AuthValidator.autoProvisionUserSchema, 'body'),
  catchInternal((req, res) => controller.autoProvisionUser(req, res)),
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

authRouter.route('/back-channel-slo').post(
  bodyParser.urlencoded({ extended: false }), // CAS sends form data
  catchInternal((req, res) => controller.backChannelSLO(req, res)),
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
  catchInternal((req, res, next) => {
    const cookies = req.cookies;
    const { gateway: gatewayParam, ticket: ticketParam } = req.query;
    const isGateway = gatewayParam === 'true';
    if (isGateway) {
      const cookieConfig: CookieOptions = {
        path: '/',
        secure: true,
        domain: 'libretexts.org',
        sameSite: 'lax',
        maxAge: 60 * 1000, // 60 seconds
      };
      res.cookie('cas_bridge_server_gateway_attempt', 'true', cookieConfig);
      const redirParams = new URLSearchParams({
        gateway: 'true',
        service: SELF_URL,
      });
      res.redirect(`${CAS_BRIDGE_SERVER_URL}/login?${redirParams.toString()}`);
      return;
    }
    if (cookies?.cas_bridge_server_gateway_attempt && cookies?.cas_bridge_redirect) {
      const stCookie = cookies?.st;
      if (!ticketParam && !stCookie) {
        // attempted gateway but no session found, silently redirect
        res.redirect(cookies.cas_bridge_redirect);
        return;
      }
    }
    req.url = req.originalUrl; // force proper endpoint
    if (next) return next();
  }),
  createCasClientExpressMiddleware({
    casServerUrlPrefix: CAS_BRIDGE_SERVER_URL,
    serverName: SELF_URL,
  }),
  catchInternal((req, res) => controller.handleCASBridgeAuthentication(req, res)),
);

authRouter.route('/cas-bridge/jwks').get(
  useLibreTextsCORS,
  catchInternal((req, res) => controller.retrieveCASBridgePublicKey(req, res)),
);

export {
  authRouter,
};