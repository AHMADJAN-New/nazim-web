export type ClassSortMode = 'asc' | 'desc' | 'viewing';

export interface SortableClassName {
  name: string;
  gradeLevel: number | null;
}

/** PostgreSQL `time` values arrive as HH:MM:SS. Slot editors and the API expect HH:MM. */
export function normalizeClock(value: string | null | undefined): string {
  if (!value) return '';
  const match = value.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : value;
}

export function slotKey(parts: {
  examClassId: string;
  date: string;
  startTime: string;
  endTime: string;
}): string {
  return `${parts.examClassId}|${parts.date.slice(0, 10)}|${normalizeClock(parts.startTime)}|${normalizeClock(parts.endTime)}`;
}

export function compareClassNames(
  a: SortableClassName,
  b: SortableClassName,
  mode: ClassSortMode,
): number {
  if (mode === 'viewing') {
    const aGrade = a.gradeLevel;
    const bGrade = b.gradeLevel;
    if (aGrade != null && bGrade != null && aGrade !== bGrade) {
      return aGrade - bGrade;
    }
    if (aGrade != null && bGrade == null) return -1;
    if (aGrade == null && bGrade != null) return 1;
  }

  const byName = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  return mode === 'desc' ? -byName : byName;
}

export function sortClassesByMode<T extends SortableClassName>(
  classes: T[],
  mode: ClassSortMode,
): T[] {
  return [...classes].sort((a, b) => compareClassNames(a, b, mode));
}
