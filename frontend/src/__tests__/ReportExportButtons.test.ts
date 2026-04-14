import { describe, expect, it, vi } from 'vitest';

import { resolveExportRows } from '@/components/reports/ReportExportButtons';

describe('resolveExportRows', () => {
  it('returns provided page data when no callback is supplied', async () => {
    const pageRows = [{ id: '1' }, { id: '2' }];

    const rows = await resolveExportRows(pageRows);

    expect(rows).toEqual(pageRows);
  });

  it('returns all filtered rows from callback when supplied', async () => {
    const pageRows = [{ id: '1' }];
    const allRows = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const getExportData = vi.fn().mockResolvedValue(allRows);

    const rows = await resolveExportRows(pageRows, getExportData);

    expect(getExportData).toHaveBeenCalledTimes(1);
    expect(rows).toEqual(allRows);
  });
});
