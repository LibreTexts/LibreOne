import joi from 'joi';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import { passwordStrengthOptions } from '../../passwordstrength';
import { TimeZone } from '../models';

export const passwordValidator = joi.string().custom((password, helper) => {
  zxcvbnOptions.setOptions(passwordStrengthOptions);
  const results = zxcvbn(password);
  if (results.score < 3) {
    return helper.error('any.invalid');
  }
  return password;
});

export const timeZoneValidator = joi.string().external(async (input) => {
  if (input === undefined) {
    // key was not provided
    return;
  }
  const found = await TimeZone.findOne({ where: { value: input } });
  if (!found) {
    throw new joi.ValidationError(
      'Invalid time zone',
      [{
        type: 'string.base',
        message: 'Invalid time zone',
        path: ['time_zone'],
        context: {
          key: 'time_zone',
          label: 'time_zone',
          value: input,
        },
      }],
      input,
    );
  }
});
