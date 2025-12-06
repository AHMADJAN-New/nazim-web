import type * as LeaveApi from '@/types/api/leaveRequest';
import type { LeaveRequest, LeaveRequestInsert, LeaveRequestUpdate } from '@/types/domain/leave';

export const mapLeaveRequestApiToDomain = (api: LeaveApi.LeaveRequest): LeaveRequest => ({
  id: api.id,
  organizationId: api.organization_id,
  studentId: api.student_id,
  classId: api.class_id,
  academicYearId: api.academic_year_id,
  schoolId: api.school_id,
  leaveType: api.leave_type,
  startDate: new Date(api.start_date),
  endDate: new Date(api.end_date),
  startTime: api.start_time,
  endTime: api.end_time,
  reason: api.reason,
  status: api.status,
  approvedBy: api.approved_by,
  approvedAt: api.approved_at ? new Date(api.approved_at) : null,
  approvalNote: api.approval_note,
  createdBy: api.created_by,
  qrToken: api.qr_token,
  qrUsedAt: api.qr_used_at ? new Date(api.qr_used_at) : null,
  student: api.student
    ? {
        id: api.student.id,
        fullName: api.student.full_name,
        admissionNo: api.student.admission_no,
        studentCode: api.student.student_code,
        picturePath: api.student.picture_path,
      }
    : undefined,
  className: api.class_model?.name || null,
  gradeLevel: api.class_model?.grade_level ?? null,
  schoolName: api.school?.name ?? null,
});

export const mapLeaveRequestDomainToInsert = (payload: LeaveRequestInsert): any => ({
  student_id: payload.studentId,
  class_id: payload.classId ?? null,
  school_id: payload.schoolId ?? null,
  academic_year_id: payload.academicYearId ?? null,
  leave_type: payload.leaveType,
  start_date: payload.startDate.toISOString().split('T')[0],
  end_date: payload.endDate.toISOString().split('T')[0],
  start_time: payload.startTime ?? null,
  end_time: payload.endTime ?? null,
  reason: payload.reason,
  approval_note: payload.approvalNote ?? null,
});

export const mapLeaveRequestDomainToUpdate = (payload: LeaveRequestUpdate): any => ({
  class_id: payload.classId,
  school_id: payload.schoolId,
  academic_year_id: payload.academicYearId,
  leave_type: payload.leaveType,
  start_date: payload.startDate ? payload.startDate.toISOString().split('T')[0] : undefined,
  end_date: payload.endDate ? payload.endDate.toISOString().split('T')[0] : undefined,
  start_time: payload.startTime,
  end_time: payload.endTime,
  reason: payload.reason,
  approval_note: payload.approvalNote,
  status: payload.status,
});
