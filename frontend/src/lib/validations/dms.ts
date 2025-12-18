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
 * Positioned block styles schema
 */
export const positionedBlockStylesSchema = z.object({
  fontFamily: z.string().default('Bahij Nassim'),
  fontSize: z.number().min(8).max(72).default(14),
  fontWeight: z.string().default('normal'),
  color: z.string().default('#000000'),
  textAlign: z.enum(['left', 'center', 'right']).default('right'),
  direction: z.enum(['ltr', 'rtl']).default('rtl'),
  lineHeight: z.number().min(1).max(3).default(1.5),
  backgroundColor: z.string().optional(),
  border: z.string().optional(),
  padding: z.string().optional(),
});

/**
 * Positioned block schema
 */
export const positionedBlockSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['text', 'variable', 'static']),
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().min(1),
  height: z.number().min(1),
  content: z.string().optional().default(''),
  variableName: z.string().optional(),
  styles: positionedBlockStylesSchema,
});

/**
 * Letter template validation schema
 */
export const letterTemplateSchema = z.object({
  name: requiredStringLength(255, 'Name'),
  category: requiredStringLength(50, 'Category'),
  letterhead_id: optionalUuidSchema,
  letter_type: letterTypeSchema.optional().nullable(),
  body_html: z.string().optional().nullable(),
  template_file_path: optionalStringLength(255, 'Template file path'),
  template_file_type: z.enum(['html', 'word', 'pdf', 'image']).optional().default('html'),
  variables: z.array(templateVariableSchema).optional().nullable(),
  header_structure: z.record(z.any()).optional().nullable(),
  field_positions: z.array(positionedBlockSchema).optional().nullable(),
  allow_edit_body: z.boolean().optional().default(false),
  default_security_level_key: optionalStringLength(50, 'Security level'),
  page_layout: z.string().optional().default('A4_portrait'),
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
  letter_type: letterTypeSchema.optional().nullable(),
  default_for_layout: z.string().optional().nullable(),
  position: z.enum(['header', 'background', 'watermark']).optional().default('header'),
  active: z.boolean().optional().default(true),
  school_id: optionalUuidSchema,
});

export type LetterheadFormData = z.infer<typeof letterheadSchema>;

/**
 * Template preview variables schema
 */
export const templatePreviewVariablesSchema = z.record(z.string());

export type TemplatePreviewVariables = z.infer<typeof templatePreviewVariablesSchema>;

