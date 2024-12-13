import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import { passwordStrengthOptions } from '../../passwordstrength';

export const getPasswordStrength = (password: string) => {
  zxcvbnOptions.setOptions(passwordStrengthOptions);
  return zxcvbn(password).score;
};

export const ADAPT_SPECIAL_ROLES = ['instructor', 'grader', 'question-editor', 'tester'];