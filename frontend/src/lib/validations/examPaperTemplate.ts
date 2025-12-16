import { z } from 'zod';
import { uuidSchema, optionalUuidSchema, requiredStringLength, optionalStringLength } from './common';
import { validationMessages } from './validationHelpers';

/**
 * Exam Paper Template validation schemas
 */

// UUID regex pattern
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Helper to validate required UUID fields
const requiredUuidSchema = (fieldName: string) => 
  z.string()
    .refine(
      (val) => {
        if (!val || val.trim() === '') {
          return false;
        }
        return uuidRegex.test(val);
      },
      { message: validationMessages.fieldRequired(fieldName) }
    );

export const examPaperTemplateSchema = z.object({
  schoolId: requiredUuidSchema('School'),
  academicYearId: requiredUuidSchema('Academic Year'),
  classAcademicYearId: requiredUuidSchema('Class'),
  subjectId: requiredUuidSchema('Subject'),
  examId: optionalUuidSchema.nullable(),
  examSubjectId: optionalUuidSchema.nullable(),
  templateFileId: optionalUuidSchema.nullable(),
  title: requiredStringLength(255, 'Title'),
  language: z.enum(['en', 'ps', 'fa', 'ar'] as const),
  totalMarks: z.coerce.number().min(0).optional().nullable(),
  durationMinutes: z.coerce
    .number({ required_error: validationMessages.fieldRequired('Duration') })
    .min(1, 'Duration must be at least 1 minute')
    .max(600, 'Duration must be 600 minutes or less'),
  headerHtml: optionalStringLength(5000, 'Header HTML'),
  footerHtml: optionalStringLength(5000, 'Footer HTML'),
  instructions: optionalStringLength(2000, 'Instructions'),
  isDefaultForExamSubject: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

/**
 * Type for exam paper template form data
 */
export type ExamPaperTemplateFormData = z.infer<typeof examPaperTemplateSchema>;

