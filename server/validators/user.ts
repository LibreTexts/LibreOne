import joi from 'joi';

export const uuidParamSchema = joi.object({
  uuid: joi.string().uuid({ version: 'uuidv4' }).required(),
});

export const getAllUsersSchema = joi.object({
  offset: joi.number().integer().default(0),
  limit: joi.number().integer().default(50),
});

export const updateUserSchema = joi.object({
  first_name: joi.string().min(1).max(100).trim(),
  last_name: joi.string().min(1).max(100).trim(),
  bio_url: joi.string().uri(), // TODO: stricter validation?
  user_type: joi.string().valid('student', 'instructor'),
  organization_id: joi.number().integer(),
  add_organization_name: joi.string().max(100),
  verify_status: joi.string().trim(),
});
