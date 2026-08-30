import type { Student } from '@/types/domain/student';

export type ClassChangeStudentResolution =
  | { action: 'preserve'; studentId: string }
  | { action: 'clear' };

/** History tab filters: month/year only (not create-form student/class). */
export function buildLeaveHistoryFilters(month: number, year: number) {
  return { month, year };
}

/**
 * When class changes after a card scan, preserve the scanned student instead of clearing.
 */
export function resolveStudentSelectionOnClassChange(
  pendingStudentId: string | null
): ClassChangeStudentResolution {
  if (pendingStudentId) {
    return { action: 'preserve', studentId: pendingStudentId };
  }
  return { action: 'clear' };
}

export function findStudentBySearchTerm(
  students: Pick<Student, 'id' | 'cardNumber' | 'studentCode' | 'admissionNumber'>[],
  searchTerm: string
): Pick<Student, 'id' | 'cardNumber' | 'studentCode' | 'admissionNumber'> | undefined {
  const trimmedSearch = searchTerm.trim().toLowerCase();
  if (!trimmedSearch) {
    return undefined;
  }

  return students.find((student) => {
    const card = (student.cardNumber ?? '').toLowerCase();
    const code = (student.studentCode ?? '').toLowerCase();
    const admission = (student.admissionNumber ?? '').toLowerCase();
    const id = student.id.toLowerCase();

    return (
      card === trimmedSearch ||
      code === trimmedSearch ||
      admission === trimmedSearch ||
      id === trimmedSearch
    );
  });
}

export function getInitialLeaveFilterDate(
  now: Date,
  academicYear?: { startDate: Date | string; endDate: Date | string } | null
): Date {
  let initialDate = new Date(now.getFullYear(), now.getMonth(), 1);

  if (!academicYear) {
    return initialDate;
  }

  const academicStart = new Date(academicYear.startDate);
  const academicEnd = new Date(academicYear.endDate);

  if (initialDate < academicStart) {
    initialDate = new Date(academicStart.getFullYear(), academicStart.getMonth(), 1);
  } else if (initialDate > academicEnd) {
    initialDate = new Date(academicEnd.getFullYear(), academicEnd.getMonth(), 1);
  }

  return initialDate;
}
