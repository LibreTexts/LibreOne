import joi from 'joi';

export const orgIDParamSchema = joi.object({
  orgID: joi.number().integer().required(),
});

export const createOrganizationSchema = joi.object({
  name: joi.string().min(2).max(100).required(),
  logo: joi.string().uri().default(''),
  system_id: joi.number().integer().min(1),
  aliases: joi.array().items(joi.string().min(2).max(100)).default([]),
  domains: joi.array().items(joi.string().domain()).default([]),
});

export const getAllOrganizationsSchema = joi.object({
  offset: joi.number().integer().min(0).default(0),
  limit: joi.number().integer().min(1).default(100),
  query: joi.string().max(100),
});
