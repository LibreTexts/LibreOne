import joi from 'joi';

export const orgIDValidator = joi.number().integer().required();
const orgAliasValidator = joi.string().min(2).max(100);
const orgDomainValidator = joi.string().domain();
const orgLogoValidator = joi.string().uri();
const orgNameValidator = joi.string().min(2).max(100);
const orgSystemIDValidator = joi.number().integer().min(1);


export const orgIDParamSchema = joi.object({
  orgID: orgIDValidator,
});

export const getOrgQuerySchema = joi.object({
  include_admins: joi.boolean().default(false),
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
  name: orgNameValidator.required(),
  logo: orgLogoValidator.default(''),
  system_id: orgSystemIDValidator,
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
  offset: joi.number().integer().min(0),
  limit: joi.number().integer().min(1),
  query: joi.string().max(100),
  onlyUnassociated: joi.boolean(),
});

export const updateOrganizationSchema = joi.object({
  name: orgNameValidator,
  logo: orgLogoValidator,
  system_id: orgSystemIDValidator,
});
