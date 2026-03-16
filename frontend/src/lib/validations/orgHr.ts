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

const orgHrCompensationBaseSchema = z.object({
  staff_id: uuidSchema,
  base_salary: z.number().min(0, 'Base salary must be at least 0'),
  pay_frequency: z.enum(['monthly', 'semi_monthly', 'semimonthly', 'biweekly', 'weekly', 'daily', 'annually']),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  grade: z.string().max(50).optional().nullable(),
  step: z.string().max(50).optional().nullable(),
  effective_from: z.string().min(1, validationMessages.fieldRequired('Effective from')),
  effective_to: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
  legacy_salary_notes: z.string().optional().nullable(),
});

export const orgHrCompensationCreateSchema = orgHrCompensationBaseSchema.refine(
  (data) => {
    if (data.effective_to && data.effective_from) {
      return new Date(data.effective_to) >= new Date(data.effective_from);
    }
    return true;
  },
  { message: 'Effective to date must be on or after effective from date', path: ['effective_to'] }
);

export const orgHrCompensationUpdateSchema = orgHrCompensationBaseSchema.partial().extend({
  staff_id: uuidSchema.optional(),
});

export const orgHrPayrollPeriodCreateSchema = z.object({
  name: z.string().min(1, validationMessages.fieldRequired('Name')).max(80),
  period_start: z.string().min(1, validationMessages.fieldRequired('Period start')),
  period_end: z.string().min(1, validationMessages.fieldRequired('Period end')),
  pay_date: z.string().optional().nullable(),
}).refine(
  (data) => new Date(data.period_end) >= new Date(data.period_start),
  { message: 'Period end must be on or after period start', path: ['period_end'] }
);

export const orgHrPayrollRunCreateSchema = z.object({
  payroll_period_id: uuidSchema,
  run_name: z.string().max(100).optional().nullable(),
});

export type OrgHrAssignmentCreateFormData = z.infer<typeof orgHrAssignmentCreateSchema>;
export type OrgHrAssignmentUpdateFormData = z.infer<typeof orgHrAssignmentUpdateSchema>;
export type OrgHrCompensationCreateFormData = z.infer<typeof orgHrCompensationCreateSchema>;
export type OrgHrCompensationUpdateFormData = z.infer<typeof orgHrCompensationUpdateSchema>;
export type OrgHrPayrollPeriodCreateFormData = z.infer<typeof orgHrPayrollPeriodCreateSchema>;
export type OrgHrPayrollRunCreateFormData = z.infer<typeof orgHrPayrollRunCreateSchema>;
