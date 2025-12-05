export type AttendanceMethod = 'manual' | 'barcode';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'sick' | 'leave';
export type AttendanceSessionStatus = 'open' | 'closed';

export interface AttendanceSession {
  id: string;
  organization_id: string;
  school_id: string | null;
  class_id: string | null; // Can be null for multi-class sessions
  academic_year_id: string | null;
  session_date: string;
  method: AttendanceMethod;
  status: AttendanceSessionStatus;
  remarks: string | null;
  created_by: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  class_model?: {
    id: string;
    name: string;
    grade_level: number | null;
  };
  classes?: Array<{
    id: string;
    name: string;
    grade_level: number | null;
  }>;
  school?: {
    id: string;
    school_name: string;
  };
}

export interface AttendanceRecord {
  id: string;
  attendance_session_id: string;
  organization_id: string;
  school_id: string | null;
  student_id: string;
  status: AttendanceStatus;
  entry_method: AttendanceMethod;
  marked_at: string;
  marked_by: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  student?: {
    id: string;
    full_name: string;
    admission_no: string;
    card_number: string | null;
    gender: string | null;
  };
}

export interface AttendanceRecordInsert {
  student_id: string;
  status: AttendanceStatus;
  note?: string | null;
}

export interface AttendanceSessionInsert {
  class_id?: string; // Keep for backward compatibility
  class_ids?: string[]; // New: multiple classes
  school_id?: string | null;
  academic_year_id?: string | null;
  session_date: string;
  method: AttendanceMethod;
  status?: AttendanceSessionStatus;
  remarks?: string | null;
  records?: AttendanceRecordInsert[];
}

export type AttendanceSessionUpdate = Partial<AttendanceSessionInsert>;
