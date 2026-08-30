import { describe, expect, it } from 'vitest';

import { createAcademicYearSchema } from '@/lib/validations/academicYear';

describe('createAcademicYearSchema', () => {
  const t = (key: string) => key;
  const schema = createAcademicYearSchema(t);

  it('accepts academic year names up to 20 characters', () => {
    const result = schema.safeParse({
      name: '1405-1406 Academic',
      start_date: '2026-03-21',
      end_date: '2027-03-20',
      status: 'active',
      is_current: false,
    });

    expect(result.success).toBe(true);
  });

  it('rejects academic year names longer than 20 characters', () => {
    const result = schema.safeParse({
      name: 'This academic year name is way too long',
      start_date: '2026-03-21',
      end_date: '2027-03-20',
      status: 'active',
      is_current: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('academic.academicYears.nameMaxLength');
    }
  });

  it('rejects end dates that are not after start date', () => {
    const result = schema.safeParse({
      name: '1405',
      start_date: '2027-03-20',
      end_date: '2026-03-21',
      status: 'active',
      is_current: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('academic.academicYears.dateRangeError');
    }
  });
});
