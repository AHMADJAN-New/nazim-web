import { z } from 'zod';
import { optionalUuidSchema, optionalStringLength, requiredStringLength } from './common';
import { validationMessages } from './validationHelpers';

/**
 * Educational history validation schema
 * Matches backend StoreStudentEducationalHistoryRequest validation rules
 */
export const educationalHistorySchema = z.object({
  institution_name: requiredStringLength(255, 'Institution name'),
  organization_id: optionalUuidSchema,
  school_id: optionalUuidSchema,
  academic_year: optionalStringLength(20, 'Academic year'),
  grade_level: optionalStringLength(50, 'Grade level'),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  achievements: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine(
  (data) => {
    // If both dates are provided, end_date must be >= start_date
    if (data.start_date && data.end_date) {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      return end >= start;
    }
    return true;
  },
  {
    message: validationMessages.endDateAfterStart(),
    path: ['end_date'],
  }
);

export type EducationalHistoryFormData = z.infer<typeof educationalHistorySchema>;

