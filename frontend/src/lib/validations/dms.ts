import { z } from 'zod';
import { optionalUuidSchema, requiredStringLength, optionalStringLength } from './common';
import { validationMessages } from './validationHelpers';

/**
 * Letter type enum
 */
export const letterTypeSchema = z.enum([
  'application',
  'moe_letter',
  'parent_letter',
  'announcement',
  'official',
  'student_letter',
  'staff_letter',
  'general',
]);

/**
 * Template variable schema
 */
export const templateVariableSchema = z.object({
  name: z.string().min(1, 'Variable name is required').max(50, 'Variable name must be 50 characters or less'),
  label: z.string().optional(),
  type: z.enum(['text', 'date', 'number', 'boolean']).optional().default('text'),
  default: z.string().optional(),
  required: z.boolean().optional().default(false),
  description: z.string().optional(),
});

/**
 * Field position schema
 */
export const fieldPositionSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  fontSize: z.number().min(8).max(72).optional(),
  fontFamily: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  color: z.string().optional(),
  width: z.number().min(0).max(100).optional(),
  height: z.number().min(0).max(100).optional(),
  maxWidth: z.number().min(0).max(100).optional(),
});

/**
 * Letter template validation schema
 */
export const letterTemplateSchema = z.object({
  name: requiredStringLength(255, 'Name'),
  category: requiredStringLength(50, 'Category'),
  letterhead_id: optionalUuidSchema,
  watermark_id: optionalUuidSchema,
  letter_type: letterTypeSchema.optional().nullable(),
  body_text: z.string().optional().nullable(),
  variables: z.array(templateVariableSchema).optional().nullable(),
  supports_tables: z.boolean().optional().default(false),
  table_structure: z.record(z.any()).optional().nullable(),
  field_positions: z.record(fieldPositionSchema).optional().nullable(),
  default_security_level_key: optionalStringLength(50, 'Security level'),
  page_layout: z.string().optional().default('A4_portrait'),
  repeat_letterhead_on_pages: z.boolean().optional().default(true),
  is_mass_template: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
  school_id: optionalUuidSchema,
});

export type LetterTemplateFormData = z.infer<typeof letterTemplateSchema>;

/**
 * Letterhead validation schema
 */
export const letterheadSchema = z.object({
  name: requiredStringLength(255, 'Name'),
  file: z.instanceof(File).optional(), // Only required on create
  file_type: z.enum(['pdf', 'image', 'html']).optional().default('image'),
  letterhead_type: z.enum(['background', 'watermark']).optional().default('background'),
  letter_type: letterTypeSchema.optional().nullable(),
  active: z.boolean().optional().default(true),
  school_id: optionalUuidSchema,
});

export type LetterheadFormData = z.infer<typeof letterheadSchema>;

/**
 * Template preview variables schema
 */
export const templatePreviewVariablesSchema = z.record(z.string());

export type TemplatePreviewVariables = z.infer<typeof templatePreviewVariablesSchema>;
