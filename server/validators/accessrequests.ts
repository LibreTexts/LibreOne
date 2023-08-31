import joi from 'joi';
import { accessRequestEffects, accessRequestStatuses } from '../controllers/AccessRequestController';

export const accessRequestIDValidator = joi.number().integer();

export const accessRequestIDParamSchema = joi.object({
  accessRequestID: accessRequestIDValidator.required(),
});

export const createAccessRequestSchema = joi.object({
  applications: joi.array().items(joi.number().integer()).required(),
});

export const getAllAccessRequestsSchema = joi.object({
  offset: joi.number().integer().min(0).default(0),
  limit: joi.number().integer().min(1).default(100),
  status: joi.string().valid(...accessRequestStatuses),
});

export const updateAccessRequestSchema = joi.object({
  effect: joi.string().valid(accessRequestEffects).required(),
  reason: joi.string().max(255),
  approved: joi.array().items(joi.number().integer()),
});
