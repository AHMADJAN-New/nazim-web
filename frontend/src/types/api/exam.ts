import type { AcademicYear } from './academicYear';
import type { ClassAcademicYear } from './class';
import type { Subject, ClassSubject } from './subject';
import type { StudentAdmission } from './student';

// Exam status values
export type ExamStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'archived';

export interface Exam {
  id: string;
  organization_id: string | null;
  academic_year_id: string;
  name: string;
  description: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: ExamStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  academic_year?: AcademicYear;
  exam_classes?: ExamClass[];
  exam_subjects?: ExamSubject[];
}

export interface ExamClass {
  id: string;
  exam_id: string;
  class_academic_year_id: string;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  class_academic_year?: ClassAcademicYear;
}

export interface ExamSubject {
  id: string;
  exam_id: string;
  exam_class_id: string;
  class_subject_id: string;
  subject_id: string;
  organization_id: string | null;
  total_marks?: number | null;
  passing_marks?: number | null;
  scheduled_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  subject?: Subject;
  class_subject?: ClassSubject;
  exam_class?: ExamClass;
}

// Exam Time (Timetable) types
export interface ExamTime {
  id: string;
  organization_id: string;
  exam_id: string;
  exam_class_id: string;
  exam_subject_id: string;
  date: string;
  start_time: string;
  end_time: string;
  room_id?: string | null;
  invigilator_id?: string | null;
  notes?: string | null;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  exam?: Exam;
  exam_class?: ExamClass;
  exam_subject?: ExamSubject;
  room?: {
    id: string;
    name: string;
    building_id?: string;
  };
  invigilator?: {
    id: string;
    first_name: string;
    last_name: string;
    full_name?: string;
  };
}

export interface ExamTimeInsert {
  exam_class_id: string;
  exam_subject_id: string;
  date: string;
  start_time: string;
  end_time: string;
  room_id?: string | null;
  invigilator_id?: string | null;
  notes?: string | null;
}

export interface ExamTimeUpdate {
  date?: string;
  start_time?: string;
  end_time?: string;
  room_id?: string | null;
  invigilator_id?: string | null;
  notes?: string | null;
  is_locked?: boolean;
}

export interface ExamReportSubject {
  id: string;
  class_subject_id: string;
  subject_id: string | null;
  subject?: Subject;
  total_marks: number | null;
  passing_marks: number | null;
  scheduled_at: string | null;
}

export interface ExamReportClass {
  id: string;
  class_academic_year_id: string;
  class_academic_year?: ClassAcademicYear;
  class?: ClassAcademicYear['class'];
  academic_year?: ClassAcademicYear['academic_year'];
  student_count: number;
  subjects: ExamReportSubject[];
}

export interface ExamReport {
  exam: Exam;
  classes: ExamReportClass[];
  totals: {
    classes: number;
    subjects: number;
    students: number;
  };
}

// Summary report types
export interface ExamSummaryReport {
  exam: {
    id: string;
    name: string;
    status: ExamStatus;
    start_date: string | null;
    end_date: string | null;
    academic_year?: AcademicYear;
  };
  totals: {
    classes: number;
    subjects: number;
    enrolled_students: number;
    results_entered: number;
    marks_entered: number;
    absent: number;
  };
  pass_fail: {
    pass_count: number;
    fail_count: number;
    pass_percentage: number;
  };
  marks_statistics: {
    average: number | null;
    distribution: Array<{
      grade_range: string;
      count: number;
    }>;
  };
}

// Class mark sheet types
export interface ClassMarkSheetSubject {
  exam_subject_id: string;
  subject_name: string;
  total_marks: number | null;
  passing_marks: number | null;
  marks_obtained: number | null;
  is_absent: boolean;
  is_pass: boolean | null;
}

export interface ClassMarkSheetStudent {
  exam_student_id: string;
  student: {
    id: string | null;
    full_name: string;
    admission_no: string | null;
    roll_number: string | null;
  };
  subjects: ClassMarkSheetSubject[];
  totals: {
    obtained: number;
    maximum: number;
    percentage: number;
  };
  is_absent_in_any: boolean;
}

export interface ClassMarkSheetReport {
  exam: {
    id: string;
    name: string;
    status: ExamStatus;
  };
  class: {
    id: string;
    name: string;
    section: string | null;
  };
  subjects: Array<{
    id: string;
    name: string;
    total_marks: number | null;
    passing_marks: number | null;
  }>;
  students: ClassMarkSheetStudent[];
  summary: {
    total_students: number;
    subjects_count: number;
  };
}

// Student result types
export interface StudentResultSubject {
  exam_subject_id: string;
  subject: {
    id: string | null;
    name: string;
    code: string | null;
  };
  marks: {
    obtained: number | null;
    total: number | null;
    passing: number | null;
    percentage: number | null;
  };
  is_absent: boolean;
  is_pass: boolean | null;
  remarks: string | null;
}

export interface StudentResultReport {
  exam: {
    id: string;
    name: string;
    status: ExamStatus;
    start_date: string | null;
    end_date: string | null;
    academic_year: string | null;
  };
  student: {
    id: string | null;
    full_name: string;
    admission_no: string | null;
    roll_number: string | null;
    class: string | null;
    section: string | null;
  };
  subjects: StudentResultSubject[];
  summary: {
    total_subjects: number;
    passed_subjects: number;
    failed_subjects: number;
    absent_subjects: number;
    total_marks_obtained: number;
    total_maximum_marks: number;
    overall_percentage: number;
    overall_result: 'Pass' | 'Fail';
  };
}

export interface ExamStudent {
  id: string;
  exam_id: string;
  exam_class_id: string;
  student_admission_id: string;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  exam?: Exam;
  exam_class?: ExamClass;
  student_admission?: StudentAdmission;
}

export interface ExamResult {
  id: string;
  exam_id: string;
  exam_subject_id: string;
  exam_student_id: string;
  student_admission_id: string;
  marks_obtained: number | null;
  is_absent: boolean;
  remarks: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  exam?: Exam;
  exam_subject?: ExamSubject;
  exam_student?: ExamStudent;
  student_admission?: StudentAdmission;
}

// Enrollment stats types
export interface EnrollmentClassStats {
  exam_class_id: string;
  class_name: string;
  section_name: string | null;
  enrolled_count: number;
  available_count: number;
  enrollment_percentage: number;
}

export interface EnrollmentStats {
  exam_id: string;
  total_enrolled: number;
  total_available: number;
  overall_percentage: number;
  class_stats: EnrollmentClassStats[];
}

// Marks progress types
export interface SubjectProgress {
  exam_subject_id: string;
  subject_name: string;
  class_name: string;
  enrolled_count: number;
  results_count: number;
  percentage: number;
  is_complete: boolean;
}

export interface MarksProgress {
  exam_id: string;
  exam_name: string;
  exam_status: ExamStatus;
  total_expected: number;
  total_entered: number;
  overall_percentage: number;
  subject_progress: SubjectProgress[];
}
