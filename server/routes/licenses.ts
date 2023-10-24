import { LicenseController } from '@server/controllers/LicenseController';
import * as LicenseValidator from '@server/validators/licenses';
import { validate } from '@server/middleware';
import { catchInternal } from '@server/helpers';
import express from 'express';

const licensesRouter = express.Router();
const controller = new LicenseController();

licensesRouter.route('/').get(
  validate(LicenseValidator.getAllLicensesSchema, 'query'),
  catchInternal((req, res) => controller.getAllLicenses(req, res)),
);

licensesRouter.route('/:licenseID').get(
  validate(LicenseValidator.licenseIDParamSchema, 'params'),
  catchInternal((req, res) => controller.getOrganization(req, res)),
);

export {
  licensesRouter,
};
