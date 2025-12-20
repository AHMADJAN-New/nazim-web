import { z } from 'zod';
import { uuidSchema, optionalUuidSchema } from './common';

/**
 * Graduation Batch Validation Schema
 * 
 * Validates all fields for creating/updating graduation batches including:
 * - Final year graduation
 * - Promotion (class to class)
 * - Transfer (class to class)
 * - Exam weights (when multiple exams)
 * - Attendance requirements
 */
export const graduationBatchSchema = z
  .object({
    graduation_type: z.enum(['final_year', 'promotion', 'transfer'], {
      errorMap: () => ({ message: 'Invalid graduation type' }),
    }),
    school_id: uuidSchema,
    academic_year_id: uuidSchema,
    class_id: uuidSchema,
    from_class_id: optionalUuidSchema,
    to_class_id: optionalUuidSchema,
    exam_ids: z
      .array(uuidSchema)
      .min(1, 'At least one exam must be selected'),
    exam_weights: z
      .record(z.string(), z.number().min(0).max(100))
      .optional()
      .nullable(),
    graduation_date: z.string().min(1, 'Graduation date is required'),
    min_attendance_percentage: z
      .number()
      .min(0, 'Minimum attendance percentage must be between 0 and 100')
      .max(100, 'Minimum attendance percentage must be between 0 and 100')
      .optional()
      .nullable(),
    require_attendance: z.boolean().optional().default(true),
    exclude_approved_leaves: z.boolean().optional().default(true),
  })
  .refine(
    (data) => {
      // For promotion and transfer, from_class_id and to_class_id are required
      if (data.graduation_type === 'promotion' || data.graduation_type === 'transfer') {
        return !!data.from_class_id && !!data.to_class_id;
      }
      return true;
    },
    {
      message: 'From class and To class are required for promotion and transfer types',
      path: ['from_class_id'],
    }
  )
  .refine(
    (data) => {
      // For transfer, to_class_id must differ from from_class_id
      if (data.graduation_type === 'transfer') {
        return data.from_class_id !== data.to_class_id;
      }
      return true;
    },
    {
      message: 'From and To classes must be different for transfer type',
      path: ['to_class_id'],
    }
  )
  .refine(
    (data) => {
      // If exam_weights provided, they must sum to 100
      if (data.exam_weights && Object.keys(data.exam_weights).length > 0) {
        const total = Object.values(data.exam_weights).reduce((sum, weight) => sum + weight, 0);
        return Math.abs(total - 100) < 0.01; // Allow small floating point differences
      }
      return true;
    },
    {
      message: 'Exam weights must sum to 100%',
      path: ['exam_weights'],
    }
  )
  .refine(
    (data) => {
      // If exam_weights provided, all exam_ids must have weights
      if (data.exam_weights && Object.keys(data.exam_weights).length > 0) {
        return data.exam_ids.every((examId) => examId in data.exam_weights!);
      }
      return true;
    },
    {
      message: 'All selected exams must have weights assigned',
      path: ['exam_weights'],
    }
  );

export type GraduationBatchFormData = z.infer<typeof graduationBatchSchema>;

