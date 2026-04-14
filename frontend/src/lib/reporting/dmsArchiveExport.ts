import type { IncomingDocument, OutgoingDocument } from '@/types/dms';

import { fetchAllPaginatedRows } from './paginatedExport';

type ArchiveSectionMeta = {
  current_page: number;
  last_page: number;
};

type ArchiveResponse = {
  incoming?: {
    data?: IncomingDocument[];
    meta?: ArchiveSectionMeta;
  };
  outgoing?: {
    data?: OutgoingDocument[];
    meta?: ArchiveSectionMeta;
  };
};

export async function fetchAllArchiveDocumentsForExport(
  fetchPage: (page: number) => Promise<ArchiveResponse>,
  type: 'incoming' | 'outgoing'
): Promise<(IncomingDocument | OutgoingDocument)[]> {
  return fetchAllPaginatedRows(async (requestedPage) => {
    const response = await fetchPage(requestedPage);
    const section = type === 'incoming' ? response.incoming : response.outgoing;

    return {
      rows: section?.data ?? [],
      currentPage: section?.meta?.current_page ?? 1,
      lastPage: section?.meta?.last_page ?? 1,
    };
  });
}
