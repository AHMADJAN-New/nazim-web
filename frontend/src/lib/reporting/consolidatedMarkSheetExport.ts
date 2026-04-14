type GenericReport = Record<string, unknown> & {
  students?: unknown[];
};

type PaginatedReportResponse = {
  data?: GenericReport;
  current_page?: number;
  last_page?: number;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function extractReport(response: unknown): GenericReport {
  if (!isObject(response)) return {};
  if (isObject(response.data)) return response.data as GenericReport;
  return response as GenericReport;
}

function extractPagination(response: unknown, report: GenericReport): { currentPage: number; lastPage: number } {
  const currentPage =
    (isObject(response) && typeof response.current_page === 'number' ? response.current_page : undefined) ??
    (typeof report.current_page === 'number' ? report.current_page : undefined) ??
    1;

  const lastPage =
    (isObject(response) && typeof response.last_page === 'number' ? response.last_page : undefined) ??
    (typeof report.last_page === 'number' ? report.last_page : undefined) ??
    1;

  return { currentPage, lastPage };
}

export async function fetchAllConsolidatedMarkSheetRows(
  fetchPage: (page: number) => Promise<PaginatedReportResponse | GenericReport>
): Promise<GenericReport> {
  let page = 1;
  let lastPage = 1;
  let baseReport: GenericReport | null = null;
  const mergedStudents: unknown[] = [];

  do {
    const response = await fetchPage(page);
    const report = extractReport(response);
    const { currentPage, lastPage: pageLast } = extractPagination(response, report);

    if (!baseReport) {
      baseReport = report;
    }

    if (Array.isArray(report.students)) {
      mergedStudents.push(...report.students);
    }

    page = currentPage + 1;
    lastPage = pageLast;
  } while (page <= lastPage);

  return {
    ...(baseReport ?? {}),
    students: mergedStudents,
  };
}
