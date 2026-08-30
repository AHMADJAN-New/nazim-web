import { describe, expect, it } from 'vitest';

import {
  buildLeaveHistoryFilters,
  findStudentBySearchTerm,
  getInitialLeaveFilterDate,
  resolveStudentSelectionOnClassChange,
} from '@/lib/leave/leaveManagementHelpers';

describe('leaveManagementHelpers', () => {
  describe('buildLeaveHistoryFilters', () => {
    it('returns only month and year for history tab queries', () => {
      expect(buildLeaveHistoryFilters(3, 2026)).toEqual({ month: 3, year: 2026 });
    });
  });

  describe('resolveStudentSelectionOnClassChange', () => {
    it('preserves scanned student when pending id is set', () => {
      expect(resolveStudentSelectionOnClassChange('student-1')).toEqual({
        action: 'preserve',
        studentId: 'student-1',
      });
    });

    it('clears student when class changes manually', () => {
      expect(resolveStudentSelectionOnClassChange(null)).toEqual({ action: 'clear' });
    });
  });

  describe('findStudentBySearchTerm', () => {
    const students = [
      {
        id: 'student-1',
        cardNumber: 'CARD-001',
        studentCode: 'STU-001',
        admissionNumber: 'ADM-001',
      },
      {
        id: 'student-2',
        cardNumber: 'CARD-002',
        studentCode: 'STU-002',
        admissionNumber: 'ADM-002',
      },
    ];

    it.each([
      ['CARD-001'],
      ['stu-001'],
      ['adm-001'],
      ['student-1'],
    ])('finds student by %s', (searchTerm) => {
      expect(findStudentBySearchTerm(students, searchTerm)?.id).toBe('student-1');
    });

    it('returns undefined for blank or unknown search terms', () => {
      expect(findStudentBySearchTerm(students, '   ')).toBeUndefined();
      expect(findStudentBySearchTerm(students, 'missing')).toBeUndefined();
    });
  });

  describe('getInitialLeaveFilterDate', () => {
    it('uses first day of current month when no academic year is provided', () => {
      const result = getInitialLeaveFilterDate(new Date(2026, 2, 15));
      expect(result).toEqual(new Date(2026, 2, 1));
    });

    it('clamps to academic year start when current month is before the year', () => {
      const result = getInitialLeaveFilterDate(new Date(2026, 0, 10), {
        startDate: '2026-03-01',
        endDate: '2026-12-31',
      });

      expect(result).toEqual(new Date(2026, 2, 1));
    });

    it('clamps to academic year end month when current month is after the year', () => {
      const result = getInitialLeaveFilterDate(new Date(2027, 1, 10), {
        startDate: '2026-03-01',
        endDate: '2026-12-31',
      });

      expect(result).toEqual(new Date(2026, 11, 1));
    });
  });
});
