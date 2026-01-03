import { z } from 'zod';
import { requiredStringLength, optionalStringLength, optionalEmailSchema, phoneSchema, dateStringSchema } from './common';

/**
 * Organization validation schema
 */
export const organizationSchema = z.object({
  // Basic Information
  name: requiredStringLength(255, 'Organization name'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be 100 characters or less')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  
  // Contact Information
  email: optionalEmailSchema,
  phone: phoneSchema,
  website: z.string().url('Invalid website URL').optional().nullable().or(z.literal('')),
  
  // Address Information
  streetAddress: optionalStringLength(500, 'Street address'),
  city: optionalStringLength(100, 'City'),
  stateProvince: optionalStringLength(100, 'State/Province'),
  country: optionalStringLength(100, 'Country'),
  postalCode: optionalStringLength(20, 'Postal code'),
  
  // Registration & Legal Information
  registrationNumber: optionalStringLength(100, 'Registration number'),
  taxId: optionalStringLength(100, 'Tax ID'),
  licenseNumber: optionalStringLength(100, 'License number'),
  
  // Organization Details
  type: optionalStringLength(100, 'Organization type'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional().nullable(),
  establishedDate: dateStringSchema,
  isActive: z.boolean().default(true),
  
  // Contact Person Information
  contactPersonName: optionalStringLength(255, 'Contact person name'),
  contactPersonEmail: optionalEmailSchema,
  contactPersonPhone: phoneSchema,
  contactPersonPosition: optionalStringLength(100, 'Contact person position'),
  
  // Media
  logoUrl: z.string().url('Invalid logo URL').optional().nullable().or(z.literal('')),
  
  // Admin user fields (required when creating, not when updating)
  admin_email: z.string().email('Invalid admin email').optional(),
  admin_password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  admin_full_name: z.string().min(1, 'Admin full name is required').optional(),
});

export type OrganizationFormData = z.infer<typeof organizationSchema>;





