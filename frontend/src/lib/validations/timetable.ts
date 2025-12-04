import { z } from 'zod';
import { optionalUuidSchema, requiredStringLength, optionalStringLength } from './common';

/**
 * Timetable entry validation schema
 */
export const timetableEntrySchema = z.object({
  class_academic_year_id: z.string().uuid('Invalid class instance'),
  subject_id: z.string().uuid('Invalid subject'),
  teacher_id: z.string().uuid('Invalid teacher'),
  schedule_slot_id: z.string().uuid('Invalid schedule slot'),
  day_name: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'all_year']),
  period_order: z.number().int().min(0),
});

/**
 * Save timetable validation schema
 */
export const saveTimetableSchema = z.object({
  name: requiredStringLength(255, 'Name'),
  description: optionalStringLength(1000, 'Description'),
  timetable_type: z.string().default('teaching'),
  organization_id: optionalUuidSchema,
  academic_year_id: optionalUuidSchema,
  school_id: optionalUuidSchema,
  entries: z.array(timetableEntrySchema).min(1, 'At least one entry is required'),
});

export type SaveTimetableFormData = z.infer<typeof saveTimetableSchema>;

/**
 * Teacher preference validation schema
 */
export const teacherPreferenceSchema = z.object({
  teacher_id: z.string().uuid('Teacher is required'),
  schedule_slot_ids: z.array(z.string().uuid('Invalid schedule slot ID')),
  organization_id: optionalUuidSchema,
  academic_year_id: optionalUuidSchema,
  is_active: z.boolean().default(true),
});

export type TeacherPreferenceFormData = z.infer<typeof teacherPreferenceSchema>;

