import type { ShortTermCourseStatus } from '@/types/api/shortTermCourse';

export interface ShortTermCourse {
  id: string;
  organizationId: string;
  schoolId: string;
  name: string;
  nameEn?: string | null;
  nameAr?: string | null;
  namePs?: string | null;
  nameFa?: string | null;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  durationDays?: number | null;
  maxStudents?: number | null;
  status: ShortTermCourseStatus;
  feeAmount?: number | null;
  instructorName?: string | null;
  location?: string | null;
  createdBy?: string | null;
  closedAt?: string | null;
  closedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}
