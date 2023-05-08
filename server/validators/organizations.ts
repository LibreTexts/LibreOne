import joi from 'joi';

const orgIDValidator = joi.number().integer().required();
const orgAliasValidator = joi.string().min(2).max(100);
const orgDomainValidator = joi.string().domain();

export const orgIDParamSchema = joi.object({
  orgID: orgIDValidator,
});

export const orgAliasIDParamsSchema = joi.object({
  orgID: orgIDValidator,
  aliasID: joi.number().integer().required(),
});

export const orgDomainIDParamsSchema = joi.object({
  orgID: orgIDValidator,
  domainID: joi.number().integer().required(),
});

export const createOrganizationSchema = joi.object({
  name: joi.string().min(2).max(100).required(),
  logo: joi.string().uri().default(''),
  system_id: joi.number().integer().min(1),
  aliases: joi.array().items(orgAliasValidator).default([]),
  domains: joi.array().items(orgDomainValidator).default([]),
});

export const createOrganizationAliasSchema = joi.object({
  alias: orgAliasValidator.required(),
});

export const createOrganizationDomainSchema = joi.object({
  domain: orgDomainValidator.required(),
});

export const getAllOrganizationsSchema = joi.object({
  offset: joi.number().integer().min(0).default(0),
  limit: joi.number().integer().min(1).default(100),
  query: joi.string().max(100),
});
