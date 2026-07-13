import type { ExamSeatingMap } from '@/types/domain/examSeating';

export function getSeatRangeEnd(
  startSeatNumber: number,
  rows: number,
  columns: number
): number {
  return startSeatNumber + rows * columns - 1;
}

export function getMapSeatRangeEnd(map: Pick<ExamSeatingMap, 'startSeatNumber' | 'rows' | 'columns'>): number {
  return getSeatRangeEnd(map.startSeatNumber, map.rows, map.columns);
}

export function getNextAvailableStartSeat(
  maps: ExamSeatingMap[],
  rows: number,
  columns: number
): number {
  if (maps.length === 0) {
    return 1;
  }

  const maxEnd = Math.max(...maps.map(getMapSeatRangeEnd));
  return maxEnd + 1;
}

export function getSeatRangeOverlap(
  maps: ExamSeatingMap[],
  startSeatNumber: number,
  rows: number,
  columns: number
): {
  mapName: string;
  newStart: number;
  newEnd: number;
  existingStart: number;
  existingEnd: number;
} | null {
  const newEnd = getSeatRangeEnd(startSeatNumber, rows, columns);

  for (const map of maps) {
    const existingStart = map.startSeatNumber;
    const existingEnd = getMapSeatRangeEnd(map);
    const overlaps = !(newEnd < existingStart || startSeatNumber > existingEnd);

    if (overlaps) {
      return {
        mapName: map.name,
        newStart: startSeatNumber,
        newEnd,
        existingStart,
        existingEnd,
      };
    }
  }

  return null;
}
