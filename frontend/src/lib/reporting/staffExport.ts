import type * as StaffApi from '@/types/api/staff';

import { fetchAllPaginatedRows } from './paginatedExport';

type StaffExportPage = {
  data?: StaffApi.Staff[];
  current_page: number;
  last_page: number;
};

export async function fetchAllStaffForExport(
  fetchPage: (page: number) => Promise<StaffExportPage>
): Promise<StaffApi.Staff[]> {
  return fetchAllPaginatedRows(async (requestedPage) => {
    const response = await fetchPage(requestedPage);
    return {
      rows: response.data ?? [],
      currentPage: response.current_page,
      lastPage: response.last_page,
    };
  });
}
