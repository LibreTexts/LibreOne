import { AppLicenseController } from '@server/controllers/AppLicenseController';
import * as LicenseValidator from '@server/validators/licenses';
import { validate } from '@server/middleware';
import { catchInternal } from '@server/helpers';
import express from 'express';

const appLicensesRouter = express.Router();
const controller = new AppLicenseController();

appLicensesRouter.route('/user/:userId').get(
  catchInternal((req, res) => controller.getAllUserLicenses(req, res)),
);

appLicensesRouter.route('/check-access').get(
  catchInternal((req, res) => controller.checkLicenseAccess(req, res)),
);

appLicensesRouter.route('/apply-code').post(
  catchInternal((req, res) => controller.applyAccessCodeToLicense(req, res)),
)

appLicensesRouter.route('/trial/create').post(
  catchInternal((req, res) => controller.createTrial(req, res)),
)

appLicensesRouter.route('/renew').patch(
  catchInternal((req, res) => controller.renewLicense(req, res)),
)

appLicensesRouter.route('/manual-grant').post(
  catchInternal((req, res) => controller.manualGrantLicense(req, res)),
)

appLicensesRouter.route('/manual-revoke').delete(
  catchInternal((req, res) => controller.revokeLicense(req, res)),
)

appLicensesRouter.route('/organization/:orgId').get(
  catchInternal((req, res) => controller.getAllOrgLicenses(req, res)),
)

appLicensesRouter.route('/check-expire').post(
  catchInternal((req, res) => controller.LicenseExpiringCheck(req, res)),
)

export {
  appLicensesRouter,
};
