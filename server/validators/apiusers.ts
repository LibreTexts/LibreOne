import joi from 'joi';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import { passwordStrengthOptions } from '../../passwordstrength';
import { API_USERS_PERMISSIONS } from '@server/controllers/APIUserController';
import { isAPIUserPermission } from '@server/types/apiusers';

export const createAPIUserSchema = joi.object({
  username: joi.string().min(5).max(50).trim().required(),
  password: joi.string().custom((password, helper) => {
    zxcvbnOptions.setOptions(passwordStrengthOptions);
    const results = zxcvbn(password);
    if (process.env.NODE_ENV !== 'test' && results.score < 4) {
      return helper.error('any.invalid');
    }
    return password;
  }).required(),
  permissions: joi.array().items(joi.string()).custom((permissions: string[], helper) => {
    if (permissions?.length > API_USERS_PERMISSIONS.length) {
      return helper.error('array.max');      
    }

    let valid = true;
    permissions.forEach((perm: string) => {
      if (!isAPIUserPermission(perm) || !API_USERS_PERMISSIONS.includes(perm)) {
        valid = false;
      }
    });
    if (!valid) {
      return helper.error('any.invalid');
    }

    return Array.from(new Set(permissions));
  }).default([]),
});
