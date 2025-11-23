export type DayName =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'
  | 'all_year';

export interface ScheduleSlot {
  id: string;
  name: string;
  start_time: string; // 'HH:MM'
  end_time: string; // 'HH:MM'
}

export interface Assignment {
  teacherId: string;
  classAcademicYearId: string;
  subjectId: string;
  // Optional metadata for display (not used in constraints)
  teacherName?: string;
  className?: string;
  subjectName?: string;
}

export interface TeacherPreference {
  teacherId: string;
  blockedSlotIds: string[]; // slots the teacher cannot teach
}

export interface SolveOptions {
  // If true, schedules on a single logical day 'all_year'
  allYear: boolean;
  // If allYear is false, use these days
  days: DayName[];
  // Maximum concurrent classes allowed per classAcademicYear per slot
  // e.g., { [classId]: 2 } to allow two parallel assignments for overbooked classes
  classMaxConcurrentPerSlot?: Record<string, number>;
  // Milliseconds to limit search (best effort)
  timeLimitMs?: number;
}

export interface TimetableEntry {
  class_academic_year_id: string;
  subject_id: string;
  teacher_id: string;
  schedule_slot_id: string;
  day_name: DayName;
  period_order: number; // minutes from midnight
}

export interface SolveResult {
  success: boolean;
  entries: TimetableEntry[];
  unscheduled: Assignment[]; // assignments that could not be scheduled (if any)
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  return h * 60 + m;
}

export class TimetableSolver {
  private assignments: Assignment[];
  private slots: ScheduleSlot[];
  private days: DayName[];
  private allYear: boolean;
  private classCapacity: Record<string, number>;
  private teacherBlocked: Record<string, Set<string>>;
  private timeLimitMs: number;

  // State for backtracking
  private solution: TimetableEntry[] = [];
  private unscheduled: Assignment[] = [];
  private teacherBusy: Record<string, Record<DayName, Set<string>>> = {};
  private classBusyCount: Record<string, Record<DayName, Record<string, number>>> = {};
  private startTime: number = 0;

  constructor(
    assignments: Assignment[],
    slots: ScheduleSlot[],
    preferences: TeacherPreference[],
    options: SolveOptions
  ) {
    this.assignments = [...assignments];
    this.slots = [...slots];
    this.allYear = options.allYear;
    this.days = options.allYear ? (['all_year'] as DayName[]) : (options.days || []);
    this.timeLimitMs = options.timeLimitMs ?? 10_000;
    this.classCapacity = options.classMaxConcurrentPerSlot || {};
    this.teacherBlocked = preferences.reduce((acc, p) => {
      acc[p.teacherId] = new Set(p.blockedSlotIds || []);
      return acc;
    }, {} as Record<string, Set<string>>);

    // Initialize occupancy maps
    for (const a of this.assignments) {
      if (!this.teacherBusy[a.teacherId]) {
        this.teacherBusy[a.teacherId] = {} as Record<DayName, Set<string>>;
      }
      for (const d of this.days) {
        if (!this.teacherBusy[a.teacherId][d]) this.teacherBusy[a.teacherId][d] = new Set();
      }
      if (!this.classBusyCount[a.classAcademicYearId]) {
        this.classBusyCount[a.classAcademicYearId] = {} as Record<
          DayName,
          Record<string, number>
        >;
      }
      for (const d of this.days) {
        if (!this.classBusyCount[a.classAcademicYearId][d]) {
          this.classBusyCount[a.classAcademicYearId][d] = {};
        }
      }
    }
  }

  public solve(): SolveResult {
    // Heuristic: sort assignments by teacher and class to reduce branching
    this.assignments.sort((a, b) => {
      if (a.classAcademicYearId !== b.classAcademicYearId) {
        return a.classAcademicYearId.localeCompare(b.classAcademicYearId);
      }
      return a.teacherId.localeCompare(b.teacherId);
    });

    this.startTime = Date.now();
    const success = this.backtrack(0);
    return {
      success,
      entries: this.solution,
      unscheduled: this.unscheduled,
    };
  }

  private backtrack(index: number): boolean {
    if (Date.now() - this.startTime > this.timeLimitMs) {
      // Time limit exceeded: treat remaining as unscheduled
      for (let i = index; i < this.assignments.length; i++) {
        this.unscheduled.push(this.assignments[i]);
      }
      return true; // stop search gracefully
    }

    if (index >= this.assignments.length) {
      return true;
    }

    const a = this.assignments[index];
    const candidatePlacements = this.generateCandidatePlacements(a);

    for (const { slotId, day, periodOrder } of candidatePlacements) {
      if (!this.canPlace(a, day, slotId)) continue;
      this.place(a, day, slotId);
      this.solution.push({
        class_academic_year_id: a.classAcademicYearId,
        subject_id: a.subjectId,
        teacher_id: a.teacherId,
        schedule_slot_id: slotId,
        day_name: day,
        period_order: periodOrder,
      });

      if (this.backtrack(index + 1)) {
        return true;
      }

      // undo
      this.solution.pop();
      this.unplace(a, day, slotId);
    }

    // If no placement possible, mark as unscheduled and continue
    this.unscheduled.push(a);
    return this.backtrack(index + 1);
  }

  private generateCandidatePlacements(a: Assignment): Array<{
    slotId: string;
    day: DayName;
    periodOrder: number;
  }> {
    const blocked = this.teacherBlocked[a.teacherId] || new Set<string>();
    const candidates: Array<{ slotId: string; day: DayName; periodOrder: number }> = [];
    for (const d of this.days) {
      for (const s of this.slots) {
        if (blocked.has(s.id)) continue;
        candidates.push({
          slotId: s.id,
          day: d,
          periodOrder: timeToMinutes(s.start_time),
        });
      }
    }
    // sort by period order to prefer earlier slots
    candidates.sort((x, y) => x.periodOrder - y.periodOrder);
    return candidates;
  }

  private canPlace(a: Assignment, day: DayName, slotId: string): boolean {
    // teacher conflict
    if (this.teacherBusy[a.teacherId][day].has(slotId)) return false;

    // class capacity
    const cap = this.classCapacity[a.classAcademicYearId] ?? 1;
    const count = this.classBusyCount[a.classAcademicYearId][day][slotId] || 0;
    if (count >= cap) return false;

    return true;
  }

  private place(a: Assignment, day: DayName, slotId: string): void {
    this.teacherBusy[a.teacherId][day].add(slotId);
    const curr = this.classBusyCount[a.classAcademicYearId][day][slotId] || 0;
    this.classBusyCount[a.classAcademicYearId][day][slotId] = curr + 1;
  }

  private unplace(a: Assignment, day: DayName, slotId: string): void {
    this.teacherBusy[a.teacherId][day].delete(slotId);
    const curr = this.classBusyCount[a.classAcademicYearId][day][slotId] || 0;
    this.classBusyCount[a.classAcademicYearId][day][slotId] = Math.max(0, curr - 1);
  }
}


