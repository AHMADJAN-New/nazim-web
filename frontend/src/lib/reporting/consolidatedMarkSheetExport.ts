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

/** Identity fields shared by consolidated mark sheet PDF/Excel rows. */
export function mapConsolidatedIdentityFields(student: {
  roll_number?: string | null;
  admission_no?: string | null;
  student_name?: string | null;
  father_name?: string | null;
}): {
  rollNumber: string;
  admissionNo: string;
  studentName: string;
  fatherName: string;
} {
  return {
    rollNumber: student.roll_number || '-',
    admissionNo: student.admission_no || '-',
    studentName: student.student_name || '-',
    fatherName: student.father_name || '-',
  };
}

export function getConsolidatedExportIdentityColumns(
  t: (key: string) => string
): Array<{ key: string; label: string }> {
  return [
    { key: 'rank', label: t('examReports.rank') || 'Rank' },
    { key: 'rollNumber', label: t('students.rollNumber') || 'Roll Number' },
    { key: 'admissionNo', label: t('examReports.admissionNo') || 'Admission No' },
    { key: 'studentName', label: t('examReports.studentName') || 'Student Name' },
    { key: 'fatherName', label: t('examReports.fatherName') || 'Father Name' },
  ];
}
