import { fetchAllPaginatedRows } from './paginatedExport';

type PaginatedResponse<T> = {
  data?: T[];
  current_page: number;
  last_page: number;
};

export async function fetchAllFinanceEntriesForExport<T>(
  fetchPage: (page: number) => Promise<PaginatedResponse<T>>
): Promise<T[]> {
  return fetchAllPaginatedRows(async (requestedPage) => {
    const response = await fetchPage(requestedPage);
    return {
      rows: response.data ?? [],
      currentPage: response.current_page,
      lastPage: response.last_page,
    };
  });
}
