import joi from 'joi';

export const applicationIDValidator = joi.number().integer().required();

export const applicationTypeValidator = joi.string().valid('standalone', 'library');

export const applicationIDParamSchema = joi.object({
  applicationID: applicationIDValidator,
});

export const createApplicationSchema = joi.object({
  name: joi.string().min(2).max(100).required(),
  app_type: applicationTypeValidator.required(),
  main_url: joi.string().uri().required(),
  cas_service_url: joi.string().uri().required(),
  default_access: joi.string().valid('all', 'instructors', 'none').required(),
  icon: joi.string().uri().required(),
  description: joi.string().min(2).max(100).required(),
  primary_color: joi.string().regex(/^#[A-Fa-f0-9]{6}/).required(), // hex color
});

export const getAllApplicationsSchema = joi.object({
  offset: joi.number().integer().min(0).default(0),
  limit: joi.number().integer().min(1).default(100),
  query: joi.string().max(100),
  type: applicationTypeValidator,
});

export const updateApplicationSchema = joi.object({
  name: joi.string().min(2).max(100),
  app_type: applicationTypeValidator,
  main_url: joi.string().uri(),
  cas_service_url: joi.string().uri(),
  icon: joi.string().uri(),
  description: joi.string().min(2).max(100),
  primary_color: joi.string().regex(/^#[A-Fa-f0-9]{6}/), // hex color
});
