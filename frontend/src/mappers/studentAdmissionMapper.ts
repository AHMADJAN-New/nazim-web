// Student Admission Mapper - Converts between API (snake_case) and Domain (camelCase) models

import type * as StudentAdmissionApi from '@/types/api/studentAdmission';
import type { StudentAdmission, StudentAdmissionInsert, StudentAdmissionUpdate, AdmissionStats } from '@/types/domain/studentAdmission';

/**
 * Convert API StudentAdmission model to Domain StudentAdmission model
 */
export function mapStudentAdmissionApiToDomain(api: StudentAdmissionApi.StudentAdmission): StudentAdmission {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    studentId: api.student_id,
    academicYearId: api.academic_year_id,
    classId: api.class_id,
    classAcademicYearId: api.class_academic_year_id,
    residencyTypeId: api.residency_type_id,
    roomId: api.room_id,
    admissionYear: api.admission_year,
    admissionDate: new Date(api.admission_date),
    enrollmentStatus: api.enrollment_status,
    enrollmentType: api.enrollment_type,
    shift: api.shift,
    isBoarder: api.is_boarder,
    feeStatus: api.fee_status,
    placementNotes: api.placement_notes,
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
    student: api.student ? {
      id: api.student.id,
      fullName: api.student.full_name,
      admissionNumber: api.student.admission_no,
      gender: api.student.gender,
      admissionYear: api.student.admission_year,
      guardianPhone: api.student.guardian_phone,
    } : undefined,
    organization: api.organization,
    academicYear: api.academic_year ? {
      id: api.academic_year.id,
      name: api.academic_year.name,
      startDate: new Date(api.academic_year.start_date),
      endDate: new Date(api.academic_year.end_date),
    } : undefined,
    class: api.class,
    classAcademicYear: api.class_academic_year ? {
      id: api.class_academic_year.id,
      sectionName: api.class_academic_year.section_name,
    } : undefined,
    residencyType: api.residency_type,
    room: api.room ? {
      id: api.room.id,
      roomNumber: api.room.room_number,
    } : undefined,
    school: api.school ? {
      id: api.school.id,
      schoolName: api.school.school_name,
    } : undefined,
  };
}

/**
 * Convert Domain StudentAdmissionInsert model to API StudentAdmissionInsert payload
 */
export function mapStudentAdmissionDomainToInsert(domain: StudentAdmissionInsert): StudentAdmissionApi.StudentAdmissionInsert {
  return {
    student_id: domain.studentId,
    organization_id: domain.organizationId,
    school_id: domain.schoolId,
    academic_year_id: domain.academicYearId,
    class_id: domain.classId,
    class_academic_year_id: domain.classAcademicYearId,
    residency_type_id: domain.residencyTypeId,
    room_id: domain.roomId,
    admission_year: domain.admissionYear,
    admission_date: domain.admissionDate,
    enrollment_status: domain.enrollmentStatus,
    enrollment_type: domain.enrollmentType,
    shift: domain.shift,
    is_boarder: domain.isBoarder,
    fee_status: domain.feeStatus,
    placement_notes: domain.placementNotes,
  };
}

/**
 * Convert Domain StudentAdmissionUpdate model to API StudentAdmissionUpdate payload
 * Note: organizationId and schoolId are excluded as they cannot be updated
 */
export function mapStudentAdmissionDomainToUpdate(domain: StudentAdmissionUpdate): StudentAdmissionApi.StudentAdmissionUpdate {
  const update: StudentAdmissionApi.StudentAdmissionUpdate = {};
  
  if (domain.studentId !== undefined) update.student_id = domain.studentId;
  // organizationId and schoolId are excluded - they cannot be updated
  if (domain.academicYearId !== undefined) update.academic_year_id = domain.academicYearId;
  if (domain.classId !== undefined) update.class_id = domain.classId;
  if (domain.classAcademicYearId !== undefined) update.class_academic_year_id = domain.classAcademicYearId;
  if (domain.residencyTypeId !== undefined) update.residency_type_id = domain.residencyTypeId;
  if (domain.roomId !== undefined) update.room_id = domain.roomId;
  if (domain.admissionYear !== undefined) update.admission_year = domain.admissionYear;
  if (domain.admissionDate !== undefined) update.admission_date = domain.admissionDate;
  if (domain.enrollmentStatus !== undefined) update.enrollment_status = domain.enrollmentStatus;
  if (domain.enrollmentType !== undefined) update.enrollment_type = domain.enrollmentType;
  if (domain.shift !== undefined) update.shift = domain.shift;
  if (domain.isBoarder !== undefined) update.is_boarder = domain.isBoarder;
  if (domain.feeStatus !== undefined) update.fee_status = domain.feeStatus;
  if (domain.placementNotes !== undefined) update.placement_notes = domain.placementNotes;
  
  return update;
}

/**
 * Convert API AdmissionStats to Domain AdmissionStats (no transformation needed, but for consistency)
 */
export function mapAdmissionStatsApiToDomain(api: StudentAdmissionApi.AdmissionStats): AdmissionStats {
  return api;
}
