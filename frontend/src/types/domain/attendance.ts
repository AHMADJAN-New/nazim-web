import type { AttendanceMethod, AttendanceStatus, AttendanceSessionStatus } from '@/types/api/attendance';

export interface AttendanceRecord {
  id: string;
  attendanceSessionId: string;
  organizationId: string;
  schoolId: string | null;
  studentId: string;
  status: AttendanceStatus;
  entryMethod: AttendanceMethod;
  markedAt: Date;
  markedBy: string;
  note: string | null;
  student?: {
    id: string;
    fullName: string;
    admissionNo: string;
    cardNumber: string | null;
    gender: string | null;
  };
}

export interface AttendanceRecordInsert {
  studentId: string;
  status: AttendanceStatus;
  note?: string | null;
}

export interface AttendanceSession {
  id: string;
  organizationId: string;
  schoolId: string | null;
  classId: string | null; // Can be null for multi-class sessions
  academicYearId: string | null;
  sessionDate: Date;
  method: AttendanceMethod;
  status: AttendanceSessionStatus;
  remarks: string | null;
  createdBy: string;
  closedAt: Date | null;
  className?: string;
  gradeLevel?: number | null;
  schoolName?: string | null;
  classes?: Array<{
    id: string;
    name: string;
    gradeLevel: number | null;
  }>;
  records?: AttendanceRecord[];
}

export interface AttendanceSessionInsert {
  classId?: string; // Keep for backward compatibility
  classIds?: string[]; // New: multiple classes
  schoolId?: string | null;
  academicYearId?: string | null;
  sessionDate: Date;
  method: AttendanceMethod;
  status?: AttendanceSessionStatus;
  remarks?: string | null;
  records?: AttendanceRecordInsert[];
}

export type AttendanceSessionUpdate = Partial<AttendanceSessionInsert>;
