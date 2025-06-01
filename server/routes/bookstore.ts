import { BookstoreController } from '@server/controllers/BookstoreController';
import * as LicenseValidator from '@server/validators/licenses';
import { validate } from '@server/middleware';
import { catchInternal } from '@server/helpers';
import express from 'express';

const bookstoreRouter = express.Router();
const controller = new BookstoreController();

bookstoreRouter.route('/access-code/generate').post(
  catchInternal((req, res) => controller.generateAccessCode(req, res)),
);

bookstoreRouter.route('/products').get(
  catchInternal((req, res) => controller.getAllAppLicenses(req, res)),
);

export {
  bookstoreRouter,
};
