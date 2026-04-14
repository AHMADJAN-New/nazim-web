import { describe, expect, it, vi } from 'vitest';

import { fetchAllArchiveDocumentsForExport } from '@/lib/reporting/dmsArchiveExport';
import type { IncomingDocument, OutgoingDocument } from '@/types/dms';

describe('fetchAllArchiveDocumentsForExport', () => {
  it('fetches all incoming pages', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        incoming: {
          data: [{ id: 'in-1' }, { id: 'in-2' }] as IncomingDocument[],
          meta: { current_page: 1, last_page: 2 },
        },
      })
      .mockResolvedValueOnce({
        incoming: {
          data: [{ id: 'in-3' }] as IncomingDocument[],
          meta: { current_page: 2, last_page: 2 },
        },
      });

    const result = await fetchAllArchiveDocumentsForExport(fetchPage, 'incoming');

    expect(fetchPage).toHaveBeenNthCalledWith(1, 1);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2);
    expect(result.map((doc) => doc.id)).toEqual(['in-1', 'in-2', 'in-3']);
  });

  it('fetches all outgoing pages', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        outgoing: {
          data: [{ id: 'out-1' }] as OutgoingDocument[],
          meta: { current_page: 1, last_page: 2 },
        },
      })
      .mockResolvedValueOnce({
        outgoing: {
          data: [{ id: 'out-2' }, { id: 'out-3' }] as OutgoingDocument[],
          meta: { current_page: 2, last_page: 2 },
        },
      });

    const result = await fetchAllArchiveDocumentsForExport(fetchPage, 'outgoing');

    expect(fetchPage).toHaveBeenNthCalledWith(1, 1);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2);
    expect(result.map((doc) => doc.id)).toEqual(['out-1', 'out-2', 'out-3']);
  });
});
