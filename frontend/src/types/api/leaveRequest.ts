export interface LeaveRequest {
  id: string;
  organization_id: string;
  student_id: string;
  class_id: string | null;
  academic_year_id: string | null;
  school_id: string | null;
  leave_type: 'full_day' | 'partial_day' | 'time_bound';
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by: string | null;
  approved_at: string | null;
  approval_note: string | null;
  created_by: string;
  qr_token: string;
  qr_used_at: string | null;
  created_at: string;
  updated_at: string;
  student?: {
    id: string;
    full_name: string;
    admission_no: string;
    student_code: string | null;
    picture_path?: string | null;
  };
  class_model?: {
    id: string;
    name: string;
    grade_level: number | null;
  };
  school?: {
    id: string;
    name: string;
  };
}
