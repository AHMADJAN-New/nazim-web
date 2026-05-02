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

export interface AttendanceRoomBreakdown {
  room_name: string;
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
  round_number?: number;
  session_label?: string | null;
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

export interface AttendanceStudentBreakdown {
  student_id: string;
  student_name: string;
  father_name: string | null;
  admission_no: string | null;
  card_number: string | null;
  building_room: string | null;
  residency: 'boarder' | 'day_scholar' | string | null;
  total_records: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  sick_count: number;
  leave_count: number;
  attendance_rate: number;
}

export interface AttendanceStudentBreakdownMeta {
  total: number;
  current_page: number;
  per_page: number;
  last_page: number;
  from: number | null;
  to: number | null;
}

export interface AttendanceTotalsReport {
  totals: AttendanceTotalsReportTotals;
  status_breakdown: AttendanceStatusBreakdown[];
  class_breakdown: AttendanceClassBreakdown[];
  school_breakdown: AttendanceSchoolBreakdown[];
  room_breakdown: AttendanceRoomBreakdown[];
  student_breakdown?: AttendanceStudentBreakdown[];
  student_breakdown_meta?: AttendanceStudentBreakdownMeta;
  recent_sessions: AttendanceSessionSummary[];
}
