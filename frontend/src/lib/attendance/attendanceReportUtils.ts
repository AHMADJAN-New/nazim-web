import type * as AttendanceApi from '@/types/api/attendance';

export interface AttendanceReportFilters {
  organizationId: string;
  studentId?: string;
  classId?: string;
  academicYearId?: string;
  status?: AttendanceApi.AttendanceStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
}

export interface AttendanceReportRecord {
  id: string;
  studentId: string;
  studentName: string;
  fatherName: string | null;
  admissionNo: string;
  cardNumber: string | null;
  status: AttendanceApi.AttendanceStatus;
  sessionDate: Date;
  studentClassName: string;
  className: string;
  classNames: string[];
  schoolName: string | null;
  markedAt: Date;
  entryMethod: AttendanceApi.AttendanceMethod;
  note: string | null;
}

type AttendanceReportApiRecord = AttendanceApi.AttendanceRecord & {
  session?: AttendanceApi.AttendanceSession;
};

export const buildAttendanceReportParams = (filters: AttendanceReportFilters) => {
  const params: Record<string, string | number | string[] | undefined> = {
    organization_id: filters.organizationId,
    student_id: filters.studentId,
    academic_year_id: filters.academicYearId,
    status: filters.status,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    page: filters.page,
    per_page: filters.perPage,
  };

  if (filters.classId) {
    params.class_ids = [filters.classId];
  }

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== '')
  );
};

export const mapAttendanceReportRecord = (record: AttendanceReportApiRecord): AttendanceReportRecord => {
  const classNames = Array.from(
    new Set(
      [
        record.session?.class_model?.name,
        ...(record.session?.classes?.map((classItem) => classItem.name) ?? []),
      ].filter((name): name is string => Boolean(name && name.trim()))
    )
  );

  const studentClassName = (record as AttendanceReportApiRecord & { student_class_name?: string | null }).student_class_name ?? null;

  return {
    id: record.id,
    studentId: record.student_id,
    studentName: record.student?.full_name ?? 'Unknown student',
    fatherName: record.student?.father_name ?? null,
    admissionNo: record.student?.admission_no ?? '-',
    cardNumber: record.student?.card_number ?? null,
    status: record.status,
    sessionDate: record.session?.session_date ? new Date(record.session.session_date) : new Date(record.marked_at),
    studentClassName: studentClassName ?? (classNames.length > 0 ? classNames.join(', ') : '—'),
    className: classNames.length > 0 ? classNames.join(', ') : 'Unassigned',
    classNames,
    schoolName: record.session?.school?.school_name ?? null,
    markedAt: new Date(record.marked_at),
    entryMethod: record.entry_method,
    note: record.note ?? null,
  };
};

export const getAttendanceReportSummary = (
  records: Array<Pick<AttendanceReportRecord, 'studentId' | 'status'>>
) => {
  const summary = records.reduce(
    (accumulator, record) => {
      accumulator.total += 1;
      accumulator.uniqueStudentIds.add(record.studentId);

      if (record.status === 'present') {
        accumulator.present += 1;
      } else if (record.status === 'absent') {
        accumulator.absent += 1;
      } else if (record.status === 'late') {
        accumulator.late += 1;
      } else {
        accumulator.exceptions += 1;
      }

      return accumulator;
    },
    {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      exceptions: 0,
      uniqueStudentIds: new Set<string>(),
    }
  );

  return {
    total: summary.total,
    uniqueStudents: summary.uniqueStudentIds.size,
    present: summary.present,
    absent: summary.absent,
    late: summary.late,
    exceptions: summary.exceptions,
  };
};
