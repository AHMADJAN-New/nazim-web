import { describe, expect, it, vi } from 'vitest';

import { fetchAllConsolidatedMarkSheetRows } from '@/lib/reporting/consolidatedMarkSheetExport';

describe('fetchAllConsolidatedMarkSheetRows', () => {
  it('merges students from every paginated response page', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          class: { id: 'c1', name: 'Class 10' },
          students: [{ roll_number: '1' }, { roll_number: '2' }],
        },
        current_page: 1,
        last_page: 2,
      })
      .mockResolvedValueOnce({
        data: {
          class: { id: 'c1', name: 'Class 10' },
          students: [{ roll_number: '3' }],
        },
        current_page: 2,
        last_page: 2,
      });

    const report = await fetchAllConsolidatedMarkSheetRows(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 1);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2);
    expect(report.students?.map((student: { roll_number: string }) => student.roll_number)).toEqual(['1', '2', '3']);
  });
});
