import Joi from 'joi';

export const getAllLanguagesSchema = Joi.object({
  query: Joi.string().allow('').optional(),
});

export const languageIDParamSchema = Joi.object({
  langid: Joi.string().required(),
});