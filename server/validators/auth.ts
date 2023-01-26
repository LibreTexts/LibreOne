import joi from 'joi';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import { passwordStrengthOptions } from '../../passwordstrength';

export const registerSchema = joi.object({
  email: joi.string().email().required(),
  password: joi.string().custom((password, helper) => {
    zxcvbnOptions.setOptions(passwordStrengthOptions);
    const results = zxcvbn(password);
    if (results.score < 3) {
      return helper.error('any.invalid');
    }
    return password;
  }),
});

export const verifyEmailSchema = joi.object({
  email: joi.string().email().required(),
  code: joi.number().integer().min(100000).max(999999).required(),
});

export const initLoginQuerySchema = joi.object({
  redirectURI: joi.string().uri({ relativeOnly: true }),
});

export const completeLoginSchema = joi.object({
  ticket: joi.string().required(),
});

export const initResetPasswordSchema = joi.object({
  email: joi.string().email().required(),
  redirectURI: joi.string().uri(),
});

export const resetPasswordSchema = joi.object({
  token: joi.string().length(64).required(),
  password: joi.string().custom((password, helper) => {
    zxcvbnOptions.setOptions(passwordStrengthOptions);
    const results = zxcvbn(password);
    if (results.score < 3) {
      return helper.error('any.invalid');
    }
    return password;
  }),
});
