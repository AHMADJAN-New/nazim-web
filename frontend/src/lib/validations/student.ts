import { z } from 'zod';

import { optionalUuidSchema, optionalEmailSchema, phoneSchema, optionalStringLength, requiredStringLength } from './common';
import { validationMessages } from './validationHelpers';

/**
 * Student form validation schema
 * Matches backend StoreStudentRequest validation rules
 */
export const studentSchema = z.object({
  organization_id: optionalUuidSchema,
  school_id: optionalUuidSchema,
  card_number: optionalStringLength(50, 'Card number'),
  tazkira_number: optionalStringLength(100, 'Tazkira number'),
  phone: phoneSchema,
  notes: optionalStringLength(1000, 'Notes'),
  admission_no: requiredStringLength(50, 'Admission number'),
  full_name: requiredStringLength(200, 'Full name'),
  father_name: requiredStringLength(150, 'Father name'),
  grandfather_name: optionalStringLength(150, 'Grandfather name'),
  mother_name: optionalStringLength(150, 'Mother name'),
  gender: z.enum(['male', 'female']),
  birth_year: optionalStringLength(10, 'Birth year'),
  birth_date: optionalStringLength(30, 'Birth date'),
  age: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
        return undefined;
      }
      return typeof val === 'string' ? Number(val) : val;
    },
    z.number().min(3, validationMessages.ageMin(3)).max(25, validationMessages.ageMax()).optional().nullable()
  ),
  admission_year: optionalStringLength(10, 'Admission year'),
  orig_province: optionalStringLength(80, 'Province'),
  orig_district: optionalStringLength(80, 'District'),
  orig_village: optionalStringLength(80, 'Village'),
  curr_province: optionalStringLength(80, 'Province'),
  curr_district: optionalStringLength(80, 'District'),
  curr_village: optionalStringLength(80, 'Village'),
  nationality: optionalStringLength(80, 'Nationality'),
  preferred_language: optionalStringLength(50, 'Preferred language'),
  previous_school: optionalStringLength(150, 'Previous school'),
  guardian_name: optionalStringLength(150, 'Guardian name'),
  guardian_relation: optionalStringLength(100, 'Relation'),
  guardian_phone: phoneSchema,
  guardian_tazkira: optionalStringLength(50, 'Tazkira'),
  guardian_picture_path: optionalStringLength(255, 'Guardian picture path'),
  home_address: optionalStringLength(255, 'Address'),
  zamin_name: optionalStringLength(150, 'Guarantor name'),
  zamin_phone: phoneSchema,
  zamin_tazkira: optionalStringLength(50, 'Guarantor tazkira'),
  zamin_address: optionalStringLength(255, 'Guarantor address'),
  applying_grade: optionalStringLength(50, 'Applying grade'),
  is_orphan: z.boolean().default(false),
  admission_fee_status: z.enum(['paid', 'pending', 'waived', 'partial']).default('pending'),
  student_status: z.enum(['applied', 'admitted', 'active', 'withdrawn']).default('active'),
  disability_status: optionalStringLength(150, 'Disability info'),
  emergency_contact_name: optionalStringLength(150, 'Emergency contact'),
  emergency_contact_phone: phoneSchema,
  family_income: optionalStringLength(100, 'Family income'),
});

export type StudentFormData = z.infer<typeof studentSchema>;
