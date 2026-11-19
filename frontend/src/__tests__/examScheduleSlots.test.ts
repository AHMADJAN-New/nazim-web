import { describe, expect, it } from 'vitest';

import { mapExamTimeDomainToUpdate } from '@/mappers/examMapper';
import {
  compareClassNames,
  normalizeClock,
  slotKey,
  sortClassesByMode,
} from '@/lib/examScheduleSlots';

describe('normalizeClock', () => {
  it('strips seconds so timetable updates match H:i validation', () => {
    expect(normalizeClock('08:05:00')).toBe('08:05');
    expect(normalizeClock('14:30')).toBe('14:30');
    expect(normalizeClock('')).toBe('');
  });
});

describe('mapExamTimeDomainToUpdate', () => {
  it('persists the local calendar day and HH:mm times', () => {
    const date = new Date(2026, 10, 19, 0, 0, 0);
    const payload = mapExamTimeDomainToUpdate({
      date,
      startTime: '08:00:00',
      endTime: '10:30:00',
      roomId: null,
      invigilatorId: null,
      notes: 'Hall',
    });

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    expect(payload.date).toBe(`${date.getFullYear()}-${month}-${day}`);
    expect(payload.start_time).toBe('08:00');
    expect(payload.end_time).toBe('10:30');
    expect(payload.notes).toBe('Hall');
  });
});

describe('class name sort', () => {
  const classes = [
    { id: 'b', name: 'Grade 10', gradeLevel: 10 },
    { id: 'a', name: 'Grade 2', gradeLevel: 2 },
    { id: 'c', name: 'Grade 1', gradeLevel: null },
  ];

  it('sorts ascending and descending by name', () => {
    expect(sortClassesByMode(classes, 'asc').map((c) => c.name)).toEqual([
      'Grade 1',
      'Grade 2',
      'Grade 10',
    ]);
    expect(sortClassesByMode(classes, 'desc').map((c) => c.name)).toEqual([
      'Grade 10',
      'Grade 2',
      'Grade 1',
    ]);
  });

  it('uses grade level as the school viewing order', () => {
    expect(sortClassesByMode(classes, 'viewing').map((c) => c.id)).toEqual(['a', 'b', 'c']);
    expect(compareClassNames(classes[0], classes[1], 'viewing')).toBeGreaterThan(0);
  });
});

describe('slotKey', () => {
  it('groups subjects that share a class, day, and time window', () => {
    const key = slotKey({
      examClassId: 'class-1',
      date: '2026-11-19',
      startTime: '08:00:00',
      endTime: '10:00',
    });
    expect(key).toBe('class-1|2026-11-19|08:00|10:00');
  });
});
