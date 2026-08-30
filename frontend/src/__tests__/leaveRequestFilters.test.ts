import { describe, expect, it } from 'vitest';

import { buildLeaveRequestListParams } from '@/lib/leave/leaveRequestFilters';

describe('buildLeaveRequestListParams', () => {
  it('includes pagination and defined filters only', () => {
    expect(
      buildLeaveRequestListParams(
        {
          month: 8,
          year: 2026,
          studentId: 'student-1',
          classId: 'class-1',
          status: 'approved',
          dateFrom: '2026-08-01',
          dateTo: '2026-08-31',
        },
        2,
        25
      )
    ).toEqual({
      page: 2,
      per_page: 25,
      student_id: 'student-1',
      class_id: 'class-1',
      status: 'approved',
      month: 8,
      year: 2026,
      date_from: '2026-08-01',
      date_to: '2026-08-31',
    });
  });

  it('omits empty student and class filters for history tab queries', () => {
    expect(buildLeaveRequestListParams({ month: 8, year: 2026 }, 1, 10)).toEqual({
      page: 1,
      per_page: 10,
      month: 8,
      year: 2026,
    });
  });
});
