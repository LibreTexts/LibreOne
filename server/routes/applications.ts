import express from 'express';
import { ApplicationController } from '../controllers/ApplicationController';
import * as ApplicationValidator from '../validators/applications';
import {
  ensureAPIUserHasPermission,
  ensureActorIsAPIUser,
  validate,
  verifyAPIAuthentication,
} from '../middleware';
import { catchInternal } from '../helpers';

const applicationsRouter = express.Router();
const controller = new ApplicationController();

applicationsRouter.route('/')
  .get(
    validate(ApplicationValidator.getAllApplicationsSchema, 'query'),
    catchInternal((req, res) => controller.getAllApplications(req, res)),
  ).post(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['applications:write']),
    validate(ApplicationValidator.createApplicationSchema, 'body'),
    catchInternal((req, res) => controller.createApplication(req, res)),
  );

applicationsRouter.route('/:applicationID')
  .all(
    validate(ApplicationValidator.applicationIDParamSchema, 'params'),
  ).get(
    catchInternal((req, res) => controller.getApplication(req, res)),
  ).patch(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['applications:write']),
    validate(ApplicationValidator.updateApplicationSchema, 'body'),
    catchInternal((req, res) => controller.updateApplication(req, res)),
  ).delete(
    verifyAPIAuthentication,
    ensureActorIsAPIUser,
    ensureAPIUserHasPermission(['applications:write']),
    catchInternal((req, res) => controller.deleteApplication(req, res)),
  );

export {
  applicationsRouter,
};
