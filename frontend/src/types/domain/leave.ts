export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type LeaveType = 'full_day' | 'partial_day' | 'time_bound';

export interface LeaveRequest {
  id: string;
  organizationId: string;
  studentId: string;
  classId: string | null;
  academicYearId: string | null;
  schoolId: string | null;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  startTime: string | null;
  endTime: string | null;
  reason: string;
  status: LeaveStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  approvalNote: string | null;
  createdBy: string;
  qrToken: string;
  qrUsedAt: Date | null;
  student?: {
    id: string;
    fullName: string;
    admissionNo: string;
    studentCode: string | null;
    picturePath?: string | null;
  };
  className?: string | null;
  gradeLevel?: number | null;
  schoolName?: string | null;
}

export interface LeaveRequestInsert {
  studentId: string;
  classId?: string | null;
  schoolId?: string | null;
  academicYearId?: string | null;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  startTime?: string | null;
  endTime?: string | null;
  reason: string;
  approvalNote?: string | null;
}

export type LeaveRequestUpdate = Partial<LeaveRequestInsert> & { status?: LeaveStatus };
