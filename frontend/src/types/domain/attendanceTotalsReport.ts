import type { AttendanceStatus, AttendanceSessionStatus } from './attendance';

export interface AttendanceStatusSummary {
  status: AttendanceStatus;
  total: number;
}

export interface AttendanceClassSummary {
  classId: string | null;
  className: string;
  schoolName: string;
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  sick: number;
  leave: number;
  attendanceRate: number;
}

export interface AttendanceSchoolSummary {
  schoolId: string | null;
  schoolName: string;
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  sick: number;
  leave: number;
  attendanceRate: number;
}

export interface AttendanceRoomSummary {
  roomName: string;
  schoolName: string;
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  sick: number;
  leave: number;
  attendanceRate: number;
}

export interface AttendanceSessionOverview {
  id: string;
  sessionDate: Date | null;
  status: AttendanceSessionStatus;
  roundNumber: number;
  sessionLabel: string | null;
  className: string;
  schoolName: string | null;
  totals: {
    records: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    sick: number;
    leave: number;
  };
  attendanceRate: number;
}

export interface AttendanceTotalsReportTotals {
  sessions: number;
  studentsMarked: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  sick: number;
  leave: number;
  attendanceRate: number;
}

export interface AttendanceStudentSummary {
  studentId: string;
  studentName: string;
  fatherName: string | null;
  admissionNo: string | null;
  cardNumber: string | null;
  buildingRoom: string | null;
  residency: 'boarder' | 'day_scholar' | null;
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  sick: number;
  leave: number;
  attendanceRate: number;
}

export interface AttendanceStudentBreakdownMeta {
  total: number;
  currentPage: number;
  perPage: number;
  lastPage: number;
  from: number | null;
  to: number | null;
}

export interface AttendanceTotalsReport {
  totals: AttendanceTotalsReportTotals;
  statusBreakdown: AttendanceStatusSummary[];
  classBreakdown: AttendanceClassSummary[];
  schoolBreakdown: AttendanceSchoolSummary[];
  roomBreakdown: AttendanceRoomSummary[];
  studentBreakdown: AttendanceStudentSummary[];
  studentBreakdownMeta: AttendanceStudentBreakdownMeta | null;
  recentSessions: AttendanceSessionOverview[];
}

export interface AttendanceTotalsReportFilters {
  organizationId?: string;
  classId?: string;
  classIds?: string[];
  academicYearId?: string;
  status?: AttendanceStatus;
  dateFrom?: string;
  dateTo?: string;
  studentId?: string;
  studentType?: 'boarders' | 'day_scholars' | 'all';
  attendanceSessionId?: string;
  sessionsLimit?: number;
  studentBreakdownPage?: number;
  studentBreakdownPerPage?: number;
}
