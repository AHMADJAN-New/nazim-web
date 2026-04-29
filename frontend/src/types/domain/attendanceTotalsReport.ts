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

export interface AttendanceTotalsReport {
  totals: AttendanceTotalsReportTotals;
  statusBreakdown: AttendanceStatusSummary[];
  classBreakdown: AttendanceClassSummary[];
  schoolBreakdown: AttendanceSchoolSummary[];
  roomBreakdown: AttendanceRoomSummary[];
  recentSessions: AttendanceSessionOverview[];
}

export interface AttendanceTotalsReportFilters {
  organizationId?: string;
  schoolId?: string;
  classId?: string;
  classIds?: string[];
  academicYearId?: string;
  status?: AttendanceStatus;
  dateFrom?: string;
  dateTo?: string;
  studentId?: string;
  studentType?: 'boarders' | 'day_scholars' | 'all';
  sessionsLimit?: number;
}
