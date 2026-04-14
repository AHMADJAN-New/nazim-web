import { describe, expect, it, vi } from 'vitest';

import { fetchAllStaffForExport } from '@/lib/reporting/staffExport';

describe('fetchAllStaffForExport', () => {
  it('fetches all staff rows across pages', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ id: 's1' }, { id: 's2' }],
        current_page: 1,
        last_page: 2,
      })
      .mockResolvedValueOnce({
        data: [{ id: 's3' }],
        current_page: 2,
        last_page: 2,
      });

    const result = await fetchAllStaffForExport(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 1);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2);
    expect(result.map((row) => row.id)).toEqual(['s1', 's2', 's3']);
  });
});
