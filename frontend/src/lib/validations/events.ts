import { z } from 'zod';
import {
  uuidSchema,
  optionalUuidSchema,
  requiredStringLength,
  optionalStringLength,
  phoneSchema,
} from './common';

/**
 * Event Status enum
 */
export const eventStatusSchema = z.enum(['draft', 'published', 'completed', 'cancelled']);

/**
 * Guest Type enum
 */
export const guestTypeSchema = z.enum(['student', 'parent', 'teacher', 'staff', 'vip', 'external']);

/**
 * Guest Status enum
 */
export const guestStatusSchema = z.enum(['invited', 'checked_in', 'blocked']);

/**
 * Field Type enum
 */
export const fieldTypeSchema = z.enum([
  'text',
  'textarea',
  'phone',
  'number',
  'select',
  'multiselect',
  'date',
  'toggle',
  'email',
  'id_number',
  'address',
  'photo',
  'file',
]);

/**
 * Field Option schema (for select/multiselect)
 */
export const fieldOptionSchema = z.object({
  value: z.string().min(1, 'Value is required'),
  label: z.string().min(1, 'Label is required'),
});

/**
 * Field Validation Rules schema
 */
export const fieldValidationRulesSchema = z.object({
  min_length: z.number().optional(),
  max_length: z.number().optional(),
  pattern: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
}).optional().nullable();

/**
 * Event Type Field schema
 */
export const eventTypeFieldSchema = z.object({
  id: z.string().optional(),
  field_group_id: optionalUuidSchema,
  key: z.string()
    .min(1, 'Key is required')
    .max(50, 'Key must be at most 50 characters')
    .regex(/^[a-z][a-z0-9_]*$/, 'Key must start with letter and contain only lowercase letters, numbers, and underscores'),
  label: requiredStringLength(100, 'Label'),
  field_type: fieldTypeSchema,
  is_required: z.boolean().default(false),
  is_enabled: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
  placeholder: optionalStringLength(255, 'Placeholder'),
  help_text: optionalStringLength(255, 'Help text'),
  validation_rules: fieldValidationRulesSchema,
  options: z.array(fieldOptionSchema).optional().nullable(),
});

/**
 * Event Type Field Group schema
 */
export const eventTypeFieldGroupSchema = z.object({
  id: z.string().optional(),
  title: requiredStringLength(100, 'Title'),
  sort_order: z.number().int().min(0).default(0),
});

/**
 * Create Event Type schema
 */
export const createEventTypeSchema = z.object({
  name: requiredStringLength(100, 'Name'),
  school_id: uuidSchema,
  description: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

/**
 * Update Event Type schema
 */
export const updateEventTypeSchema = z.object({
  name: requiredStringLength(100, 'Name').optional(),
  school_id: uuidSchema.optional(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

/**
 * Save Fields Request schema (for form designer)
 */
export const saveFieldsSchema = z.object({
  field_groups: z.array(eventTypeFieldGroupSchema),
  fields: z.array(eventTypeFieldSchema),
});

/**
 * Create Event schema
 */
export const createEventSchema = z.object({
  title: requiredStringLength(200, 'Title'),
  school_id: uuidSchema,
  event_type_id: optionalUuidSchema,
  starts_at: z.string().min(1, 'Start date is required'),
  ends_at: z.string().optional().nullable(),
  venue: optionalStringLength(255, 'Venue'),
  capacity: z.number().int().min(0).optional().nullable(),
  status: eventStatusSchema.default('draft'),
}).refine(
  (data) => {
    if (data.ends_at && data.starts_at) {
      return new Date(data.ends_at) > new Date(data.starts_at);
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['ends_at'],
  }
);

/**
 * Update Event schema
 */
export const updateEventSchema = z.object({
  title: requiredStringLength(200, 'Title').optional(),
  school_id: uuidSchema.optional(),
  event_type_id: optionalUuidSchema,
  starts_at: z.string().optional(),
  ends_at: z.string().optional().nullable(),
  venue: optionalStringLength(255, 'Venue'),
  capacity: z.number().int().min(0).optional().nullable(),
  status: eventStatusSchema.optional(),
}).refine(
  (data) => {
    if (data.ends_at && data.starts_at) {
      return new Date(data.ends_at) > new Date(data.starts_at);
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['ends_at'],
  }
);

/**
 * Guest Field Value schema
 */
export const guestFieldValueSchema = z.object({
  field_id: uuidSchema,
  value: z.union([z.string(), z.array(z.string()), z.null()]),
});

/**
 * Create Guest schema
 */
export const createGuestSchema = z.object({
  full_name: requiredStringLength(200, 'Full name'),
  phone: phoneSchema,
  guest_type: guestTypeSchema,
  invite_count: z.number().int().min(1).max(100).default(1),
  status: guestStatusSchema.default('invited'),
  field_values: z.array(guestFieldValueSchema).optional(),
});

/**
 * Update Guest schema
 */
export const updateGuestSchema = z.object({
  full_name: requiredStringLength(200, 'Full name').optional(),
  phone: phoneSchema,
  guest_type: guestTypeSchema.optional(),
  invite_count: z.number().int().min(1).max(100).optional(),
  status: guestStatusSchema.optional(),
  field_values: z.array(guestFieldValueSchema).optional(),
});

/**
 * Quick Add Guest schema (minimal fields for fast entry)
 */
export const quickAddGuestSchema = z.object({
  full_name: requiredStringLength(200, 'Full name'),
  phone: phoneSchema,
  guest_type: guestTypeSchema.default('external'),
  invite_count: z.number().int().min(1).max(100).default(1),
});

/**
 * Check-in Request schema
 */
export const checkinRequestSchema = z.object({
  qr_token: z.string().optional(),
  guest_code: z.string().optional(),
  arrived_increment: z.number().int().min(1).max(100).default(1),
  device_id: z.string().optional(),
  notes: optionalStringLength(500, 'Notes'),
  override_limit: z.boolean().default(false),
}).refine(
  (data) => data.qr_token || data.guest_code,
  {
    message: 'Either QR token or guest code is required',
    path: ['qr_token'],
  }
);

/**
 * Guest Search/Filter schema
 */
export const guestsQuerySchema = z.object({
  q: z.string().optional(),
  status: guestStatusSchema.optional(),
  guest_type: guestTypeSchema.optional(),
  page: z.number().int().min(1).default(1),
  per_page: z.enum(['25', '50', '100', '200']).default('50'),
  sort_by: z.enum(['full_name', 'guest_code', 'created_at', 'status', 'arrived_count']).default('full_name'),
  sort_dir: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Event Search/Filter schema
 */
export const eventsQuerySchema = z.object({
  school_id: uuidSchema.optional(),
  status: eventStatusSchema.optional(),
  event_type_id: uuidSchema.optional(),
  search: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.number().int().min(1).default(1),
  per_page: z.enum(['10', '25', '50', '100']).default('25'),
});

// Type exports
export type CreateEventTypeFormData = z.infer<typeof createEventTypeSchema>;
export type UpdateEventTypeFormData = z.infer<typeof updateEventTypeSchema>;
export type SaveFieldsFormData = z.infer<typeof saveFieldsSchema>;
export type CreateEventFormData = z.infer<typeof createEventSchema>;
export type UpdateEventFormData = z.infer<typeof updateEventSchema>;
export type CreateGuestFormData = z.infer<typeof createGuestSchema>;
export type UpdateGuestFormData = z.infer<typeof updateGuestSchema>;
export type QuickAddGuestFormData = z.infer<typeof quickAddGuestSchema>;
export type CheckinRequestFormData = z.infer<typeof checkinRequestSchema>;
export type GuestsQueryFormData = z.infer<typeof guestsQuerySchema>;
export type EventsQueryFormData = z.infer<typeof eventsQuerySchema>;
export type EventTypeFieldFormData = z.infer<typeof eventTypeFieldSchema>;
export type EventTypeFieldGroupFormData = z.infer<typeof eventTypeFieldGroupSchema>;
