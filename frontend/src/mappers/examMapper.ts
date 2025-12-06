import type * as ExamApi from '@/types/api/exam';
import type { Exam, ExamClass, ExamSubject, ExamReport, ExamReportClass, ExamReportSubject } from '@/types/domain/exam';

export const mapExamApiToDomain = (exam: ExamApi.Exam): Exam => ({
  id: exam.id,
  organizationId: exam.organization_id,
  academicYearId: exam.academic_year_id,
  name: exam.name,
  description: exam.description,
  createdAt: new Date(exam.created_at),
  updatedAt: new Date(exam.updated_at),
  deletedAt: exam.deleted_at ? new Date(exam.deleted_at) : null,
  academicYear: exam.academic_year
    ? {
        id: exam.academic_year.id,
        name: exam.academic_year.name,
        startDate: new Date(exam.academic_year.start_date),
        endDate: new Date(exam.academic_year.end_date),
        isCurrent: exam.academic_year.is_current,
      }
    : undefined,
});

export const mapExamDomainToInsert = (exam: Partial<Exam>): Partial<ExamApi.Exam> => ({
  name: exam.name!,
  academic_year_id: exam.academicYearId!,
  description: exam.description ?? null,
});

export const mapExamDomainToUpdate = (exam: Partial<Exam>): Partial<ExamApi.Exam> => ({
  name: exam.name,
  academic_year_id: exam.academicYearId,
  description: exam.description ?? null,
});

export const mapExamClassApiToDomain = (examClass: ExamApi.ExamClass): ExamClass => ({
  id: examClass.id,
  examId: examClass.exam_id,
  classAcademicYearId: examClass.class_academic_year_id,
  organizationId: examClass.organization_id,
  createdAt: new Date(examClass.created_at),
  updatedAt: new Date(examClass.updated_at),
  deletedAt: examClass.deleted_at ? new Date(examClass.deleted_at) : null,
  classAcademicYear: examClass.class_academic_year
    ? {
        id: examClass.class_academic_year.id,
        classId: examClass.class_academic_year.class_id,
        academicYearId: examClass.class_academic_year.academic_year_id,
        organizationId: examClass.class_academic_year.organization_id,
        sectionName: examClass.class_academic_year.section_name,
        teacherId: examClass.class_academic_year.teacher_id,
        roomId: examClass.class_academic_year.room_id,
        capacity: examClass.class_academic_year.capacity,
        currentStudentCount: examClass.class_academic_year.current_student_count ?? 0,
        isActive: examClass.class_academic_year.is_active ?? true,
        notes: examClass.class_academic_year.notes,
        createdAt: new Date(examClass.class_academic_year.created_at),
        updatedAt: new Date(examClass.class_academic_year.updated_at),
        deletedAt: examClass.class_academic_year.deleted_at
          ? new Date(examClass.class_academic_year.deleted_at)
          : null,
        class: examClass.class_academic_year.class,
        academicYear: examClass.class_academic_year.academic_year
          ? {
              id: examClass.class_academic_year.academic_year.id,
              name: examClass.class_academic_year.academic_year.name,
              startDate: new Date(examClass.class_academic_year.academic_year.start_date),
              endDate: new Date(examClass.class_academic_year.academic_year.end_date),
              isCurrent: examClass.class_academic_year.academic_year.is_current,
            }
          : undefined,
      }
    : undefined,
});

export const mapExamSubjectApiToDomain = (examSubject: ExamApi.ExamSubject): ExamSubject => ({
  id: examSubject.id,
  examId: examSubject.exam_id,
  examClassId: examSubject.exam_class_id,
  classSubjectId: examSubject.class_subject_id,
  subjectId: examSubject.subject_id,
  organizationId: examSubject.organization_id,
  totalMarks: examSubject.total_marks ?? null,
  passingMarks: examSubject.passing_marks ?? null,
  scheduledAt: examSubject.scheduled_at ? new Date(examSubject.scheduled_at) : null,
  createdAt: new Date(examSubject.created_at),
  updatedAt: new Date(examSubject.updated_at),
  deletedAt: examSubject.deleted_at ? new Date(examSubject.deleted_at) : null,
  subject: examSubject.subject
    ? {
        id: examSubject.subject.id,
        organizationId: examSubject.subject.organization_id,
        name: examSubject.subject.name,
        code: examSubject.subject.code,
        description: examSubject.subject.description,
        isActive: examSubject.subject.is_active,
        createdAt: new Date(examSubject.subject.created_at),
        updatedAt: new Date(examSubject.subject.updated_at),
        deletedAt: examSubject.subject.deleted_at ? new Date(examSubject.subject.deleted_at) : null,
      }
    : undefined,
  classSubject: examSubject.class_subject
    ? {
        id: examSubject.class_subject.id,
        classSubjectTemplateId: examSubject.class_subject.class_subject_template_id,
        classAcademicYearId: examSubject.class_subject.class_academic_year_id,
        subjectId: examSubject.class_subject.subject_id,
        organizationId: examSubject.class_subject.organization_id,
        teacherId: examSubject.class_subject.teacher_id,
        roomId: examSubject.class_subject.room_id,
        credits: examSubject.class_subject.credits,
        hoursPerWeek: examSubject.class_subject.hours_per_week,
        isRequired: examSubject.class_subject.is_required,
        notes: examSubject.class_subject.notes,
        createdAt: new Date(examSubject.class_subject.created_at),
        updatedAt: new Date(examSubject.class_subject.updated_at),
        deletedAt: examSubject.class_subject.deleted_at
          ? new Date(examSubject.class_subject.deleted_at)
          : null,
      }
    : undefined,
  examClass: examSubject.exam_class ? mapExamClassApiToDomain(examSubject.exam_class) : undefined,
});

const mapReportSubjectApiToDomain = (subject: ExamApi.ExamReportSubject): ExamReportSubject => ({
  id: subject.id,
  classSubjectId: subject.class_subject_id,
  subjectId: subject.subject_id,
  name: subject.subject?.name || subject.subject_id || 'Subject',
  totalMarks: subject.total_marks,
  passingMarks: subject.passing_marks,
  scheduledAt: subject.scheduled_at ? new Date(subject.scheduled_at) : null,
});

const mapReportClassApiToDomain = (examClass: ExamApi.ExamReportClass): ExamReportClass => {
  const classLabelParts = [examClass.class?.name || 'Class'];
  if (examClass.class_academic_year?.section_name) {
    classLabelParts.push(examClass.class_academic_year.section_name);
  }

  return {
    id: examClass.id,
    classAcademicYearId: examClass.class_academic_year_id,
    className: classLabelParts.join(' - '),
    academicYearName: examClass.academic_year?.name || examClass.class_academic_year?.academic_year?.name || 'Academic Year',
    studentCount: examClass.student_count ?? 0,
    subjects: (examClass.subjects || []).map(mapReportSubjectApiToDomain),
  };
};

export const mapExamReportApiToDomain = (report: ExamApi.ExamReport): ExamReport => ({
  exam: mapExamApiToDomain(report.exam),
  totals: report.totals,
  classes: (report.classes || []).map(mapReportClassApiToDomain),
});
