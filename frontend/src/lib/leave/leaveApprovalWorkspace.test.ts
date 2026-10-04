import { describe, expect, it } from 'vitest';

import {
  buildLeaveApprovalFilters,
  canEditLeaveRequestDates,
} from './leaveApprovalWorkspace';

describe('leave approval workspace', () => {
  it('loads pending requests without an implicit month or year filter', () => {
    expect(buildLeaveApprovalFilters('pending', '', '')).toEqual({
      status: 'pending',
    });
  });

  it('adds only explicitly selected date range filters', () => {
    expect(
      buildLeaveApprovalFilters('all', '2026-10-01', '2026-10-31'),
    ).toEqual({
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
    });
  });

  it('allows date editing only for pending requests', () => {
    expect(canEditLeaveRequestDates('pending')).toBe(true);
    expect(canEditLeaveRequestDates('approved')).toBe(false);
    expect(canEditLeaveRequestDates('rejected')).toBe(false);
    expect(canEditLeaveRequestDates('cancelled')).toBe(false);
  });
});
