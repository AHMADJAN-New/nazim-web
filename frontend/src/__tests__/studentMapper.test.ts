import { describe, expect, it } from 'vitest';

import { mapStudentApiToDomain } from '@/mappers/studentMapper';

describe('mapStudentApiToDomain', () => {
  it('maps core fields and guardian info', () => {
    const student = mapStudentApiToDomain({
      id: 'student-1',
      organization_id: 'org-1',
      school_id: null,
      student_code: null,
      card_number: 'CARD-1',
      admission_no: 'ADM-1',
      full_name: 'Fatima Noor',
      father_name: 'Ali Noor',
      grandfather_name: null,
      mother_name: null,
      gender: 'female',
      birth_year: '1389',
      birth_date: null,
      age: 14,
      admission_year: '2024',
      orig_province: 'Kabul',
      orig_district: 'Central',
      orig_village: 'Village',
      curr_province: 'Kabul',
      curr_district: 'Central',
      curr_village: 'Village',
      nationality: 'Afghan',
      preferred_language: 'Dari',
      previous_school: null,
      guardian_name: 'Ali Noor',
      guardian_relation: 'Father',
      guardian_phone: '0700',
      guardian_tazkira: null,
      guardian_picture_path: null,
      home_address: 'Street 1',
      zamin_name: null,
      zamin_phone: null,
      zamin_tazkira: null,
      zamin_address: null,
      applying_grade: '8',
      is_orphan: false,
      admission_fee_status: 'paid',
      student_status: 'active',
      disability_status: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      family_income: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
      deleted_at: null,
      organization: null,
      school: null,
      current_class: null,
      picture_path: null,
    });

    expect(student.fullName).toBe('Fatima Noor');
    expect(student.guardianName).toBe('Ali Noor');
    expect(student.address).toMatchObject({
      street: 'Street 1',
      city: 'Central',
      state: 'Kabul',
      country: 'Afghan',
    });
    expect(student.guardians).toHaveLength(1);
    expect(student.guardians[0]).toMatchObject({
      relationship: 'Father',
      phone: '0700',
      isPrimary: true,
    });
  });
});
