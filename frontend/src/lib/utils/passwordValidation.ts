/**
 * Password validation utility
 * Extracted from useSecureAuth
 */

import { validationMessages } from '@/lib/validations/validationHelpers';

export const validatePasswordStrength = (password: string): string[] => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push(validationMessages.passwordMinLength());
  }

  if (!/[A-Z]/.test(password)) {
    errors.push(validationMessages.passwordUppercase());
  }

  if (!/[a-z]/.test(password)) {
    errors.push(validationMessages.passwordLowercase());
  }

  if (!/\d/.test(password)) {
    errors.push(validationMessages.passwordNumber());
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push(validationMessages.passwordSpecial());
  }

  return errors;
};
