// Schedule Slot Domain Types - UI-friendly structure (camelCase, Date objects)

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface ScheduleSlot {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  daysOfWeek: DayOfWeek[];
  defaultDurationMinutes: number;
  academicYearId: string | null;
  schoolId: string | null;
  sortOrder: number;
  isActive: boolean;
  description: string | null;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  academicYear?: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  } | null;
  school?: {
    id: string;
    schoolName: string;
  } | null;
}
