import type * as AttendanceApi from '@/types/api/attendance';
import type { AttendanceRecord, AttendanceRecordInsert, AttendanceSession, AttendanceSessionInsert, AttendanceSessionUpdate } from '@/types/domain/attendance';

export const mapAttendanceSessionApiToDomain = (session: AttendanceApi.AttendanceSession): AttendanceSession => ({
  id: session.id,
  organizationId: session.organization_id,
  schoolId: session.school_id,
  classId: session.class_id ?? null,
  academicYearId: session.academic_year_id,
  sessionDate: new Date(session.session_date),
  method: session.method,
  status: session.status,
  remarks: session.remarks,
  createdBy: session.created_by,
  closedAt: session.closed_at ? new Date(session.closed_at) : null,
  className: session.class_model?.name,
  gradeLevel: session.class_model?.grade_level ?? null,
  schoolName: session.school?.school_name ?? null,
  classes: session.classes?.map(c => ({
    id: c.id,
    name: c.name,
    gradeLevel: c.grade_level ?? null,
  })),
});

export const mapAttendanceRecordApiToDomain = (record: AttendanceApi.AttendanceRecord): AttendanceRecord => ({
  id: record.id,
  attendanceSessionId: record.attendance_session_id,
  organizationId: record.organization_id,
  schoolId: record.school_id,
  studentId: record.student_id,
  status: record.status,
  entryMethod: record.entry_method,
  markedAt: new Date(record.marked_at),
  markedBy: record.marked_by,
  note: record.note,
  student: record.student
    ? {
      id: record.student.id,
      fullName: record.student.full_name,
      admissionNo: record.student.admission_no,
      cardNumber: record.student.card_number,
      gender: record.student.gender,
    }
    : undefined,
});

export const mapAttendanceSessionDomainToInsert = (session: AttendanceSessionInsert): AttendanceApi.AttendanceSessionInsert => ({
  class_id: session.classId,
  class_ids: session.classIds,
  school_id: session.schoolId ?? null,
  academic_year_id: session.academicYearId ?? null,
  session_date: session.sessionDate.toISOString(),
  method: session.method,
  status: session.status,
  remarks: session.remarks ?? null,
  records: session.records?.map(mapAttendanceRecordDomainToInsert),
});

export const mapAttendanceRecordDomainToInsert = (record: AttendanceRecordInsert): AttendanceApi.AttendanceRecordInsert => ({
  student_id: record.studentId,
  status: record.status,
  note: record.note ?? null,
});

export const mapAttendanceSessionDomainToUpdate = (session: AttendanceSessionUpdate): Partial<AttendanceApi.AttendanceSessionInsert> => ({
  class_id: session.classId,
  school_id: session.schoolId,
  academic_year_id: session.academicYearId,
  session_date: session.sessionDate ? session.sessionDate.toISOString() : undefined,
  method: session.method,
  status: session.status,
  remarks: session.remarks,
  records: session.records?.map(mapAttendanceRecordDomainToInsert),
});
