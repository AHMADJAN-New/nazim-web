import { describe, expect, it } from 'vitest';

import {
  getMapSeatRangeEnd,
  getNextAvailableStartSeat,
  getSeatRangeEnd,
  getSeatRangeOverlap,
} from '@/lib/examSeatingUtils';
import type { ExamSeatingMap } from '@/types/domain/examSeating';

const baseMap = (overrides: Partial<ExamSeatingMap>): ExamSeatingMap =>
  ({
    id: 'map-1',
    organizationId: 'org-1',
    schoolId: 'school-1',
    examId: 'exam-1',
    roomId: null,
    name: 'Hall A',
    rows: 10,
    columns: 20,
    startSeatNumber: 1,
    status: 'draft',
    revision: 1,
    inputChecksum: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as ExamSeatingMap;

describe('examSeatingUtils', () => {
  it('computes seat range end', () => {
    expect(getSeatRangeEnd(1, 10, 20)).toBe(200);
    expect(getMapSeatRangeEnd(baseMap({ startSeatNumber: 201, rows: 5, columns: 10 }))).toBe(250);
  });

  it('returns next available start after existing maps', () => {
    const maps = [baseMap({ name: 'sad', startSeatNumber: 1, rows: 10, columns: 20 })];
    expect(getNextAvailableStartSeat(maps, 10, 30)).toBe(201);
  });

  it('detects overlapping ranges', () => {
    const maps = [baseMap({ name: 'sad', startSeatNumber: 1, rows: 10, columns: 20 })];
    expect(getSeatRangeOverlap(maps, 1, 10, 30)).toEqual({
      mapName: 'sad',
      newStart: 1,
      newEnd: 300,
      existingStart: 1,
      existingEnd: 200,
    });
    expect(getSeatRangeOverlap(maps, 201, 10, 30)).toBeNull();
  });
});
