import { AppLicenseController } from '../controllers/AppLicenseController';
import { catchInternal } from '../helpers';
import {
  ensureAPIUserHasPermission,
  ensureActorIsAPIUser,
  ensureUserResourcePermission,
  validate,
  verifyAPIAuthentication,
} from '../middleware';
import express from 'express';
import * as AppLicenseValidator from '../validators/app-licenses';

const appLicensesRouter = express.Router();
const controller = new AppLicenseController();


appLicensesRouter.route('/user/:uuid').get(
  verifyAPIAuthentication,
  ensureUserResourcePermission(false),
  validate(AppLicenseValidator.userIdParamSchema, 'params'),
  catchInternal((req, res) => controller.getAllUserLicenses(req, res)),
);

appLicensesRouter.route('/check-access/:uuid/:application_license_id').get(
  verifyAPIAuthentication,
  ensureUserResourcePermission(false),
  validate(AppLicenseValidator.directLicenseOperationSchema, 'params'),
  catchInternal((req, res) => controller.checkLicenseAccess(req, res)),
);

appLicensesRouter.route('/apply-code').post(
  verifyAPIAuthentication,
  validate(AppLicenseValidator.accessCodeSchema, 'body'),
  catchInternal((req, res) => controller.applyAccessCodeToLicense(req, res)),
)

appLicensesRouter.route('/trial/create').post(
  verifyAPIAuthentication,
  validate(AppLicenseValidator.directLicenseOperationSchema, 'body'),
  catchInternal((req, res) => controller.createTrial(req, res)),
)

appLicensesRouter.route('/renew/:uuid').patch(
  verifyAPIAuthentication,
  ensureUserResourcePermission(true),
  validate(AppLicenseValidator.userIdParamSchema, 'params'),
  validate(AppLicenseValidator.applicationLicenseIdSchema, 'body'),
  catchInternal((req, res) => controller.renewLicense(req, res)),
)

appLicensesRouter.route('/manual-grant').post(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['app_licenses:write']),
  validate(AppLicenseValidator.licenseOperationSchema, 'body'),
  catchInternal((req, res) => controller.manualGrantLicense(req, res)),
)

appLicensesRouter.route('/manual-revoke').post(
  verifyAPIAuthentication,
  ensureActorIsAPIUser, 
  ensureAPIUserHasPermission(['app_licenses:write']),
  validate(AppLicenseValidator.licenseOperationSchema, 'body'),
  catchInternal((req, res) => controller.revokeLicense(req, res)),
)

appLicensesRouter.route('/organization/:org_id').get(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['organizations:read']),
  validate(AppLicenseValidator.orgIdParamSchema, 'params'),
  catchInternal((req, res) => controller.getAllOrgLicenses(req, res)),
)

appLicensesRouter.route('/check-expire').post(
  verifyAPIAuthentication,
  validate(AppLicenseValidator.licenseOperationSchema, 'body'),
  catchInternal((req, res) => controller.LicenseExpiringCheck(req, res)),
)

appLicensesRouter.route('/user/:uuid/expired').get(
  verifyAPIAuthentication,
  ensureUserResourcePermission(false),
  validate(AppLicenseValidator.userIdParamSchema, 'params'),
  catchInternal((req, res) => controller.getUserExpiredLicenses(req, res)),
)

export {
  appLicensesRouter,
};
