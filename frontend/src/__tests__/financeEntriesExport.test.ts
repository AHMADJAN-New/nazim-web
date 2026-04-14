import { describe, expect, it, vi } from 'vitest';

import { fetchAllFinanceEntriesForExport } from '@/lib/reporting/financeEntriesExport';

describe('fetchAllFinanceEntriesForExport', () => {
  it('fetches and flattens paginated finance entries', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ id: 'e1' }, { id: 'e2' }],
        current_page: 1,
        last_page: 2,
      })
      .mockResolvedValueOnce({
        data: [{ id: 'e3' }],
        current_page: 2,
        last_page: 2,
      });

    const rows = await fetchAllFinanceEntriesForExport(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 1);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2);
    expect(rows.map((row: { id: string }) => row.id)).toEqual(['e1', 'e2', 'e3']);
  });
});
