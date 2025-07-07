import { StoreController } from '@server/controllers/StoreController';
import { ensureActorIsAPIUser, ensureAPIUserHasPermission, validate, verifyAPIAuthentication } from '@server/middleware';
import { catchInternal } from '@server/helpers';
import express from 'express';
import * as StoreValidator from '../validators/store';
import errors from '@server/errors';

const app = express();

app.use(express.json());
const storeRouter = express.Router();
app.use(express.urlencoded({ extended: false }));
const controller = new StoreController();

storeRouter.route('/access-code/generate').post(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['app_licenses:write']),
  validate(StoreValidator.generateAccessCodeSchema, 'body'),
  (req, res) => errors.notImplemented(res),
  //catchInternal((req, res) => controller.generateAccessCode(req, res)),
);

storeRouter.route('/access-code/bulk').post(
  verifyAPIAuthentication,
  ensureActorIsAPIUser,
  ensureAPIUserHasPermission(['app_licenses:write']),
  validate(StoreValidator.bulkGenerateAccessCodesSchema, 'body'),
  (req, res) => errors.notImplemented(res),
  //catchInternal((req, res) => controller.bulkGenerateAccessCodes(req, res)),
);

storeRouter.route('/products').get(
  verifyAPIAuthentication,
  validate(StoreValidator.getAllAppLicensesSchema, 'query'),
  (req, res) => errors.notImplemented(res),
  //catchInternal((req, res) => controller.getAllAppLicenses(req, res)),
);


export {
  storeRouter,
};
