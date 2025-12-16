import { z } from 'zod';
import { requiredStringLength, optionalStringLength } from './common';
import { validationMessages } from './validationHelpers';

/**
 * Exam Paper Template File validation schemas
 */

export const examPaperTemplateFileSchema = z.object({
  name: requiredStringLength(255, 'Name'),
  description: optionalStringLength(1000, 'Description'),
  language: z.enum(['en', 'ps', 'fa', 'ar'] as const),
  templateHtml: requiredStringLength(50000, 'Template HTML'),
  cssStyles: optionalStringLength(10000, 'CSS Styles'),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

/**
 * Type for exam paper template file form data
 */
export type ExamPaperTemplateFileFormData = z.infer<typeof examPaperTemplateFileSchema>;

