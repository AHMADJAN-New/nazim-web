export interface AcademicClass {
  id: string;
  organization_id: string;
  school_id: string | null;
  name: string;
  code: string;
  grade_level: string | null;
  section: string | null;
  description: string | null;
  status: 'active' | 'inactive' | 'archived';
  homeroom_teacher_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SubjectRecord {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description: string | null;
  grade_level: string | null;
  credit_hours: number | null;
  is_core: boolean;
  color: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TeacherSummary {
  id: string;
  full_name: string | null;
  employee_id: string | null;
}

export interface SubjectTeacherAssignment {
  id: string;
  organization_id: string;
  class_id: string;
  subject_id: string;
  teacher_staff_id: string;
  room_id: string | null;
  schedule_slot: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  class?: Pick<AcademicClass, 'id' | 'name' | 'code' | 'grade_level' | 'section'> | null;
  subject?: Pick<SubjectRecord, 'id' | 'name' | 'code' | 'grade_level' | 'color'> | null;
  teacher?: TeacherSummary | null;
}

export interface ClassWithTeachers extends AcademicClass {
  teacherAssignments: Array<{
    assignmentId: string;
    subjectId: string;
    subjectName: string;
    subjectColor: string | null;
    teacherId: string;
    teacherName: string;
  }>;
}

export interface SubjectWithTeachers extends SubjectRecord {
  teachers: Array<{
    assignmentId: string;
    classId: string;
    className: string;
    teacherId: string;
    teacherName: string;
  }>;
}

export interface TeachingPeriod {
  id: string;
  organization_id: string;
  name: string;
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  start_time: string;
  end_time: string;
  sort_order: number;
  is_break: boolean;
  max_parallel_classes: number;
  created_at: string;
  updated_at: string;
}

export interface TeacherPeriodPreference {
  id: string;
  organization_id: string;
  teacher_staff_id: string;
  period_id: string;
  preference: 'preferred' | 'available' | 'unavailable';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimetableEntry {
  id: string;
  organization_id: string;
  class_id: string;
  subject_id: string;
  teacher_staff_id: string;
  period_id: string;
  day_of_week: TeachingPeriod['day_of_week'];
  start_time: string;
  end_time: string;
  status: 'draft' | 'confirmed' | 'locked';
  is_locked: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  period?: TeachingPeriod | null;
  class?: Pick<AcademicClass, 'id' | 'name' | 'code'> | null;
  subject?: Pick<SubjectRecord, 'id' | 'name' | 'code' | 'color'> | null;
  teacher?: TeacherSummary | null;
}

export interface TimetableGenerationResult {
  created: number;
  skippedLocked: number;
  unassigned: Array<{
    classId: string;
    subjectId: string;
    teacherId: string;
    reason: string;
  }>;
}
