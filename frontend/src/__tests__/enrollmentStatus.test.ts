import { describe, expect, it, vi } from 'vitest';

import { getAdmissionEnrollmentStatusLabel } from '@/lib/admissions/enrollmentStatus';
import type { AdmissionStatus } from '@/types/domain/studentAdmission';

describe('getAdmissionEnrollmentStatusLabel', () => {
  const t = vi.fn((key: string) => key);

  it.each<[AdmissionStatus, string]>([
    ['pending', 'admissions.pending'],
    ['admitted', 'admissions.admitted'],
    ['active', 'admissions.active'],
    ['inactive', 'admissions.inactive'],
    ['suspended', 'students.suspended'],
    ['withdrawn', 'admissions.withdrawn'],
    ['graduated', 'students.graduated'],
  ])('maps %s to the admission-specific translation key', (status, expectedKey) => {
    expect(getAdmissionEnrollmentStatusLabel(status, t)).toBe(expectedKey);
    expect(t).toHaveBeenCalledWith(expectedKey);
  });

  it('does not use generic events.active/inactive keys', () => {
    getAdmissionEnrollmentStatusLabel('active', t);
    getAdmissionEnrollmentStatusLabel('inactive', t);

    expect(t).not.toHaveBeenCalledWith('events.active');
    expect(t).not.toHaveBeenCalledWith('events.inactive');
  });
});
