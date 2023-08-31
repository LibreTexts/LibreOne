import express from 'express';
import { VerificationRequestController } from '../controllers/VerificationRequestController';
import * as VerificationRequestValidator from '../validators/verificationrequests';
import { ensureAPIUserHasPermission, ensureActorIsAPIUser, validate, verifyAPIAuthentication } from '../middleware';
import { catchInternal } from '../helpers';

const verificationRequestsRouter = express.Router();
const controller = new VerificationRequestController();

verificationRequestsRouter.route('/').get(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['verification_requests:read', 'access_requests:read']),
  validate(VerificationRequestValidator.getAllVerificationRequestsSchema, 'query'),
  catchInternal((req, res) => controller.getAllVerificationRequests(req, res)),
);

verificationRequestsRouter.route('/:verificationRequestID')
  .all(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    validate(VerificationRequestValidator.verificationRequestIDParamSchema, 'params'),
  ).get(
    ensureAPIUserHasPermission(['verification_requests:read', 'access_requests:read']),
    catchInternal((req, res) => controller.getVerificationRequest(req, res)),
  ).patch(
    ensureAPIUserHasPermission(['verification_requests:write', 'access_requests:write']),
    validate(VerificationRequestValidator.updateVerificationRequestSchema, 'body'),
    catchInternal((req, res) => controller.updateVerificationRequest(req, res)),
  );

export {
  verificationRequestsRouter,
};