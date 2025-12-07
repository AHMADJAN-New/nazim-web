import { z } from 'zod';
import { validationMessages } from './validationHelpers';

/**
 * Common validation utilities and reusable schemas
 */

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid(validationMessages.invalidUuid());

/**
 * Optional UUID validation
 */
export const optionalUuidSchema = uuidSchema.optional().nullable();

/**
 * Email validation
 */
export const emailSchema = z.string().email(validationMessages.invalidEmail());

/**
 * Optional email validation (allows empty string or null)
 */
export const optionalEmailSchema = emailSchema.optional().nullable().or(z.literal(''));

/**
 * Phone number validation (flexible format for international numbers)
 */
export const phoneSchema = z.string()
  .max(30, validationMessages.phoneMaxLength())
  .optional()
  .nullable();

/**
 * Date string validation
 */
export const dateStringSchema = z.string().optional().nullable();

/**
 * String length validator factory
 */
export const stringLength = (max: number, fieldName?: string) => 
  z.string().max(max, validationMessages.fieldMaxLength(fieldName || 'Field', max));

/**
 * Required string length validator factory
 */
export const requiredStringLength = (max: number, fieldName?: string) =>
  z.string()
    .min(1, validationMessages.fieldRequired(fieldName || 'Field'))
    .max(max, validationMessages.fieldMaxLength(fieldName || 'Field', max));

/**
 * Optional string length validator factory
 */
export const optionalStringLength = (max: number, fieldName?: string) =>
  stringLength(max, fieldName).optional().nullable();

