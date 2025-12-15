import { z } from 'zod';
import { uuidSchema, optionalUuidSchema, requiredStringLength, optionalStringLength } from './common';
import { validationMessages } from './validationHelpers';

/**
 * Question Bank validation schemas
 */

/**
 * Option schema for MCQ/True-False questions
 */
export const questionOptionSchema = z.object({
  key: requiredStringLength(10, 'Option key'),
  text: requiredStringLength(500, 'Option text'),
  isCorrect: z.boolean().default(false),
});

/**
 * Question form schema with proper validation
 * Questions are tied to academic year subjects of classes (class_subjects)
 */
// UUID regex pattern
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Helper to validate required UUID fields (allows empty initially, validates on submit)
// Uses z.string() with refine that only validates when value is provided
const requiredUuidSchema = (fieldName: string) => 
  z.string()
    .refine(
      (val) => {
        // Allow empty string initially (validation happens on submit)
        if (!val || val.trim() === '') {
          return false; // Will show "required" error on submit
        }
        // Validate UUID format when value is provided
        return uuidRegex.test(val);
      },
      { message: validationMessages.fieldRequired(fieldName) }
    );

export const questionSchema = z.object({
  schoolId: requiredUuidSchema('School'), // Auto-filled from profile.default_school_id
  academicYearId: requiredUuidSchema('Academic Year'), // Required: Academic Year
  classAcademicYearId: requiredUuidSchema('Class'), // Required: Class Academic Year
  classSubjectId: requiredUuidSchema('Subject'), // Required: Class Subject (subject assigned to class in academic year)
  type: z.enum(['mcq', 'short', 'descriptive', 'true_false', 'essay'] as const),
  difficulty: z.enum(['easy', 'medium', 'hard'] as const),
  marks: z.coerce
    .number({ required_error: validationMessages.fieldRequired('Marks') })
    .min(0.5, 'Marks must be at least 0.5')
    .max(100, 'Marks must be 100 or less'),
  text: requiredStringLength(2000, 'Question text'),
  textRtl: z.boolean().default(false),
  options: z.array(questionOptionSchema).optional().nullable(),
  correctAnswer: optionalStringLength(2000, 'Correct answer'),
  reference: optionalStringLength(255, 'Reference'),
  tags: z.array(z.string()).optional().nullable(),
  isActive: z.boolean().default(true),
})
  .refine(
    (data) => {
      // For MCQ and true_false, options array must not be empty
      if ((data.type === 'mcq' || data.type === 'true_false') && (!data.options || data.options.length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'At least one option is required for MCQ and True/False questions',
      path: ['options'],
    }
  )
  .refine(
    (data) => {
      // For MCQ and true_false, at least one option must be marked as correct
      if ((data.type === 'mcq' || data.type === 'true_false') && data.options) {
        const hasCorrectOption = data.options.some(opt => opt.isCorrect);
        return hasCorrectOption;
      }
      return true;
    },
    {
      message: 'At least one option must be marked as correct',
      path: ['options'],
    }
  );

/**
 * Type for question form data
 */
export type QuestionFormData = z.infer<typeof questionSchema>;

