import joi from 'joi';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import { applicationIDValidator } from './applications';
import { orgIDValidator } from './organizations';
import { passwordStrengthOptions } from '../../passwordstrength';
import { UserOrganizationAdminRoleEnum } from '../controllers/PermissionsController';

const uuidValidator = joi.string().uuid({ version: 'uuidv4' }).required();

export const uuidParamSchema = joi.object({
  uuid: uuidValidator,
});

export const uuidApplicationIDParamsSchema = joi.object({
  uuid: uuidValidator,
  applicationID: applicationIDValidator,
});

export const uuidOrgIDParamsSchema = joi.object({
  uuid: uuidValidator,
  orgID: orgIDValidator,
});

export const createUserApplicationSchema = joi.object({
  application_id: applicationIDValidator,
});

export const createUserOrganizationSchema = joi.object({
  organization_id: joi.number().integer(),
  add_organization_name: joi.string().max(100),
});

export const createUserEmailChangeRequestSchema = joi.object({
  email: joi.string().email().required(),
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
  verify_status: joi.string().trim(),
});

export const updateUserEmailSchema = joi.object({
  code: joi.number().integer().min(100000).max(999999).required(),
  email: joi.string().email().required(),
});

export const updateUserOrganizationAdminRoleSchema = joi.object({
  admin_role: joi.string().valid(...Object.keys(UserOrganizationAdminRoleEnum)).required(),
});

export const updateUserPasswordSchema = joi.object({
  old_password: joi.string().min(1).required(),
  new_password: joi.string().custom((password, helper) => {
    zxcvbnOptions.setOptions(passwordStrengthOptions);
    const results = zxcvbn(password);
    if (results.score < 3) {
      return helper.error('any.invalid');
    }
    return password;
  }),
});
