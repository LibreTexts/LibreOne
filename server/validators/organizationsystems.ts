import joi from 'joi';

const DEFAULT_AVATAR_LOGO_URL = "https://cdn.libretexts.net/DefaultImages/avatar.png";

export const createOrganizationSystemSchema = joi.object({
  name: joi.string().min(2).max(100).required(),
  logo: joi.string().default(DEFAULT_AVATAR_LOGO_URL)
});

export const updateOrganizationSystemSchema = joi.object({
  name: joi.string().min(2).max(100),
  logo: joi.string().default(DEFAULT_AVATAR_LOGO_URL),
});

export const orgSystemIDParamSchema = joi.object({
  orgSystemID: joi.number().integer().required(),
});

export const getAllOrganizationSystemsSchema = joi.object({
  offset: joi.number().integer().min(0),
  limit: joi.number().integer().min(1),
});