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
      tazkira_number: 'TK-123',
      phone: '0701',
      notes: 'Needs extra help',
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
      current_class: {
        id: 'class-1',
        name: 'Grade 8',
        code: 'G8',
        grade_level: '8',
      },
      latest_admission: {
        id: 'admission-1',
        enrollment_status: 'active',
        class_id: 'class-1',
        class_academic_year_id: 'cay-1',
        class_name: 'Grade 8',
        section_name: 'A',
        shift: 'Morning',
        academic_year_id: 'year-1',
        academic_year_name: '1403',
        is_current_enrollment: true,
        is_assigned_to_class: true,
      },
      picture_path: null,
    });

    expect(student.fullName).toBe('Fatima Noor');
    expect(student.guardianName).toBe('Ali Noor');
    expect(student.tazkiraNumber).toBe('TK-123');
    expect(student.phone).toBe('0701');
    expect(student.notes).toBe('Needs extra help');
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
    expect(student.currentClass).toMatchObject({
      id: 'class-1',
      name: 'Grade 8',
    });
    expect(student.latestAdmission).toMatchObject({
      id: 'admission-1',
      enrollmentStatus: 'active',
      className: 'Grade 8',
      sectionName: 'A',
      isCurrentEnrollment: true,
      isAssignedToClass: true,
    });
  });
});
