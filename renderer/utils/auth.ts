import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import { passwordStrengthOptions } from '../../passwordstrength';

export const getPasswordStrength = (password: string) => {
  zxcvbnOptions.setOptions(passwordStrengthOptions);
  return zxcvbn(password).score;
};
