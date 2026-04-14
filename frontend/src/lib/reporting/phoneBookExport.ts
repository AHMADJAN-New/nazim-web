import type { PhoneBookEntry } from '@/types/domain/phoneBook';

import { fetchAllPaginatedRows } from './paginatedExport';

export interface PhoneBookExportPage {
  data?: PhoneBookEntry[];
  current_page: number;
  last_page: number;
}

export async function fetchAllPhoneBookEntriesForExport(
  fetchPage: (page: number) => Promise<PhoneBookExportPage>
): Promise<PhoneBookEntry[]> {
  return fetchAllPaginatedRows(async (requestedPage) => {
    const response = await fetchPage(requestedPage);

    return {
      rows: response.data ?? [],
      currentPage: response.current_page,
      lastPage: response.last_page,
    };
  });
}
