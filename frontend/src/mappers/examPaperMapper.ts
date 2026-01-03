import { mapExamApiToDomain, mapExamSubjectApiToDomain } from './examMapper';
import { mapQuestionApiToDomain, mapQuestionOptionApiToDomain } from './questionMapper';
import { mapSubjectApiToDomain } from './subjectMapper';

import type * as ExamPaperApi from '@/types/api/examPaper';
import type {
  ExamPaperTemplate,
  ExamPaperItem,
  ExamPaperStats,
  ExamPaperPreview,
  ExamPaperPreviewSection,
  ExamPaperPreviewQuestion,
  ExamPaperPreviewHeader,
  AvailableTemplatesResponse,
  SchoolInfo,
  ExamPaperItemReorder,
} from '@/types/domain/examPaper';
import type { ClassAcademicYearInfo, UserInfo, QuestionOption } from '@/types/domain/question';

/**
 * Map API school info to Domain SchoolInfo
 */
function mapSchoolInfo(api: ExamPaperApi.ExamPaperTemplate['school']): SchoolInfo | undefined {
  if (!api) return undefined;
  return {
    id: api.id,
    schoolName: api.school_name,
    schoolNameArabic: api.school_name_arabic,
    schoolNamePashto: api.school_name_pashto,
  };
}

/**
 * Map API class_academic_year to Domain ClassAcademicYearInfo
 */
function mapClassAcademicYearInfo(api: ExamPaperApi.ExamPaperTemplate['class_academic_year']): ClassAcademicYearInfo | undefined {
  if (!api) return undefined;
  return {
    id: api.id,
    classId: api.class_id,
    academicYearId: api.academic_year_id,
    sectionName: api.section_name,
    className: api.class?.name,
    academicYearName: api.academic_year?.name,
  };
}

/**
 * Map API user info to Domain UserInfo
 */
function mapUserInfo(api: { id: string; full_name: string | null } | undefined): UserInfo | undefined {
  if (!api) return undefined;
  return {
    id: api.id,
    fullName: api.full_name,
  };
}

/**
 * Map API ExamPaperItem to Domain ExamPaperItem
 */
export function mapExamPaperItemApiToDomain(api: ExamPaperApi.ExamPaperItem): ExamPaperItem {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    examPaperTemplateId: api.exam_paper_template_id,
    questionId: api.question_id,
    sectionLabel: api.section_label,
    position: api.position,
    marksOverride: api.marks_override,
    answerLinesCount: api.answer_lines_count,
    showAnswerLines: api.show_answer_lines,
    isMandatory: api.is_mandatory,
    notes: api.notes,
    createdBy: api.created_by,
    updatedBy: api.updated_by,
    deletedBy: api.deleted_by,
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
    question: api.question ? mapQuestionApiToDomain(api.question) : undefined,
  };
}

/**
 * Map API ExamPaperTemplate to Domain ExamPaperTemplate
 */
export function mapExamPaperTemplateApiToDomain(api: ExamPaperApi.ExamPaperTemplate): ExamPaperTemplate {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    examId: api.exam_id,
    examSubjectId: api.exam_subject_id,
    subjectId: api.subject_id,
    classAcademicYearId: api.class_academic_year_id,
    templateFileId: api.template_file_id,
    title: api.title,
    language: api.language,
    totalMarks: api.total_marks,
    durationMinutes: api.duration_minutes,
    headerHtml: api.header_html,
    footerHtml: api.footer_html,
    instructions: api.instructions,
    isDefaultForExamSubject: api.is_default_for_exam_subject,
    isActive: api.is_active,
    createdBy: api.created_by,
    updatedBy: api.updated_by,
    deletedBy: api.deleted_by,
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
    subject: api.subject ? mapSubjectApiToDomain(api.subject) : undefined,
    exam: api.exam ? mapExamApiToDomain(api.exam) : undefined,
    examSubject: api.exam_subject ? mapExamSubjectApiToDomain(api.exam_subject) : undefined,
    school: mapSchoolInfo(api.school),
    classAcademicYear: mapClassAcademicYearInfo(api.class_academic_year),
    creator: mapUserInfo(api.creator),
    updater: mapUserInfo(api.updater),
    items: api.items?.map(mapExamPaperItemApiToDomain),
    itemsCount: api.items_count,
    computedTotalMarks: api.computed_total_marks,
    hasMarksDiscrepancy: api.has_marks_discrepancy,
    printStatus: api.print_status,
    copiesPrinted: api.copies_printed,
    lastPrintedAt: api.last_printed_at ? new Date(api.last_printed_at) : null,
    printedBy: api.printed_by,
    printNotes: api.print_notes,
  };
}

/**
 * Map Domain ExamPaperTemplate to API ExamPaperTemplateInsert
 */
export function mapExamPaperTemplateDomainToInsert(
  domain: Partial<ExamPaperTemplate>
): ExamPaperApi.ExamPaperTemplateInsert {
  return {
    school_id: domain.schoolId || '',
    exam_id: domain.examId ?? undefined,
    exam_subject_id: domain.examSubjectId ?? undefined,
    subject_id: domain.subjectId || '',
    class_academic_year_id: domain.classAcademicYearId ?? undefined,
    template_file_id: domain.templateFileId ?? undefined,
    title: domain.title || '',
    language: domain.language,
    total_marks: domain.totalMarks ?? undefined,
    duration_minutes: domain.durationMinutes ?? undefined,
    header_html: domain.headerHtml ?? undefined,
    footer_html: domain.footerHtml ?? undefined,
    instructions: domain.instructions ?? undefined,
    is_default_for_exam_subject: domain.isDefaultForExamSubject,
    is_active: domain.isActive,
  };
}

/**
 * Map Domain ExamPaperTemplate to API ExamPaperTemplateUpdate
 */
export function mapExamPaperTemplateDomainToUpdate(
  domain: Partial<ExamPaperTemplate>
): ExamPaperApi.ExamPaperTemplateUpdate {
  const update: ExamPaperApi.ExamPaperTemplateUpdate = {};

  if (domain.examId !== undefined) update.exam_id = domain.examId;
  if (domain.examSubjectId !== undefined) update.exam_subject_id = domain.examSubjectId;
  if (domain.subjectId !== undefined) update.subject_id = domain.subjectId;
  if (domain.classAcademicYearId !== undefined) update.class_academic_year_id = domain.classAcademicYearId;
  if (domain.templateFileId !== undefined) update.template_file_id = domain.templateFileId;
  if (domain.title !== undefined) update.title = domain.title;
  if (domain.language !== undefined) update.language = domain.language;
  if (domain.totalMarks !== undefined) update.total_marks = domain.totalMarks;
  if (domain.durationMinutes !== undefined) update.duration_minutes = domain.durationMinutes;
  if (domain.headerHtml !== undefined) update.header_html = domain.headerHtml;
  if (domain.footerHtml !== undefined) update.footer_html = domain.footerHtml;
  if (domain.instructions !== undefined) update.instructions = domain.instructions;
  if (domain.isDefaultForExamSubject !== undefined) update.is_default_for_exam_subject = domain.isDefaultForExamSubject;
  if (domain.isActive !== undefined) update.is_active = domain.isActive;

  return update;
}

/**
 * Map Domain ExamPaperItem to API ExamPaperItemInsert
 */
export function mapExamPaperItemDomainToInsert(
  domain: Partial<ExamPaperItem>
): ExamPaperApi.ExamPaperItemInsert {
  return {
    question_id: domain.questionId || '',
    section_label: domain.sectionLabel ?? undefined,
    position: domain.position,
    marks_override: domain.marksOverride ?? undefined,
    answer_lines_count: domain.answerLinesCount ?? undefined,
    show_answer_lines: domain.showAnswerLines ?? undefined,
    is_mandatory: domain.isMandatory,
    notes: domain.notes ?? undefined,
  };
}

/**
 * Map Domain ExamPaperItem to API ExamPaperItemUpdate
 */
export function mapExamPaperItemDomainToUpdate(
  domain: Partial<ExamPaperItem>
): ExamPaperApi.ExamPaperItemUpdate {
  const update: ExamPaperApi.ExamPaperItemUpdate = {};

  if (domain.sectionLabel !== undefined) update.section_label = domain.sectionLabel;
  if (domain.position !== undefined) update.position = domain.position;
  if (domain.marksOverride !== undefined) update.marks_override = domain.marksOverride;
  if (domain.answerLinesCount !== undefined) update.answer_lines_count = domain.answerLinesCount;
  if (domain.showAnswerLines !== undefined) update.show_answer_lines = domain.showAnswerLines;
  if (domain.isMandatory !== undefined) update.is_mandatory = domain.isMandatory;
  if (domain.notes !== undefined) update.notes = domain.notes;

  return update;
}

/**
 * Map Domain ExamPaperItemReorder to API format
 */
export function mapExamPaperItemReorderDomainToApi(
  items: ExamPaperItemReorder[]
): ExamPaperApi.ExamPaperItemReorder[] {
  return items.map(item => ({
    id: item.id,
    position: item.position,
    section_label: item.sectionLabel,
  }));
}

/**
 * Map API ExamPaperStats to Domain ExamPaperStats
 */
export function mapExamPaperStatsApiToDomain(api: ExamPaperApi.ExamPaperStats): ExamPaperStats {
  return {
    examId: api.exam_id,
    totalSubjects: api.total_subjects,
    subjectsWithTemplate: api.subjects_with_template,
    subjectsWithoutTemplate: api.subjects_without_template,
    completionPercentage: api.completion_percentage,
    subjects: api.subjects.map(s => ({
      examSubjectId: s.exam_subject_id,
      subjectId: s.subject_id,
      subjectName: s.subject_name,
      className: s.class_name,
      hasPaperTemplate: s.has_paper_template,
    })),
  };
}

/**
 * Map API ExamPaperPreviewHeader to Domain
 */
function mapPreviewHeaderApiToDomain(api: ExamPaperApi.ExamPaperPreviewHeader): ExamPaperPreviewHeader {
  return {
    schoolName: api.school_name,
    schoolNameArabic: api.school_name_arabic,
    schoolNamePashto: api.school_name_pashto,
    schoolAddress: api.school_address,
    examName: api.exam_name,
    subjectName: api.subject_name,
    className: api.class_name,
    academicYear: api.academic_year,
    durationMinutes: api.duration_minutes,
    totalMarks: api.total_marks,
    date: api.date,
  };
}

/**
 * Map API ExamPaperPreviewQuestion to Domain
 */
function mapPreviewQuestionApiToDomain(api: ExamPaperApi.ExamPaperPreviewQuestion): ExamPaperPreviewQuestion {
  return {
    number: api.number,
    itemId: api.item_id,
    questionId: api.question_id,
    type: api.type,
    difficulty: api.difficulty,
    text: api.text,
    textRtl: api.text_rtl,
    marks: api.marks,
    isMandatory: api.is_mandatory,
    reference: api.reference,
    options: api.options?.map(o => ({
      id: o.id,
      label: o.label,
      text: o.text,
      isCorrect: o.is_correct,
    })),
    correctOption: api.correct_option ? mapQuestionOptionApiToDomain(api.correct_option) : undefined,
    correctAnswer: api.correct_answer,
  };
}

/**
 * Map API ExamPaperPreviewSection to Domain
 */
function mapPreviewSectionApiToDomain(api: ExamPaperApi.ExamPaperPreviewSection): ExamPaperPreviewSection {
  return {
    label: api.label,
    questions: api.questions.map(mapPreviewQuestionApiToDomain),
    totalMarks: api.total_marks,
  };
}

/**
 * Map API ExamPaperPreview to Domain ExamPaperPreview
 */
export function mapExamPaperPreviewApiToDomain(api: ExamPaperApi.ExamPaperPreview): ExamPaperPreview {
  return {
    templateId: api.template_id,
    title: api.title,
    language: api.language,
    isRtl: api.is_rtl,
    header: mapPreviewHeaderApiToDomain(api.header),
    headerHtml: api.header_html,
    footerHtml: api.footer_html,
    instructions: api.instructions,
    sections: api.sections.map(mapPreviewSectionApiToDomain),
    totalQuestions: api.total_questions,
    totalMarks: api.total_marks,
    computedTotalMarks: api.computed_total_marks,
    showAnswers: api.show_answers,
  };
}

/**
 * Map API AvailableTemplatesResponse to Domain
 */
export function mapAvailableTemplatesResponseApiToDomain(
  api: ExamPaperApi.AvailableTemplatesResponse
): AvailableTemplatesResponse {
  return {
    examSubject: {
      id: api.exam_subject.id,
      subjectName: api.exam_subject.subject_name,
      className: api.exam_subject.class_name,
    },
    templates: api.templates.map(mapExamPaperTemplateApiToDomain),
  };
}
