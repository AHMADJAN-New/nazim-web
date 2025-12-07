import { z } from 'zod';
import { optionalUuidSchema, requiredStringLength, optionalStringLength } from './common';
import { validationMessages } from './validationHelpers';

/**
 * Timetable entry validation schema
 */
export const timetableEntrySchema = z.object({
  class_academic_year_id: z.string().uuid(validationMessages.invalidClassInstance()),
  subject_id: z.string().uuid(validationMessages.invalidSubject()),
  teacher_id: z.string().uuid(validationMessages.invalidTeacher()),
  schedule_slot_id: z.string().uuid(validationMessages.invalidScheduleSlot()),
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
  entries: z.array(timetableEntrySchema).min(1, validationMessages.atLeastOneEntryRequired()),
});

export type SaveTimetableFormData = z.infer<typeof saveTimetableSchema>;

/**
 * Teacher preference validation schema
 */
export const teacherPreferenceSchema = z.object({
  teacher_id: z.string().uuid(validationMessages.teacherRequired()),
  schedule_slot_ids: z.array(z.string().uuid(validationMessages.invalidScheduleSlotId())),
  organization_id: optionalUuidSchema,
  academic_year_id: optionalUuidSchema,
  is_active: z.boolean().default(true),
});

export type TeacherPreferenceFormData = z.infer<typeof teacherPreferenceSchema>;

