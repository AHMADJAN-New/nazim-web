import type { AcademicYear } from './academicYear';
import type { ClassAcademicYear } from './class';
import type { Subject, ClassSubject } from './subject';
import type { StudentAdmission } from './student';

export interface Exam {
  id: string;
  organization_id: string | null;
  academic_year_id: string;
  name: string;
  description: string | null;
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
