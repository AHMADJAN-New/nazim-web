/**
 * Client-side exam timetable solver.
 * Places one paper per class per exam day, preferring same subject_id on the same day.
 */

export interface ExamSolverSubject {
  examSubjectId: string;
  examClassId: string;
  subjectId: string;
  subjectName?: string;
  className?: string;
}

export interface ExamSolverLockedSlot {
  examSubjectId: string;
  examClassId: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  roomId?: string | null;
  invigilatorId?: string | null;
}

export interface ExamSolverRoom {
  id: string;
}

export interface ExamSolverStaff {
  id: string;
}

export interface ExamSolverOptions {
  /** Inclusive exam day list already excluding rest days (YYYY-MM-DD) */
  examDays: string[];
  startTime: string;
  endTime: string;
  lockedSlots?: ExamSolverLockedSlot[];
  assignRooms?: boolean;
  rooms?: ExamSolverRoom[];
  assignInvigilators?: boolean;
  staff?: ExamSolverStaff[];
}

export interface ExamSolverEntry {
  examClassId: string;
  examSubjectId: string;
  subjectId: string;
  date: string;
  startTime: string;
  endTime: string;
  roomId?: string | null;
  invigilatorId?: string | null;
  isLocked: boolean;
  subjectName?: string;
  className?: string;
}

export interface ExamSolverResult {
  entries: ExamSolverEntry[];
  unscheduled: ExamSolverSubject[];
}

/** Build YYYY-MM-DD list from start..end inclusive, excluding rest days. */
export function buildExamDays(
  startDate: string,
  endDate: string,
  restDays: string[] = []
): string[] {
  const rest = new Set(restDays);
  const days: string[] = [];
  const start = parseYmd(startDate);
  const end = parseYmd(endDate);
  if (!start || !end || start > end) return days;

  const cur = new Date(start.getTime());
  while (cur <= end) {
    const key = formatYmd(cur);
    if (!rest.has(key)) {
      days.push(key);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function parseYmd(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function solveExamTimetable(
  subjects: ExamSolverSubject[],
  options: ExamSolverOptions
): ExamSolverResult {
  const examDays = [...options.examDays].sort();
  const locked = options.lockedSlots ?? [];
  const startTime = options.startTime;
  const endTime = options.endTime;

  // Occupancy: classId -> Set of dates that already have a paper
  const classBusy = new Map<string, Set<string>>();
  const scheduledSubjectIds = new Set<string>();
  const entries: ExamSolverEntry[] = [];

  const ensureBusy = (classId: string) => {
    if (!classBusy.has(classId)) classBusy.set(classId, new Set());
    return classBusy.get(classId)!;
  };

  // Seed locked slots
  for (const slot of locked) {
    ensureBusy(slot.examClassId).add(slot.date);
    scheduledSubjectIds.add(slot.examSubjectId);
    const subj = subjects.find((s) => s.examSubjectId === slot.examSubjectId);
    entries.push({
      examClassId: slot.examClassId,
      examSubjectId: slot.examSubjectId,
      subjectId: subj?.subjectId ?? '',
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      roomId: slot.roomId ?? null,
      invigilatorId: slot.invigilatorId ?? null,
      isLocked: true,
      subjectName: subj?.subjectName,
      className: subj?.className,
    });
  }

  // Subjects still needing a slot
  const pending = subjects.filter((s) => !scheduledSubjectIds.has(s.examSubjectId));

  // Group by subjectId
  const groups = new Map<string, ExamSolverSubject[]>();
  for (const s of pending) {
    const list = groups.get(s.subjectId) ?? [];
    list.push(s);
    groups.set(s.subjectId, list);
  }

  // Largest groups first (prefer shared papers on same day)
  const sortedGroups = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  const unscheduled: ExamSolverSubject[] = [];
  let roomCursor = 0;
  let staffCursor = 0;
  const rooms = options.assignRooms ? (options.rooms ?? []) : [];
  const staff = options.assignInvigilators ? (options.staff ?? []) : [];
  /** date -> room ids used that day (for optional room assignment) */
  const roomsUsedByDate = new Map<string, Set<string>>();

  const pickRoom = (date: string): string | null => {
    if (!options.assignRooms || rooms.length === 0) return null;
    const used = roomsUsedByDate.get(date) ?? new Set();
    for (let i = 0; i < rooms.length; i++) {
      const idx = (roomCursor + i) % rooms.length;
      const room = rooms[idx];
      if (!used.has(room.id)) {
        used.add(room.id);
        roomsUsedByDate.set(date, used);
        roomCursor = (idx + 1) % rooms.length;
        return room.id;
      }
    }
    return null;
  };

  const pickInvigilator = (): string | null => {
    if (!options.assignInvigilators || staff.length === 0) return null;
    const id = staff[staffCursor % staff.length].id;
    staffCursor += 1;
    return id;
  };

  const isClassFree = (classId: string, date: string) => !ensureBusy(classId).has(date);

  const place = (subj: ExamSolverSubject, date: string) => {
    ensureBusy(subj.examClassId).add(date);
    scheduledSubjectIds.add(subj.examSubjectId);
    entries.push({
      examClassId: subj.examClassId,
      examSubjectId: subj.examSubjectId,
      subjectId: subj.subjectId,
      date,
      startTime,
      endTime,
      roomId: pickRoom(date),
      invigilatorId: pickInvigilator(),
      isLocked: false,
      subjectName: subj.subjectName,
      className: subj.className,
    });
  };

  for (const [, group] of sortedGroups) {
    // Try to place entire group on the same earliest day
    let placedAsGroup = false;
    for (const day of examDays) {
      if (group.every((s) => isClassFree(s.examClassId, day))) {
        for (const s of group) {
          place(s, day);
        }
        placedAsGroup = true;
        break;
      }
    }

    if (placedAsGroup) continue;

    // Fall back: place each class on its earliest free day
    for (const s of group) {
      let placed = false;
      for (const day of examDays) {
        if (isClassFree(s.examClassId, day)) {
          place(s, day);
          placed = true;
          break;
        }
      }
      if (!placed) {
        unscheduled.push(s);
      }
    }
  }

  // Sort entries by date then class for stable output
  entries.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.examClassId.localeCompare(b.examClassId);
  });

  return { entries, unscheduled };
}

/** Validate moving an unlocked entry to a new date (one paper per class per day). */
export function canMoveExamEntry(
  entries: ExamSolverEntry[],
  entryIndex: number,
  newDate: string,
  restDays: string[] = []
): boolean {
  const entry = entries[entryIndex];
  if (!entry || entry.isLocked) return false;
  if (restDays.includes(newDate)) return false;
  if (entry.date === newDate) return true;

  const conflict = entries.some(
    (e, i) =>
      i !== entryIndex &&
      e.examClassId === entry.examClassId &&
      e.date === newDate
  );
  return !conflict;
}
