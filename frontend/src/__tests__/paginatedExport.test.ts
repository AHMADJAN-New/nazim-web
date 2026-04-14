import { describe, expect, it, vi } from 'vitest';

import { fetchAllPaginatedRows } from '@/lib/reporting/paginatedExport';

describe('fetchAllPaginatedRows', () => {
  it('collects rows across all pages', async () => {
    const fetchPage = vi.fn(async (page: number) => {
      if (page === 1) {
        return { rows: [{ id: '1' }, { id: '2' }], currentPage: 1, lastPage: 2 };
      }
      return { rows: [{ id: '3' }], currentPage: 2, lastPage: 2 };
    });

    const rows = await fetchAllPaginatedRows(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(rows).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
  });

  it('stops after first page when only one page exists', async () => {
    const fetchPage = vi.fn(async () => ({
      rows: [{ id: '1' }],
      currentPage: 1,
      lastPage: 1,
    }));

    const rows = await fetchAllPaginatedRows(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(rows).toEqual([{ id: '1' }]);
  });
});
