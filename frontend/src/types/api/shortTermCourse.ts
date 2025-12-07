export type ShortTermCourseStatus = 'draft' | 'open' | 'closed' | 'completed';

export interface ShortTermCourse {
  id: string;
  organization_id: string;
  name: string;
  name_en?: string | null;
  name_ar?: string | null;
  name_ps?: string | null;
  name_fa?: string | null;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  duration_days?: number | null;
  max_students?: number | null;
  status: ShortTermCourseStatus;
  fee_amount?: number | null;
  instructor_name?: string | null;
  location?: string | null;
  created_by?: string | null;
  closed_at?: string | null;
  closed_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShortTermCourseInsert {
  organization_id: string;
  name: string;
  name_en?: string | null;
  name_ar?: string | null;
  name_ps?: string | null;
  name_fa?: string | null;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  duration_days?: number | null;
  max_students?: number | null;
  status?: ShortTermCourseStatus;
  fee_amount?: number | null;
  instructor_name?: string | null;
  location?: string | null;
}

export interface ShortTermCourseUpdate extends Partial<ShortTermCourseInsert> {}
