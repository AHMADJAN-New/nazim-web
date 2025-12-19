import { z } from 'zod';
import { optionalStringLength, requiredStringLength, uuidSchema, optionalUuidSchema, dateStringSchema } from './common';

export const feeStructureSchema = z.object({
  academic_year_id: uuidSchema,
  name: requiredStringLength(255, 'Name'),
  code: optionalStringLength(50, 'Code'),
  description: optionalStringLength(2000, 'Description'),
  fee_type: z.enum(['one_time', 'monthly', 'quarterly', 'semester', 'annual', 'custom']),
  amount: z.number().positive('Amount must be greater than 0'),
  currency_id: optionalUuidSchema,
  due_date: dateStringSchema,
  start_date: dateStringSchema,
  end_date: dateStringSchema.optional().nullable().or(z.literal('')),
  class_id: optionalUuidSchema,
  class_academic_year_id: optionalUuidSchema,
  is_active: z.boolean().optional(),
  is_required: z.boolean().optional(),
  display_order: z
    .preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z.number().int().optional(),
    )
    .optional(),
  school_id: optionalUuidSchema,
});

export type FeeStructureFormData = z.infer<typeof feeStructureSchema>;

export const feeAssignmentSchema = z.object({
  fee_structure_id: uuidSchema,
  academic_year_id: uuidSchema,
  class_id: uuidSchema,
  class_academic_year_id: optionalUuidSchema.or(z.literal('')),
  assigned_amount: z.number().nonnegative().optional(),
  due_date: requiredStringLength(20, 'Due date'),
  payment_period_start: dateStringSchema.optional().nullable(),
  payment_period_end: dateStringSchema.optional().nullable(),
  notes: optionalStringLength(2000, 'Notes'),
  school_id: optionalUuidSchema.or(z.literal('')),
}).refine(
  (data) => {
    if (!data.payment_period_start || !data.payment_period_end) return true;
    const start = new Date(data.payment_period_start);
    const end = new Date(data.payment_period_end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return true;
    return end >= start;
  },
  {
    message: 'The payment period end must be a date after or equal to payment period start.',
    path: ['payment_period_end'],
  },
);

export type FeeAssignmentFormData = z.infer<typeof feeAssignmentSchema>;

export const feePaymentSchema = z.object({
  fee_assignment_id: uuidSchema,
  student_id: optionalUuidSchema.or(z.literal('')),
  student_admission_id: optionalUuidSchema.or(z.literal('')),
  amount: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
      }
      return typeof val === 'number' ? val : 0;
    },
    z.number().positive('Amount must be greater than 0')
  ),
  currency_id: optionalUuidSchema.or(z.literal('')),
  payment_date: z.string().min(1, 'Payment date is required'),
  payment_method: z.enum(['cash', 'bank_transfer', 'cheque', 'other']),
  reference_no: optionalStringLength(100, 'Reference').or(z.literal('')),
  account_id: uuidSchema,
  received_by_user_id: optionalUuidSchema.or(z.literal('')),
  notes: optionalStringLength(2000, 'Notes').or(z.literal('')),
  school_id: optionalUuidSchema.or(z.literal('')),
});

export type FeePaymentFormData = z.infer<typeof feePaymentSchema>;

export const feeExceptionSchema = z.object({
  fee_assignment_id: uuidSchema,
  student_id: uuidSchema, // Required by backend
  exception_type: z.enum(['discount_percentage', 'discount_fixed', 'waiver', 'custom']),
  exception_amount: z.number().nonnegative(),
  exception_reason: requiredStringLength(2000, 'Reason'),
  approved_by_user_id: uuidSchema, // Required by backend
  approved_at: dateStringSchema.optional().nullable(),
  valid_from: z.string().min(1, 'Valid from date is required'),
  valid_to: dateStringSchema.optional().nullable(),
  is_active: z.boolean().optional(),
  notes: optionalStringLength(2000, 'Notes'),
  organization_id: uuidSchema, // Required by backend
}).refine(
  (data) => {
    if (!data.valid_from || !data.valid_to) return true;
    const from = new Date(data.valid_from);
    const to = new Date(data.valid_to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return true;
    return to >= from;
  },
  {
    message: 'Valid to date must be after or equal to valid from date.',
    path: ['valid_to'],
  }
);

export type FeeExceptionFormData = z.infer<typeof feeExceptionSchema>;

