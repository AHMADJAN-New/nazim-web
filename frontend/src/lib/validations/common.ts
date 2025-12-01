import { z } from 'zod';

/**
 * Common validation utilities and reusable schemas
 */

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Optional UUID validation
 */
export const optionalUuidSchema = uuidSchema.optional().nullable();

/**
 * Email validation
 */
export const emailSchema = z.string().email('Invalid email address');

/**
 * Optional email validation (allows empty string or null)
 */
export const optionalEmailSchema = emailSchema.optional().nullable().or(z.literal(''));

/**
 * Phone number validation (flexible format for international numbers)
 */
export const phoneSchema = z.string()
  .max(30, 'Phone number must be 30 characters or less')
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
  z.string().max(max, `${fieldName || 'Field'} must be ${max} characters or less`);

/**
 * Required string length validator factory
 */
export const requiredStringLength = (max: number, fieldName?: string) =>
  z.string()
    .min(1, `${fieldName || 'Field'} is required`)
    .max(max, `${fieldName || 'Field'} must be ${max} characters or less`);

/**
 * Optional string length validator factory
 */
export const optionalStringLength = (max: number, fieldName?: string) =>
  stringLength(max, fieldName).optional().nullable();

