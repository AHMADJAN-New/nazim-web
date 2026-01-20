// Student ID Card Mapper - Converts between API (snake_case) and Domain (camelCase) models

import type * as StudentIdCardApi from '@/types/api/studentIdCard';
import type {
  StudentIdCard,
  StudentIdCardInsert,
  StudentIdCardUpdate,
  AssignIdCardRequest,
  IdCardFilters,
  IdCardExportRequest,
  IdCardStatistics,
} from '@/types/domain/studentIdCard';

/**
 * Convert API StudentIdCard model to Domain StudentIdCard model
 */
export function mapStudentIdCardApiToDomain(api: StudentIdCardApi.StudentIdCard): StudentIdCard {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    studentId: api.student_id,
    studentAdmissionId: api.student_admission_id,
    courseStudentId: api.course_student_id || null,
    idCardTemplateId: api.id_card_template_id,
    academicYearId: api.academic_year_id,
    classId: api.class_id,
    classAcademicYearId: api.class_academic_year_id,
    cardNumber: api.card_number,
    cardFee: api.card_fee,
    cardFeePaid: api.card_fee_paid,
    cardFeePaidDate: api.card_fee_paid_date ? new Date(api.card_fee_paid_date) : null,
    incomeEntryId: api.income_entry_id,
    isPrinted: api.is_printed,
    printedAt: api.printed_at ? new Date(api.printed_at) : null,
    printedBy: api.printed_by,
    notes: api.notes,
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
    student: api.student ? {
      id: api.student.id,
      fullName: api.student.full_name,
      admissionNumber: api.student.admission_no,
      studentCode: api.student.student_code || null,
      cardNumber: api.student.card_number || null,
      fatherName: api.student.father_name || null,
      gender: api.student.gender || null,
      picturePath: api.student.picture_path || null,
    } : undefined,
    studentAdmission: api.student_admission ? {
      id: api.student_admission.id,
      enrollmentStatus: api.student_admission.enrollment_status,
      classId: api.student_admission.class_id,
      classAcademicYearId: api.student_admission.class_academic_year_id,
    } : undefined,
    courseStudent: api.course_student ? {
      id: api.course_student.id,
      courseId: api.course_student.course_id,
      admissionNo: api.course_student.admission_no,
      fullName: api.course_student.full_name,
      fatherName: api.course_student.father_name || null,
      picturePath: api.course_student.picture_path || null,
      course: api.course_student.course ? {
        id: api.course_student.course.id,
        name: api.course_student.course.name,
        code: api.course_student.course.code || null,
      } : undefined,
    } : undefined,
    template: api.template ? {
      id: api.template.id,
      name: api.template.name,
      description: api.template.description || null,
      isActive: api.template.is_active,
    } : undefined,
    academicYear: api.academic_year ? {
      id: api.academic_year.id,
      name: api.academic_year.name,
      startDate: new Date(api.academic_year.start_date),
      endDate: new Date(api.academic_year.end_date),
    } : undefined,
    class: api.class ? {
      id: api.class.id,
      name: api.class.name,
      gradeLevel: api.class.grade_level,
    } : undefined,
    classAcademicYear: api.class_academic_year ? {
      id: api.class_academic_year.id,
      sectionName: api.class_academic_year.section_name,
    } : undefined,
    organization: api.organization,
    printedByUser: api.printed_by_user ? {
      id: api.printed_by_user.id,
      fullName: api.printed_by_user.full_name || null,
    } : undefined,
    incomeEntry: api.income_entry ? {
      id: api.income_entry.id,
      accountId: api.income_entry.account_id,
      incomeCategoryId: api.income_entry.income_category_id,
      amount: api.income_entry.amount,
      date: new Date(api.income_entry.date),
    } : undefined,
  };
}

/**
 * Convert Domain StudentIdCardInsert model to API StudentIdCardInsert payload
 */
export function mapStudentIdCardDomainToInsert(domain: StudentIdCardInsert): StudentIdCardApi.StudentIdCardInsert {
  return {
    student_id: domain.studentId,
    student_admission_id: domain.studentAdmissionId,
    id_card_template_id: domain.idCardTemplateId,
    academic_year_id: domain.academicYearId,
    organization_id: domain.organizationId,
    class_id: domain.classId,
    class_academic_year_id: domain.classAcademicYearId,
    card_number: domain.cardNumber,
    card_fee: domain.cardFee,
    card_fee_paid: domain.cardFeePaid,
    card_fee_paid_date: domain.cardFeePaidDate,
    notes: domain.notes,
  };
}

/**
 * Convert Domain StudentIdCardUpdate model to API StudentIdCardUpdate payload
 * Note: organizationId, studentId, studentAdmissionId, and academicYearId are excluded as they cannot be updated
 */
export function mapStudentIdCardDomainToUpdate(domain: StudentIdCardUpdate): StudentIdCardApi.StudentIdCardUpdate {
  const update: StudentIdCardApi.StudentIdCardUpdate = {};
  
  // organizationId, studentId, studentAdmissionId, and academicYearId are excluded - they cannot be updated
  if (domain.idCardTemplateId !== undefined) update.id_card_template_id = domain.idCardTemplateId;
  if (domain.classId !== undefined) update.class_id = domain.classId;
  if (domain.classAcademicYearId !== undefined) update.class_academic_year_id = domain.classAcademicYearId;
  if (domain.cardNumber !== undefined) update.card_number = domain.cardNumber;
  if (domain.cardFee !== undefined) update.card_fee = domain.cardFee;
  if (domain.cardFeePaid !== undefined) update.card_fee_paid = domain.cardFeePaid;
  if (domain.cardFeePaidDate !== undefined) update.card_fee_paid_date = domain.cardFeePaidDate;
  if (domain.accountId !== undefined) update.account_id = domain.accountId;
  if (domain.incomeCategoryId !== undefined) update.income_category_id = domain.incomeCategoryId;
  if (domain.isPrinted !== undefined) update.is_printed = domain.isPrinted;
  if (domain.printedAt !== undefined) update.printed_at = domain.printedAt;
  if (domain.printedBy !== undefined) update.printed_by = domain.printedBy;
  if (domain.notes !== undefined) update.notes = domain.notes;
  
  return update;
}

/**
 * Convert Domain AssignIdCardRequest to API AssignIdCardRequest payload
 */
export function mapAssignIdCardRequestDomainToApi(domain: AssignIdCardRequest): StudentIdCardApi.AssignIdCardRequest {
  return {
    academic_year_id: domain.academicYearId,
    id_card_template_id: domain.idCardTemplateId,
    student_admission_ids: domain.studentAdmissionIds,
    course_student_ids: domain.courseStudentIds,
    class_id: domain.classId,
    class_academic_year_id: domain.classAcademicYearId,
    card_fee: domain.cardFee,
    card_fee_paid: domain.cardFeePaid,
    card_fee_paid_date: domain.cardFeePaidDate,
    account_id: domain.accountId,
    income_category_id: domain.incomeCategoryId,
    card_number: domain.cardNumber,
    notes: domain.notes,
  };
}

/**
 * Convert Domain IdCardFilters to API StudentIdCardFilters payload
 */
export function mapStudentIdCardFiltersDomainToApi(domain: IdCardFilters): StudentIdCardApi.StudentIdCardFilters {
  const filters: StudentIdCardApi.StudentIdCardFilters = {};
  
  if (domain.academicYearId !== undefined) filters.academic_year_id = domain.academicYearId;
  if (domain.schoolId !== undefined) filters.school_id = domain.schoolId;
  if (domain.classId !== undefined) filters.class_id = domain.classId;
  if (domain.classAcademicYearId !== undefined) filters.class_academic_year_id = domain.classAcademicYearId;
  if (domain.courseId !== undefined) filters.course_id = domain.courseId;
  if (domain.courseStudentId !== undefined) filters.course_student_id = domain.courseStudentId;
  if (domain.studentType !== undefined) filters.student_type = domain.studentType;
  if (domain.enrollmentStatus !== undefined) filters.enrollment_status = domain.enrollmentStatus;
  if (domain.templateId !== undefined) {
    filters.template_id = domain.templateId;
    filters.id_card_template_id = domain.templateId; // Support both for backward compatibility
  }
  if (domain.isPrinted !== undefined) filters.is_printed = domain.isPrinted;
  if (domain.cardFeePaid !== undefined) filters.card_fee_paid = domain.cardFeePaid;
  if (domain.search !== undefined) filters.search = domain.search;
  if (domain.page !== undefined) filters.page = domain.page;
  if (domain.perPage !== undefined) filters.per_page = domain.perPage;
  
  return filters;
}

/**
 * Alias for backward compatibility
 */
export const mapIdCardFiltersDomainToApi = mapStudentIdCardFiltersDomainToApi;

/**
 * Convert Domain IdCardExportRequest to API IdCardExportRequest payload
 */
export function mapIdCardExportRequestDomainToApi(domain: IdCardExportRequest): StudentIdCardApi.IdCardExportRequest {
  const request: StudentIdCardApi.IdCardExportRequest = {};
  
  if (domain.cardIds !== undefined) request.card_ids = domain.cardIds;
  if (domain.format !== undefined) request.format = domain.format;
  if (domain.sides !== undefined) request.sides = domain.sides;
  if (domain.cardsPerPage !== undefined) request.cards_per_page = domain.cardsPerPage;
  if (domain.quality !== undefined) request.quality = domain.quality;
  if (domain.includeUnprinted !== undefined) request.include_unprinted = domain.includeUnprinted;
  if (domain.includeUnpaid !== undefined) request.include_unpaid = domain.includeUnpaid;
  
  return request;
}

/**
 * Convert API IdCardStatistics to Domain IdCardStatistics
 */
export function mapIdCardStatisticsApiToDomain(api: StudentIdCardApi.IdCardStatistics): IdCardStatistics {
  return {
    total: api.total,
    printed: api.printed,
    unprinted: api.unprinted,
    feePaid: api.fee_paid,
    feeUnpaid: api.fee_unpaid,
    totalFeeCollected: api.total_fee_collected,
    totalFeePending: api.total_fee_pending,
  };
}
