import type { AcademicYear, ClassAcademicYear } from './class';
import type { Subject, ClassSubject } from './subject';

export interface Exam {
  id: string;
  organizationId: string | null;
  academicYearId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  academicYear?: AcademicYear;
  examClasses?: ExamClass[];
  examSubjects?: ExamSubject[];
}

export interface ExamClass {
  id: string;
  examId: string;
  classAcademicYearId: string;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  classAcademicYear?: ClassAcademicYear;
}

export interface ExamSubject {
  id: string;
  examId: string;
  examClassId: string;
  classSubjectId: string;
  subjectId: string;
  organizationId: string | null;
  totalMarks?: number | null;
  passingMarks?: number | null;
  scheduledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  subject?: Subject;
  classSubject?: ClassSubject;
  examClass?: ExamClass;
}

export interface ExamReportSubject {
  id: string;
  classSubjectId: string;
  subjectId: string | null;
  name: string;
  totalMarks: number | null;
  passingMarks: number | null;
  scheduledAt: Date | null;
}

export interface ExamReportClass {
  id: string;
  classAcademicYearId: string;
  className: string;
  academicYearName: string;
  studentCount: number;
  subjects: ExamReportSubject[];
}

export interface ExamReport {
  exam: Exam;
  totals: {
    classes: number;
    subjects: number;
    students: number;
  };
  classes: ExamReportClass[];
}
