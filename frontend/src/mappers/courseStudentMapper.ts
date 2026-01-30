import type * as Api from '@/types/api/courseStudent';
import type { CourseStudent } from '@/types/domain/courseStudent';

/** Coerce value to string or null for API string columns (avoids sending numbers as strings). */
function toStr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return String(value);
  const s = typeof value === 'string' ? value.trim() : String(value);
  return s === '' ? null : s;
}

/** Coerce value to integer or null for API integer columns (birth_year, age). */
function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === 'string') {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/** Coerce value to number or null for fee_amount. */
function toNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

export const mapCourseStudentApiToDomain = (student: Api.CourseStudent): CourseStudent => ({
  id: student.id,
  organizationId: student.organization_id,
  courseId: student.course_id,
  mainStudentId: student.main_student_id ?? null,
  admissionNo: student.admission_no,
  registrationDate: student.registration_date,
  completionStatus: student.completion_status,
  completionDate: student.completion_date ?? null,
  grade: student.grade ?? null,
  certificateIssued: student.certificate_issued,
  certificateIssuedDate: student.certificate_issued_date ?? null,
  feePaid: student.fee_paid,
  feePaidDate: student.fee_paid_date ?? null,
  feeAmount: student.fee_amount ?? null,
  fullName: student.full_name,
  fatherName: student.father_name ?? null,
  grandfatherName: student.grandfather_name ?? null,
  motherName: student.mother_name ?? null,
  gender: student.gender ?? null,
  birthYear: student.birth_year ?? null,
  birthDate: student.birth_date ?? null,
  age: student.age ?? null,
  origProvince: student.orig_province ?? null,
  origDistrict: student.orig_district ?? null,
  origVillage: student.orig_village ?? null,
  currProvince: student.curr_province ?? null,
  currDistrict: student.curr_district ?? null,
  currVillage: student.curr_village ?? null,
  nationality: student.nationality ?? null,
  preferredLanguage: student.preferred_language ?? null,
  guardianName: student.guardian_name ?? null,
  guardianRelation: student.guardian_relation ?? null,
  guardianPhone: student.guardian_phone ?? null,
  homeAddress: student.home_address ?? null,
  picturePath: student.picture_path ?? null,
  isOrphan: student.is_orphan ?? null,
  disabilityStatus: student.disability_status ?? null,
  createdAt: student.created_at,
  updatedAt: student.updated_at,
});

export const mapCourseStudentDomainToInsert = (student: Partial<CourseStudent>): Api.CourseStudentInsert => ({
  organization_id: student.organizationId!,
  course_id: student.courseId!,
  admission_no: toStr(student.admissionNo) ?? undefined,
  registration_date: student.registrationDate!,
  completion_status: student.completionStatus ?? undefined,
  fee_paid: student.feePaid ?? false,
  fee_amount: toNum(student.feeAmount),
  full_name: toStr(student.fullName) ?? '',
  father_name: toStr(student.fatherName),
  grandfather_name: toStr(student.grandfatherName),
  mother_name: toStr(student.motherName),
  gender: toStr(student.gender),
  birth_year: toInt(student.birthYear),
  birth_date: student.birthDate || undefined,
  age: toInt(student.age),
  orig_province: toStr(student.origProvince),
  orig_district: toStr(student.origDistrict),
  orig_village: toStr(student.origVillage),
  curr_province: toStr(student.currProvince),
  curr_district: toStr(student.currDistrict),
  curr_village: toStr(student.currVillage),
  nationality: toStr(student.nationality),
  preferred_language: toStr(student.preferredLanguage),
  guardian_name: toStr(student.guardianName),
  guardian_relation: toStr(student.guardianRelation),
  guardian_phone: toStr(student.guardianPhone),
  home_address: toStr(student.homeAddress),
  is_orphan: student.isOrphan ?? undefined,
  disability_status: toStr(student.disabilityStatus),
});

export const mapCourseStudentDomainToUpdate = (
  student: Partial<CourseStudent>,
): Api.CourseStudentUpdate => ({
  course_id: student.courseId,
  admission_no: student.admissionNo !== undefined ? toStr(student.admissionNo) ?? undefined : undefined,
  registration_date: student.registrationDate,
  completion_status: student.completionStatus,
  completion_date: student.completionDate,
  grade: student.grade !== undefined ? toStr(student.grade) ?? undefined : undefined,
  certificate_issued: student.certificateIssued,
  certificate_issued_date: student.certificateIssuedDate,
  fee_paid: student.feePaid,
  fee_paid_date: student.feePaidDate,
  fee_amount: student.feeAmount !== undefined ? toNum(student.feeAmount) : undefined,
  full_name: student.fullName !== undefined ? toStr(student.fullName) ?? undefined : undefined,
  guardian_name: student.guardianName !== undefined ? toStr(student.guardianName) ?? undefined : undefined,
  guardian_phone: student.guardianPhone !== undefined ? toStr(student.guardianPhone) ?? undefined : undefined,
  home_address: student.homeAddress !== undefined ? toStr(student.homeAddress) ?? undefined : undefined,
});
