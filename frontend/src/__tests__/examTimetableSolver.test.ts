import { describe, expect, it } from 'vitest';

import {
  buildExamDays,
  canMoveExamEntry,
  solveExamTimetable,
  type ExamSolverEntry,
  type ExamSolverSubject,
} from '@/lib/examTimetableSolver';

const subjects: ExamSolverSubject[] = [
  { examSubjectId: 'es-math-10', examClassId: 'ec-10', subjectId: 'sub-math', subjectName: 'Math', className: '10A' },
  { examSubjectId: 'es-eng-10', examClassId: 'ec-10', subjectId: 'sub-eng', subjectName: 'English', className: '10A' },
  { examSubjectId: 'es-phy-10', examClassId: 'ec-10', subjectId: 'sub-phy', subjectName: 'Physics', className: '10A' },
  { examSubjectId: 'es-math-9', examClassId: 'ec-9', subjectId: 'sub-math', subjectName: 'Math', className: '9B' },
  { examSubjectId: 'es-dari-9', examClassId: 'ec-9', subjectId: 'sub-dari', subjectName: 'Dari', className: '9B' },
];

describe('buildExamDays', () => {
  it('builds inclusive range and skips rest days', () => {
    const days = buildExamDays('2026-07-15', '2026-07-18', ['2026-07-17']);
    expect(days).toEqual(['2026-07-15', '2026-07-16', '2026-07-18']);
  });

  it('returns empty for invalid range', () => {
    expect(buildExamDays('2026-07-20', '2026-07-10')).toEqual([]);
  });
});

describe('solveExamTimetable', () => {
  it('places one paper per class per day', () => {
    const days = buildExamDays('2026-07-15', '2026-07-20', []);
    const result = solveExamTimetable(subjects, {
      examDays: days,
      startTime: '08:00',
      endTime: '11:00',
    });

    expect(result.unscheduled).toHaveLength(0);
    const byClassDate = new Map<string, number>();
    for (const e of result.entries) {
      const key = `${e.examClassId}|${e.date}`;
      byClassDate.set(key, (byClassDate.get(key) ?? 0) + 1);
    }
    for (const count of byClassDate.values()) {
      expect(count).toBe(1);
    }
  });

  it('skips rest days via examDays input', () => {
    const days = buildExamDays('2026-07-15', '2026-07-17', ['2026-07-16']);
    const result = solveExamTimetable(
      [
        { examSubjectId: 'es1', examClassId: 'ec1', subjectId: 's1' },
        { examSubjectId: 'es2', examClassId: 'ec1', subjectId: 's2' },
      ],
      { examDays: days, startTime: '08:00', endTime: '11:00' }
    );
    expect(result.entries.every((e) => e.date !== '2026-07-16')).toBe(true);
    expect(result.entries.map((e) => e.date).sort()).toEqual(['2026-07-15', '2026-07-17']);
  });

  it('prefers same subject_id on the same day across classes', () => {
    const days = buildExamDays('2026-07-15', '2026-07-20', []);
    const result = solveExamTimetable(subjects, {
      examDays: days,
      startTime: '08:00',
      endTime: '11:00',
    });
    const mathDates = result.entries
      .filter((e) => e.subjectId === 'sub-math')
      .map((e) => e.date);
    expect(new Set(mathDates).size).toBe(1);
  });

  it('respects locked slots and does not reschedule locked subjects', () => {
    const days = buildExamDays('2026-07-15', '2026-07-20', []);
    const result = solveExamTimetable(subjects, {
      examDays: days,
      startTime: '08:00',
      endTime: '11:00',
      lockedSlots: [
        {
          examSubjectId: 'es-math-10',
          examClassId: 'ec-10',
          date: '2026-07-18',
          startTime: '09:00',
          endTime: '12:00',
        },
      ],
    });

    const locked = result.entries.find((e) => e.examSubjectId === 'es-math-10');
    expect(locked?.isLocked).toBe(true);
    expect(locked?.date).toBe('2026-07-18');
    expect(locked?.startTime).toBe('09:00');

    // No other paper for class 10 on that locked day
    const sameDay = result.entries.filter(
      (e) => e.examClassId === 'ec-10' && e.date === '2026-07-18'
    );
    expect(sameDay).toHaveLength(1);
  });

  it('returns unscheduled when not enough exam days', () => {
    const result = solveExamTimetable(
      [
        { examSubjectId: 'a', examClassId: 'c1', subjectId: 's1' },
        { examSubjectId: 'b', examClassId: 'c1', subjectId: 's2' },
        { examSubjectId: 'c', examClassId: 'c1', subjectId: 's3' },
      ],
      {
        examDays: ['2026-07-15'],
        startTime: '08:00',
        endTime: '11:00',
      }
    );
    expect(result.entries.filter((e) => !e.isLocked)).toHaveLength(1);
    expect(result.unscheduled).toHaveLength(2);
  });

  it('assigns distinct rooms per day when enabled', () => {
    const result = solveExamTimetable(
      [
        { examSubjectId: 'a', examClassId: 'c1', subjectId: 's1' },
        { examSubjectId: 'b', examClassId: 'c2', subjectId: 's1' },
      ],
      {
        examDays: ['2026-07-15'],
        startTime: '08:00',
        endTime: '11:00',
        assignRooms: true,
        rooms: [{ id: 'r1' }, { id: 'r2' }],
      }
    );
    const rooms = result.entries.map((e) => e.roomId);
    expect(rooms).toContain('r1');
    expect(rooms).toContain('r2');
    expect(new Set(rooms).size).toBe(2);
  });
});

describe('canMoveExamEntry', () => {
  const entries: ExamSolverEntry[] = [
    {
      examClassId: 'ec-10',
      examSubjectId: 'es-math-10',
      subjectId: 'sub-math',
      date: '2026-07-15',
      startTime: '08:00',
      endTime: '11:00',
      isLocked: false,
    },
    {
      examClassId: 'ec-10',
      examSubjectId: 'es-eng-10',
      subjectId: 'sub-eng',
      date: '2026-07-16',
      startTime: '08:00',
      endTime: '11:00',
      isLocked: false,
    },
    {
      examClassId: 'ec-10',
      examSubjectId: 'es-phy-10',
      subjectId: 'sub-phy',
      date: '2026-07-18',
      startTime: '08:00',
      endTime: '11:00',
      isLocked: true,
    },
  ];

  it('blocks move onto occupied class day', () => {
    expect(canMoveExamEntry(entries, 0, '2026-07-16')).toBe(false);
  });

  it('allows move onto free exam day', () => {
    expect(canMoveExamEntry(entries, 0, '2026-07-17')).toBe(true);
  });

  it('blocks move onto rest day', () => {
    expect(canMoveExamEntry(entries, 0, '2026-07-17', ['2026-07-17'])).toBe(false);
  });

  it('blocks moving locked entries', () => {
    expect(canMoveExamEntry(entries, 2, '2026-07-17')).toBe(false);
  });
});
