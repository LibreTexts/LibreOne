import joi from 'joi';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import { passwordStrengthOptions } from '../../passwordstrength';
import { TimeZone } from '../models';
import { normalizeEmail } from '../../email';

/**
 * Validates an email address after rewriting it into its canonical form. Joi applies
 * rules in the order they are chained, so the value reaching `.email()` (and reaching
 * the controller, since `validate()` assigns the validated result back onto the
 * request) is already trimmed, NFC-normalized, and lowercased.
 */
export const emailValidator = joi.string()
  .custom((value) => normalizeEmail(value))
  .email({ minDomainSegments: 2 })
  .max(255);

/**
 * Validates a CAS-supplied username, which may be an email address, a LibreOne UUID, or
 * an external identity provider's subject ID. Only the email shape is normalized, since
 * subject IDs are opaque and may be case-sensitive at the provider.
 */
export const principalUsernameValidator = joi.string()
  .custom((value) => (value.includes('@') ? normalizeEmail(value) : value.trim()))
  .min(1)
  .max(255);

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
