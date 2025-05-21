import { LanguageController } from '@server/controllers/LanguageController';
import * as LanguageValidator from '@server/validators/languages';
import { validate } from '@server/middleware';
import { catchInternal } from '@server/helpers';
import express from 'express';

const languagesRouter = express.Router();
const controller = new LanguageController();

languagesRouter.route('/').get(
  validate(LanguageValidator.getAllLanguagesSchema, 'query'),
  catchInternal((req, res) => controller.getAllLanguages(req, res)),
);

languagesRouter.route('/:langid').get(
  validate(LanguageValidator.languageIDParamSchema, 'params'),
  catchInternal((req, res) => controller.getLanguage(req, res)),
);

export {
  languagesRouter,
};