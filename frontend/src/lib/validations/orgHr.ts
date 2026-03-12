import { z } from 'zod';

import { uuidSchema } from './common';
import { validationMessages } from './validationHelpers';

export const orgHrAssignmentCreateSchema = z.object({
  staff_id: uuidSchema,
  school_id: uuidSchema,
  role_title: z.string().max(120).optional().nullable(),
  allocation_percent: z.number().min(0, 'Allocation must be at least 0').max(100, 'Allocation cannot exceed 100%'),
  is_primary: z.boolean(),
  start_date: z.string().min(1, validationMessages.fieldRequired('Start date')),
  end_date: z.string().optional().nullable(),
  status: z.string().max(30).optional(),
  notes: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.end_date && data.start_date) {
      return new Date(data.end_date) >= new Date(data.start_date);
    }
    return true;
  },
  { message: 'End date must be on or after start date', path: ['end_date'] }
);

export const orgHrAssignmentUpdateSchema = z.object({
  role_title: z.string().max(120).optional().nullable(),
  allocation_percent: z.number().min(0).max(100).optional(),
  is_primary: z.boolean().optional(),
  end_date: z.string().optional().nullable(),
  status: z.enum(['active', 'ended', 'suspended']).optional(),
  notes: z.string().optional().nullable(),
});

export type OrgHrAssignmentCreateFormData = z.infer<typeof orgHrAssignmentCreateSchema>;
export type OrgHrAssignmentUpdateFormData = z.infer<typeof orgHrAssignmentUpdateSchema>;
