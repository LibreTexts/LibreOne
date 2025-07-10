import { AppLicenseController } from '../controllers/AppLicenseController';
import { catchInternal } from '../helpers';
import {
  ensureAPIUserHasPermission,
  ensureActorIsAPIUser,
  ensureUserResourcePermission,
  validate,
  verifyAPIAuthentication,
} from '../middleware';
import express, { application } from 'express';
import * as AppLicenseValidator from '../validators/app-licenses';
import errors from '@server/errors';

const appLicensesRouter = express.Router();
const controller = new AppLicenseController();


appLicensesRouter.route('/user/:user_id').get(
  verifyAPIAuthentication,
  ensureUserResourcePermission(false),
  validate(AppLicenseValidator.userIdParamSchema, 'params'),
  catchInternal((req, res) => controller.getAllUserLicenses(req, res)),
);

appLicensesRouter.route('/check-access/:user_id/:app_id').get(
  verifyAPIAuthentication,
  ensureUserResourcePermission(false),
  validate(AppLicenseValidator.userIdWithAppIdSchema, 'params'),
  (req, res) => errors.notImplemented(res),
  //catchInternal((req, res) => controller.checkLicenseAccess(req, res)),
);

appLicensesRouter.route('/redeem/:user_id').post(
  verifyAPIAuthentication,
  ensureUserResourcePermission(true),
  validate(AppLicenseValidator.userIdParamSchema, 'params'),
  validate(AppLicenseValidator.redeemAccessCodeSchema, 'body'),
  catchInternal((req, res) => controller.applyAccessCodeToLicense(req, res)),
)

appLicensesRouter.route('/auto-apply').post(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['app_licenses:write']),
  validate(AppLicenseValidator.autoApplyAccessCodeSchema, 'body'),
  catchInternal((req, res) => controller.autoApplyAccess(req, res)),
);

appLicensesRouter.route('/trial/create/:user_id/:app_id').post(
  verifyAPIAuthentication,
  ensureUserResourcePermission(true),
  validate(AppLicenseValidator.userIdWithAppIdSchema, 'params'),
  catchInternal((req, res) => controller.createTrial(req, res)),
)

appLicensesRouter.route('/renew/:uuid').patch(
  verifyAPIAuthentication,
  ensureUserResourcePermission(true),
  validate(AppLicenseValidator.userIdParamSchema, 'params'),
  validate(AppLicenseValidator.applicationLicenseIdSchema, 'body'),
  (req, res) => errors.notImplemented(res),
  //catchInternal((req, res) => controller.renewLicense(req, res)),
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
  (req, res) => errors.notImplemented(res),
  //catchInternal((req, res) => controller.getAllOrgLicenses(req, res)),
)

appLicensesRouter.route('/check-expire').post(
  verifyAPIAuthentication,
  validate(AppLicenseValidator.licenseOperationSchema, 'body'),
  (req, res) => errors.notImplemented(res),
  //catchInternal((req, res) => controller.LicenseExpiringCheck(req, res)),
)

appLicensesRouter.route('/user/:user_id/expired').get(
  verifyAPIAuthentication,
  ensureUserResourcePermission(false),
  validate(AppLicenseValidator.userIdParamSchema, 'params'),
  (req, res) => errors.notImplemented(res),
  //catchInternal((req, res) => controller.getUserExpiredLicenses(req, res)),
)

export {
  appLicensesRouter,
};
