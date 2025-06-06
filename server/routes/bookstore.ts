import { BookstoreController } from '@server/controllers/BookstoreController';
import { ensureActorIsAPIUser, ensureAPIUserHasPermission, ensureUserResourcePermission, validate, verifyAPIAuthentication } from '@server/middleware';
import { catchInternal } from '@server/helpers';
import express from 'express';
import * as BookstoreValidator from '../validators/bookstore';

const app = express();

app.use(express.json());
const bookstoreRouter = express.Router();
app.use(express.urlencoded({ extended: false }));
const controller = new BookstoreController();

bookstoreRouter.route('/access-code/generate/:uuid').post(
  verifyAPIAuthentication, 
  ensureUserResourcePermission(true),
  validate(BookstoreValidator.userIdParamSchema, 'params'),
  validate(BookstoreValidator.applicationLicenseIdSchema, 'body'),
  catchInternal((req, res) => controller.generateAccessCode(req, res)),
);

bookstoreRouter.route('/access-code/bulk').post(
  verifyAPIAuthentication, 
  ensureActorIsAPIUser, 
  ensureAPIUserHasPermission(['app_licenses:write']),
  validate(BookstoreValidator.bulkGenerateAccessCodesSchema, 'body'),
  catchInternal((req, res) => controller.bulkGenerateAccessCodes(req, res)),
);

bookstoreRouter.route('/products').get(
  verifyAPIAuthentication, 
  validate(BookstoreValidator.getAllAppLicensesSchema, 'query'),
  catchInternal((req, res) => controller.getAllAppLicenses(req, res)),
);


export {
  bookstoreRouter,
};
