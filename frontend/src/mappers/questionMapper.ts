import { mapSubjectApiToDomain } from './subjectMapper';

import type * as QuestionApi from '@/types/api/question';
import type {
  Question,
  QuestionOption,
  QuestionFilters,
  QuestionPaginatedResponse,
  ClassAcademicYearInfo,
  UserInfo,
} from '@/types/domain/question';

/**
 * Map API QuestionOption to Domain QuestionOption
 */
export function mapQuestionOptionApiToDomain(api: QuestionApi.QuestionOption): QuestionOption {
  return {
    id: api.id,
    label: api.label,
    text: api.text,
    isCorrect: api.is_correct,
  };
}

/**
 * Map Domain QuestionOption to API QuestionOption
 */
export function mapQuestionOptionDomainToApi(domain: QuestionOption): QuestionApi.QuestionOption {
  return {
    id: domain.id,
    label: domain.label,
    text: domain.text,
    is_correct: domain.isCorrect,
  };
}

/**
 * Map API class_academic_year to Domain ClassAcademicYearInfo
 */
function mapClassAcademicYearInfo(api: QuestionApi.Question['class_academic_year']): ClassAcademicYearInfo | undefined {
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
 * Map API creator/updater to Domain UserInfo
 */
function mapUserInfo(api: { id: string; full_name: string | null } | undefined): UserInfo | undefined {
  if (!api) return undefined;
  return {
    id: api.id,
    fullName: api.full_name,
  };
}

/**
 * Map API Question to Domain Question
 */
export function mapQuestionApiToDomain(api: QuestionApi.Question): Question {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    subjectId: api.subject_id,
    classAcademicYearId: api.class_academic_year_id,
    type: api.type,
    difficulty: api.difficulty,
    marks: api.marks,
    text: api.text,
    textRtl: api.text_rtl,
    options: api.options?.map(mapQuestionOptionApiToDomain) ?? null,
    correctAnswer: api.correct_answer,
    reference: api.reference,
    tags: api.tags,
    isActive: api.is_active,
    createdBy: api.created_by,
    updatedBy: api.updated_by,
    deletedBy: api.deleted_by,
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
    subject: api.subject ? mapSubjectApiToDomain(api.subject) : undefined,
    classAcademicYear: mapClassAcademicYearInfo(api.class_academic_year),
    creator: mapUserInfo(api.creator),
    updater: mapUserInfo(api.updater),
  };
}

/**
 * Map Domain Question to API QuestionInsert
 */
export function mapQuestionDomainToInsert(domain: Partial<Question>): QuestionApi.QuestionInsert {
  return {
    school_id: domain.schoolId || '',
    subject_id: domain.subjectId || '',
    class_academic_year_id: domain.classAcademicYearId ?? undefined,
    type: domain.type || 'short',
    difficulty: domain.difficulty,
    marks: domain.marks,
    text: domain.text || '',
    text_rtl: domain.textRtl,
    options: domain.options?.map(mapQuestionOptionDomainToApi) ?? undefined,
    correct_answer: domain.correctAnswer ?? undefined,
    reference: domain.reference ?? undefined,
    tags: domain.tags ?? undefined,
    is_active: domain.isActive,
  };
}

/**
 * Map Domain Question to API QuestionUpdate
 */
export function mapQuestionDomainToUpdate(domain: Partial<Question>): QuestionApi.QuestionUpdate {
  const update: QuestionApi.QuestionUpdate = {};
  
  if (domain.subjectId !== undefined) update.subject_id = domain.subjectId;
  if (domain.classAcademicYearId !== undefined) update.class_academic_year_id = domain.classAcademicYearId;
  if (domain.type !== undefined) update.type = domain.type;
  if (domain.difficulty !== undefined) update.difficulty = domain.difficulty;
  if (domain.marks !== undefined) update.marks = domain.marks;
  if (domain.text !== undefined) update.text = domain.text;
  if (domain.textRtl !== undefined) update.text_rtl = domain.textRtl;
  if (domain.options !== undefined) update.options = domain.options?.map(mapQuestionOptionDomainToApi) ?? null;
  if (domain.correctAnswer !== undefined) update.correct_answer = domain.correctAnswer;
  if (domain.reference !== undefined) update.reference = domain.reference;
  if (domain.tags !== undefined) update.tags = domain.tags;
  if (domain.isActive !== undefined) update.is_active = domain.isActive;
  
  return update;
}

/**
 * Map Domain QuestionFilters to API QuestionFilters
 */
export function mapQuestionFiltersDomainToApi(domain: QuestionFilters): QuestionApi.QuestionFilters {
  const api: QuestionApi.QuestionFilters = {};
  
  if (domain.schoolId !== undefined) api.school_id = domain.schoolId;
  if (domain.subjectId !== undefined) api.subject_id = domain.subjectId;
  if (domain.classAcademicYearId !== undefined) api.class_academic_year_id = domain.classAcademicYearId;
  if (domain.type !== undefined) api.type = domain.type;
  if (domain.difficulty !== undefined) api.difficulty = domain.difficulty;
  if (domain.isActive !== undefined) api.is_active = domain.isActive;
  if (domain.search !== undefined) api.search = domain.search;
  if (domain.page !== undefined) api.page = domain.page;
  if (domain.perPage !== undefined) api.per_page = domain.perPage;
  
  return api;
}

/**
 * Map API QuestionPaginatedResponse to Domain QuestionPaginatedResponse
 */
export function mapQuestionPaginatedResponseApiToDomain(
  api: QuestionApi.QuestionPaginatedResponse
): QuestionPaginatedResponse {
  return {
    currentPage: api.current_page,
    data: api.data.map(mapQuestionApiToDomain),
    total: api.total,
    lastPage: api.last_page,
    perPage: api.per_page,
    from: api.from,
    to: api.to,
  };
}
