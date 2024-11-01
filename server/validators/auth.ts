import joi from 'joi';
import { passwordValidator, timeZoneValidator } from './shared';

export const registerSchema = joi.object({
  email: joi.string().email().required(),
  password: passwordValidator,
});

export const autoProvisionUserSchema = joi.object({
  email: joi.string().email().required(),
  first_name: joi.string().min(1).max(100).trim().required(),
  last_name: joi.string().min(1).max(100).trim().required(),
  user_type: joi.string().valid('student', 'instructor').required(),
  time_zone: timeZoneValidator.required(),
});

export const verifyEmailSchema = joi.object({
  email: joi.string().email().required(),
  code: joi.number().integer().min(100000).max(999999).required(),
});

export const initLoginQuerySchema = joi.object({
  redirectURI: joi.string().uri({ relativeOnly: true }),
  redirectCASServiceURI: joi.string().uri(),
  casInitSSOSession: joi.boolean(),
  tryGateway: joi.boolean(),
});

export const completeLoginSchema = joi.object({
  ticket: joi.string(),
});

export const completeRegistrationSchema = joi.object({
  source: joi.string().valid('adapt-registration').optional(),
});

export const initResetPasswordSchema = joi.object({
  email: joi.string().email().required(),
  redirectURI: joi.string().uri(),
});

export const resetPasswordSchema = joi.object({
  token: joi.string().length(64).required(),
  password: passwordValidator,
});
