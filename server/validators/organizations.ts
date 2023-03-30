import joi from 'joi';

export const orgIDParamSchema = joi.object({
  orgID: joi.number().integer().required(),
});

export const getAllOrganizationsSchema = joi.object({
  offset: joi.number().integer().min(0).default(0),
  limit: joi.number().integer().min(1).default(100),
  query: joi.string().max(100),
});
