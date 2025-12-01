import { z } from 'zod';
import { optionalUuidSchema, optionalStringLength, requiredStringLength } from './common';

/**
 * Discipline record validation schema
 * Matches backend StoreStudentDisciplineRecordRequest validation rules
 */
export const disciplineRecordSchema = z.object({
  incident_date: z.string().min(1, 'Incident date is required'),
  incident_type: requiredStringLength(100, 'Incident type'),
  organization_id: optionalUuidSchema,
  school_id: optionalUuidSchema,
  description: z.string().optional().nullable(),
  severity: z.enum(['minor', 'moderate', 'major', 'severe']).optional().nullable(),
  action_taken: z.string().optional().nullable(),
  resolved: z.boolean().default(false),
  resolved_date: z.string().optional().nullable(),
});

export type DisciplineRecordFormData = z.infer<typeof disciplineRecordSchema>;

