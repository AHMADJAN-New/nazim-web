export interface PaginatedRowsPage<T> {
  rows: T[];
  currentPage: number;
  lastPage: number;
}

export async function fetchAllPaginatedRows<T>(
  fetchPage: (page: number) => Promise<PaginatedRowsPage<T>>
): Promise<T[]> {
  const allRows: T[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const result = await fetchPage(page);
    allRows.push(...result.rows);
    lastPage = result.lastPage;
    page += 1;
  } while (page <= lastPage);

  return allRows;
}
