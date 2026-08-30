import { describe, expect, it } from 'vitest';

import {
  formatStaffName,
  formatTeacherFatherName,
  formatTeacherPrimaryLabel,
} from '@/lib/utils/formatStaffName';

describe('formatStaffName', () => {
  it('joins first, father, and grandfather names with son-of connectors', () => {
    expect(formatStaffName('Ahmad', 'Karim', 'Rahim', 'son of', false)).toBe(
      'Ahmad son of Karim son of Rahim'
    );
  });

  it('returns empty string when all names are missing', () => {
    expect(formatStaffName(null, undefined, '  ')).toBe('');
  });
});

describe('formatTeacherFatherName', () => {
  it('returns trimmed father name only', () => {
    expect(formatTeacherFatherName('  Karim  ')).toBe('Karim');
  });

  it('does not include grandfather name', () => {
    expect(formatTeacherFatherName('Karim Rahim')).toBe('Karim Rahim');
  });

  it('returns empty string when father name is missing', () => {
    expect(formatTeacherFatherName(null)).toBe('');
    expect(formatTeacherFatherName('   ')).toBe('');
  });
});

describe('formatTeacherPrimaryLabel', () => {
  it('formats employee id and first name', () => {
    expect(
      formatTeacherPrimaryLabel({
        employee_id: 'EMP-1',
        first_name: 'Ahmad',
      })
    ).toBe('EMP-1 - Ahmad');
  });

  it('supports camelCase teacher fields', () => {
    expect(
      formatTeacherPrimaryLabel({
        employeeId: 'EMP-2',
        firstName: 'Sara',
      })
    ).toBe('EMP-2 - Sara');
  });

  it('falls back to employee id or first name alone', () => {
    expect(formatTeacherPrimaryLabel({ employee_id: 'EMP-3' })).toBe('EMP-3');
    expect(formatTeacherPrimaryLabel({ first_name: 'Ali' })).toBe('Ali');
    expect(formatTeacherPrimaryLabel(null)).toBe('');
  });
});
