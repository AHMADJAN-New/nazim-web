import type { AttendanceStatus, AttendanceSessionStatus } from './attendance';

export interface AttendanceStatusBreakdown {
  status: AttendanceStatus;
  total: number;
}

export interface AttendanceClassBreakdown {
  class_id: string | null;
  class_name: string;
  school_name: string;
  total_records: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  sick_count: number;
  leave_count: number;
}

export interface AttendanceSchoolBreakdown {
  school_id: string | null;
  school_name: string;
  total_records: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  sick_count: number;
  leave_count: number;
}

export interface AttendanceSessionSummary {
  id: string;
  session_date: string | null;
  status: AttendanceSessionStatus;
  class_name: string;
  school_name: string | null;
  totals: {
    records: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    sick: number;
    leave: number;
  };
}

export interface AttendanceTotalsReportTotals {
  sessions: number;
  students_marked: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  sick: number;
  leave: number;
  attendance_rate: number;
}

export interface AttendanceTotalsReport {
  totals: AttendanceTotalsReportTotals;
  status_breakdown: AttendanceStatusBreakdown[];
  class_breakdown: AttendanceClassBreakdown[];
  school_breakdown: AttendanceSchoolBreakdown[];
  recent_sessions: AttendanceSessionSummary[];
}
