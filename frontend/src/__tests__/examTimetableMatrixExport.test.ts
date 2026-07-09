import { describe, expect, it } from 'vitest';

import {
  buildExamTimetableMatrixExport,
  getWeekdayKey,
} from '@/lib/examTimetableMatrixExport';

describe('examTimetableMatrixExport', () => {
  it('builds class × date columns and subject cells', () => {
    const result = buildExamTimetableMatrixExport(
      [
        { id: 'c1', name: 'Class A' },
        { id: 'c2', name: 'Class B' },
      ],
      [
        { examClassId: 'c1', date: '2026-07-10', subjectName: 'Math' },
        { examClassId: 'c1', date: '2026-07-12', subjectName: 'Science' },
        { examClassId: 'c2', date: '2026-07-10', subjectName: 'Math' },
      ],
      {
        classColumnLabel: 'Class',
        formatDayHeader: (date, weekday) => `${weekday}\n${date}`,
      }
    );

    expect(result.columns.map((c) => c.key)).toEqual([
      'className',
      'day_2026-07-10',
      'day_2026-07-12',
    ]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      className: 'Class A',
      'day_2026-07-10': 'Math',
      'day_2026-07-12': 'Science',
    });
    expect(result.rows[1]).toMatchObject({
      className: 'Class B',
      'day_2026-07-10': 'Math',
      'day_2026-07-12': '',
    });
  });

  it('omits classes with no slots and skips rest days with no exams', () => {
    const result = buildExamTimetableMatrixExport(
      [
        { id: 'c1', name: 'Class A' },
        { id: 'c2', name: 'Empty Class' },
      ],
      [{ examClassId: 'c1', date: '2026-07-11', subjectName: 'Arabic' }],
      {
        classColumnLabel: 'Class',
        formatDayHeader: (date) => date,
      }
    );

    expect(result.rows).toHaveLength(1);
    expect(result.columns).toHaveLength(2);
    expect(result.columns[1].key).toBe('day_2026-07-11');
  });

  it('joins multiple subjects on the same class/day', () => {
    const result = buildExamTimetableMatrixExport(
      [{ id: 'c1', name: 'Class A' }],
      [
        { examClassId: 'c1', date: '2026-07-10', subjectName: 'Tajweed' },
        { examClassId: 'c1', date: '2026-07-10', subjectName: 'Quran' },
      ],
      {
        classColumnLabel: 'Class',
        formatDayHeader: (date) => date,
      }
    );

    expect(result.rows[0]['day_2026-07-10']).toBe('Tajweed / Quran');
  });

  it('merges sections of the same class into one row', () => {
    const result = buildExamTimetableMatrixExport(
      [
        { id: 'sec-a', name: 'Grade 1', groupKey: 'class-1' },
        { id: 'sec-b', name: 'Grade 1', groupKey: 'class-1' },
        { id: 'sec-c', name: 'Grade 2', groupKey: 'class-2' },
      ],
      [
        { examClassId: 'sec-a', date: '2026-07-10', subjectName: 'Math' },
        { examClassId: 'sec-b', date: '2026-07-10', subjectName: 'Math' },
        { examClassId: 'sec-b', date: '2026-07-12', subjectName: 'Science' },
        { examClassId: 'sec-c', date: '2026-07-10', subjectName: 'Arabic' },
      ],
      {
        classColumnLabel: 'Class',
        formatDayHeader: (date) => date,
      }
    );

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      className: 'Grade 1',
      'day_2026-07-10': 'Math',
      'day_2026-07-12': 'Science',
    });
    expect(result.rows[1]).toMatchObject({
      className: 'Grade 2',
      'day_2026-07-10': 'Arabic',
      'day_2026-07-12': '',
    });
  });

  it('resolves weekday keys from local YYYY-MM-DD', () => {
    // 2026-07-10 is a Friday
    expect(getWeekdayKey('2026-07-10')).toBe('friday');
  });
});
