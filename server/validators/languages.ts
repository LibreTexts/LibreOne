import Joi from 'joi';

export const getAllLanguagesSchema = Joi.object({
  query: Joi.string().optional(),
});

export const languageIDParamSchema = Joi.object({
  tag: Joi.string().required(),
});