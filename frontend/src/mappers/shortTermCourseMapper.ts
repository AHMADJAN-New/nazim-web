import type * as Api from '@/types/api/shortTermCourse';
import type { ShortTermCourse } from '@/types/domain/shortTermCourse';

export const mapShortTermCourseApiToDomain = (course: Api.ShortTermCourse): ShortTermCourse => ({
  id: course.id,
  organizationId: course.organization_id,
  schoolId: course.school_id,
  name: course.name,
  nameEn: course.name_en ?? null,
  nameAr: course.name_ar ?? null,
  namePs: course.name_ps ?? null,
  nameFa: course.name_fa ?? null,
  description: course.description ?? null,
  startDate: course.start_date ?? null,
  endDate: course.end_date ?? null,
  durationDays: course.duration_days ?? null,
  maxStudents: course.max_students ?? null,
  status: course.status,
  feeAmount: course.fee_amount ?? null,
  instructorName: course.instructor_name ?? null,
  location: course.location ?? null,
  createdBy: course.created_by ?? null,
  closedAt: course.closed_at ?? null,
  closedBy: course.closed_by ?? null,
  createdAt: course.created_at,
  updatedAt: course.updated_at,
});

export const mapShortTermCourseDomainToInsert = (course: Partial<ShortTermCourse>): Api.ShortTermCourseInsert => ({
  organization_id: course.organizationId!,
  name: course.name!,
  name_en: course.nameEn ?? null,
  name_ar: course.nameAr ?? null,
  name_ps: course.namePs ?? null,
  name_fa: course.nameFa ?? null,
  description: course.description ?? null,
  start_date: course.startDate ?? null,
  end_date: course.endDate ?? null,
  duration_days: course.durationDays ?? null,
  max_students: course.maxStudents ?? null,
  status: course.status,
  fee_amount: course.feeAmount ?? null,
  instructor_name: course.instructorName ?? null,
  location: course.location ?? null,
});

export const mapShortTermCourseDomainToUpdate = (
  course: Partial<ShortTermCourse>,
): Api.ShortTermCourseUpdate => ({
  name: course.name,
  name_en: course.nameEn,
  name_ar: course.nameAr,
  name_ps: course.namePs,
  name_fa: course.nameFa,
  description: course.description,
  start_date: course.startDate,
  end_date: course.endDate,
  duration_days: course.durationDays,
  max_students: course.maxStudents,
  status: course.status,
  fee_amount: course.feeAmount,
  instructor_name: course.instructorName,
  location: course.location,
});
