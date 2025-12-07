/**
 * Validation helper functions that use translations
 * These functions get the current language and return translated validation messages
 */

import { t, type Language } from '@/lib/i18n';

/**
 * Get current language from localStorage or default to 'en'
 */
function getCurrentLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem('nazim-language');
  const lang = (saved as Language) || 'en';
  return ['en', 'ps', 'fa', 'ar'].includes(lang) ? lang : 'en';
}

/**
 * Get translated validation message
 */
export function getValidationMessage(key: string, params?: Record<string, string | number>): string {
  const lang = getCurrentLanguage();
  return t(key, lang, params);
}

/**
 * Validation message helpers
 */
export const validationMessages = {
  invalidUuid: () => getValidationMessage('validation.invalidUuid'),
  invalidEmail: () => getValidationMessage('validation.invalidEmail'),
  phoneMaxLength: () => getValidationMessage('validation.phoneMaxLength'),
  fieldMaxLength: (fieldName: string, max: number) => 
    getValidationMessage('validation.fieldMaxLength', { fieldName, max }),
  fieldRequired: (fieldName: string) => 
    getValidationMessage('validation.fieldRequired', { fieldName }),
  incidentDateRequired: () => getValidationMessage('validation.incidentDateRequired'),
  endDateAfterStart: () => getValidationMessage('validation.endDateAfterStart'),
  fileRequired: () => getValidationMessage('validation.fileRequired'),
  fileSizeMax: (maxMB: number) => 
    getValidationMessage('validation.fileSizeMax', { maxMB }),
  fileTypeInvalid: (types: string) => 
    getValidationMessage('validation.fileTypeInvalid', { types }),
  currentPasswordRequired: () => getValidationMessage('validation.currentPasswordRequired'),
  passwordMinLength: () => getValidationMessage('validation.passwordMinLength'),
  passwordUppercase: () => getValidationMessage('validation.passwordUppercase'),
  passwordLowercase: () => getValidationMessage('validation.passwordLowercase'),
  passwordNumber: () => getValidationMessage('validation.passwordNumber'),
  passwordSpecial: () => getValidationMessage('validation.passwordSpecial'),
  passwordConfirmationRequired: () => getValidationMessage('validation.passwordConfirmationRequired'),
  passwordsDoNotMatch: () => getValidationMessage('validation.passwordsDoNotMatch'),
  ageMin: (min: number) => getValidationMessage('validation.ageMin', { min }),
  ageMax: () => getValidationMessage('validation.ageMax'),
  invalidClassInstance: () => getValidationMessage('validation.invalidClassInstance'),
  invalidSubject: () => getValidationMessage('validation.invalidSubject'),
  invalidTeacher: () => getValidationMessage('validation.invalidTeacher'),
  invalidScheduleSlot: () => getValidationMessage('validation.invalidScheduleSlot'),
  invalidScheduleSlotId: () => getValidationMessage('validation.invalidScheduleSlotId'),
  teacherRequired: () => getValidationMessage('validation.teacherRequired'),
  atLeastOneEntryRequired: () => getValidationMessage('validation.atLeastOneEntryRequired'),
};

