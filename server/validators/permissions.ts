import joi from 'joi';
import { PermissionsActionsEnum, PermissionsResourcesEnum } from '../controllers/PermissionsController';

export const checkPermissionSchema = joi.object({
  userUUID: joi.string().uuid({ version: 'uuidv4' }).required(),
  resourceType: joi.string().required().valid(...Object.values(PermissionsResourcesEnum)),
  resourceID: joi.alternatives().try(joi.string(), joi.number().integer()),
  action: joi.string().required().valid(...Object.values(PermissionsActionsEnum)),
});
