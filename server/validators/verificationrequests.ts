import joi from 'joi';
import { verificationRequestEffects, verificationRequestStatuses } from '../controllers/VerificationRequestController';

export const verificationRequestIDValidator = joi.number().integer();

export const verificationRequestIDParamSchema = joi.object({
  verificationRequestID: verificationRequestIDValidator.required(),
});

export const getAllVerificationRequestsSchema = joi.object({
  offset: joi.number().integer().min(0).default(0),
  limit: joi.number().integer().min(1).default(100),
  status: joi.string().valid(...verificationRequestStatuses),
});

export const updateVerificationRequestSchema = joi.object({
  effect: joi.string().valid(...verificationRequestEffects).required(),
  reason: joi.string().max(255),
  approved_applications: joi.array().items(joi.number().integer()),
  library_access_option: joi.string().valid('all', 'default', 'specific').default('default'),
  libraries: joi.array().items(joi.number().integer()),
});
