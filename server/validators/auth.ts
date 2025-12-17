import joi from 'joi';
import { passwordValidator, timeZoneValidator } from './shared';
import { ADAPT_SPECIAL_ROLES } from '@renderer/utils/auth';

export const registerSchema = joi.object({
  email: joi.string().email().required(),
  password: passwordValidator,
});

export const externalProvisionUserSchema = joi.object({
  clientName: joi.string().required(),
  profileId: joi.string().required(),
  profileTypedId: joi.string().required(),
  principalId: joi.string().required(),
  profileAttributes: joi.object({
    at_hash: joi.string(),
    sub: joi.string(),
    email_verified: joi.boolean(),
    id_token: joi.string(),
    iss: joi.string(),
    given_name: joi.string(),
    picture: joi.string(),
    access_token: joi.string(),
    token_expiration_advance: joi.number(),
    aud: joi.array().items(joi.string()),
    azp: joi.string(),
    name: joi.string(),
    expiration: joi.number(),
    hd: joi.string(),
    exp: joi.string(),
    family_name: joi.string(),
    iat: joi.string(),
    email: joi.string(),
    preferred_username: joi.string(), // Microsoft AD may return this instead of email
  }).required(),
  principalAttributes: joi.object({
    at_hash: joi.array().items(joi.string()),
    sub: joi.array().items(joi.string()),
    email_verified: joi.array().items(joi.boolean()),
    id_token: joi.array().items(joi.string()),
    iss: joi.array().items(joi.string()),
    given_name: joi.array().items(joi.string()),
    picture: joi.array().items(joi.string()),
    access_token: joi.array().items(joi.string()),
    token_expiration_advance: joi.array().items(joi.number()),
    aud: joi.array().items(joi.string()),
    azp: joi.array().items(joi.string()),
    name: joi.array().items(joi.string()),
    expiration: joi.array().items(joi.number()),
    hd: joi.array().items(joi.string()),
    exp: joi.array().items(joi.string()),
    family_name: joi.array().items(joi.string()),
    iat: joi.array().items(joi.string()),
    email: joi.array().items(joi.string()),
    preferred_username: joi.array().items(joi.string()), // Microsoft AD may return this instead of email
  }).required(),
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
  adapt_role: joi.string().valid(...ADAPT_SPECIAL_ROLES).optional(),
});

export const initResetPasswordSchema = joi.object({
  email: joi.string().email().required(),
  redirectURI: joi.string().uri(),
});

export const resetPasswordSchema = joi.object({
  token: joi.string().length(64).required(),
  password: passwordValidator,
});
