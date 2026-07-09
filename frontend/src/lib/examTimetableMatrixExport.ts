import { parseLocalDate } from '@/lib/dateUtils';

export interface ExamTimetableMatrixSlot {
  examClassId: string;
  date: string; // YYYY-MM-DD
  subjectName: string;
}

export interface ExamTimetableMatrixClass {
  id: string;
  /** Display name for the row (base class only — no section). */
  name: string;
  /**
   * Optional stable key for merging sections of the same class into one row.
   * Defaults to `name` when omitted.
   */
  groupKey?: string;
}

export interface ExamTimetableMatrixColumn {
  key: string;
  label: string;
}

export interface ExamTimetableMatrixExport {
  columns: ExamTimetableMatrixColumn[];
  rows: Record<string, string>[];
}

const WEEKDAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export function getWeekdayKey(dateYmd: string): (typeof WEEKDAY_KEYS)[number] {
  const d = parseLocalDate(dateYmd);
  const day = Number.isNaN(d.getTime()) ? 0 : d.getDay();
  return WEEKDAY_KEYS[day] ?? 'sunday';
}

function pushUnique(list: string[], value: string): void {
  if (value && !list.includes(value)) {
    list.push(value);
  }
}

/**
 * Build class × date matrix for exam timetable PDF/Excel export.
 * Columns: Class + one column per exam day (rest days omitted by only including dates present in slots).
 * Cells: subject name only.
 * Sections of the same class (same groupKey/name) are merged into a single row.
 */
export function buildExamTimetableMatrixExport(
  classes: ExamTimetableMatrixClass[],
  slots: ExamTimetableMatrixSlot[],
  options: {
    classColumnLabel: string;
    formatDayHeader: (dateYmd: string, weekdayKey: string) => string;
  }
): ExamTimetableMatrixExport {
  const dates = Array.from(new Set(slots.map((s) => s.date))).sort();

  const classById = new Map(classes.map((c) => [c.id, c]));

  // Map each exam-class id → group key + display name
  const groupMeta = new Map<string, { name: string; examClassIds: string[] }>();
  const examClassToGroup = new Map<string, string>();

  for (const cls of classes) {
    const key = (cls.groupKey || cls.name).trim() || cls.id;
    examClassToGroup.set(cls.id, key);
    const existing = groupMeta.get(key);
    if (existing) {
      existing.examClassIds.push(cls.id);
    } else {
      groupMeta.set(key, { name: cls.name, examClassIds: [cls.id] });
    }
  }

  // Also cover slots whose examClassId wasn't in classes list
  for (const slot of slots) {
    if (examClassToGroup.has(slot.examClassId)) continue;
    const fallback = classById.get(slot.examClassId);
    const key = (fallback?.groupKey || fallback?.name || slot.examClassId).trim();
    examClassToGroup.set(slot.examClassId, key);
    if (!groupMeta.has(key)) {
      groupMeta.set(key, {
        name: fallback?.name || 'Class',
        examClassIds: [slot.examClassId],
      });
    } else {
      groupMeta.get(key)!.examClassIds.push(slot.examClassId);
    }
  }

  const byGroupDate = new Map<string, string[]>();
  const groupsWithSlots = new Set<string>();

  for (const slot of slots) {
    const groupKey = examClassToGroup.get(slot.examClassId) ?? slot.examClassId;
    groupsWithSlots.add(groupKey);
    const cellKey = `${groupKey}|${slot.date}`;
    const list = byGroupDate.get(cellKey) ?? [];
    pushUnique(list, slot.subjectName);
    byGroupDate.set(cellKey, list);
  }

  // Preserve first-seen class order, then only groups that have slots
  const orderedGroupKeys: string[] = [];
  for (const cls of classes) {
    const key = examClassToGroup.get(cls.id);
    if (!key || !groupsWithSlots.has(key)) continue;
    if (!orderedGroupKeys.includes(key)) {
      orderedGroupKeys.push(key);
    }
  }
  for (const key of groupsWithSlots) {
    if (!orderedGroupKeys.includes(key)) {
      orderedGroupKeys.push(key);
    }
  }

  const columns: ExamTimetableMatrixColumn[] = [
    { key: 'className', label: options.classColumnLabel },
    ...dates.map((date) => ({
      key: `day_${date}`,
      label: options.formatDayHeader(date, getWeekdayKey(date)),
    })),
  ];

  const rows = orderedGroupKeys.map((groupKey) => {
    const meta = groupMeta.get(groupKey);
    const row: Record<string, string> = {
      className: meta?.name ?? groupKey,
    };
    for (const date of dates) {
      const subjects = byGroupDate.get(`${groupKey}|${date}`) ?? [];
      row[`day_${date}`] = subjects.join(' / ');
    }
    return row;
  });

  return { columns, rows };
}
