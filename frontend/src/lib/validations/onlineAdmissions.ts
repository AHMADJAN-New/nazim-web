import { z } from 'zod';

import { requiredStringLength, optionalStringLength } from './common';

export const onlineAdmissionSchema = z.object({
  full_name: requiredStringLength(150, 'Full name'),
  father_name: requiredStringLength(150, 'Father name'),
  grandfather_name: optionalStringLength(150, 'Grandfather name'),
  mother_name: optionalStringLength(150, 'Mother name'),
  gender: z.enum(['male', 'female']),
  birth_year: optionalStringLength(10, 'Birth year'),
  birth_date: z.preprocess(
    (val) => {
      if (val instanceof Date) return val.toISOString().slice(0, 10);
      if (typeof val === 'string') return val;
      return undefined;
    },
    z.string().optional().nullable()
  ),
  age: z.number().min(0).max(150).optional().nullable(),
  admission_year: optionalStringLength(10, 'Admission year'),
  orig_province: optionalStringLength(100, 'Origin province'),
  orig_district: optionalStringLength(100, 'Origin district'),
  orig_village: optionalStringLength(150, 'Origin village'),
  curr_province: optionalStringLength(100, 'Current province'),
  curr_district: optionalStringLength(100, 'Current district'),
  curr_village: optionalStringLength(150, 'Current village'),
  nationality: optionalStringLength(100, 'Nationality'),
  preferred_language: optionalStringLength(100, 'Preferred language'),
  previous_school: optionalStringLength(150, 'Previous school'),
  previous_grade_level: optionalStringLength(50, 'Previous grade level'),
  previous_academic_year: optionalStringLength(20, 'Previous academic year'),
  previous_school_notes: optionalStringLength(500, 'Previous school notes'),
  guardian_name: requiredStringLength(150, 'Guardian name'),
  guardian_relation: optionalStringLength(100, 'Guardian relation'),
  guardian_phone: requiredStringLength(25, 'Guardian phone'),
  guardian_tazkira: optionalStringLength(100, 'Guardian tazkira'),
  home_address: optionalStringLength(500, 'Home address'),
  zamin_name: optionalStringLength(150, 'Guarantor name'),
  zamin_phone: optionalStringLength(25, 'Guarantor phone'),
  zamin_tazkira: optionalStringLength(100, 'Guarantor tazkira'),
  zamin_address: optionalStringLength(500, 'Guarantor address'),
  applying_grade: requiredStringLength(50, 'Applying grade'),
  is_orphan: z.boolean().optional().nullable(),
  disability_status: optionalStringLength(150, 'Disability status'),
  emergency_contact_name: optionalStringLength(150, 'Emergency contact name'),
  emergency_contact_phone: optionalStringLength(25, 'Emergency contact phone'),
  family_income: optionalStringLength(100, 'Family income'),
  picture: z.any().optional().nullable(),
  guardian_picture: z.any().optional().nullable(),
  documents: z
    .array(
      z.object({
        documentType: optionalStringLength(100, 'Document type'),
        file: z.any().optional().nullable(),
      })
    )
    .optional(),
});

export type OnlineAdmissionFormData = z.infer<typeof onlineAdmissionSchema>;
