import type {
  HostelOccupant,
  HostelRoom,
  HostelUnassignedBoarder,
} from '@/types/domain/hostel';

export type HostelRoomStatus = 'occupied' | 'empty' | 'attention' | 'full';

export interface HostelRoomFilters {
  buildingId?: string;
  roomId?: string;
  academicYearId?: string;
  classId?: string;
  search?: string;
  status?: HostelRoomStatus | 'all';
}

export interface HostelAssignedBoarderFilters {
  buildingId?: string;
  roomId?: string;
  academicYearId?: string;
  classId?: string;
  search?: string;
  roomStatus?: HostelRoomStatus | 'all';
}

export interface HostelUnassignedBoarderFilters {
  academicYearId?: string;
  classId?: string;
  search?: string;
}

export interface HostelStudentDirectoryRow extends HostelOccupant {
  roomId: string;
  roomNumber: string;
  buildingId: string | null;
  buildingName: string | null;
  staffId: string | null;
  staffName: string | null;
  roomStatus: HostelRoomStatus;
}

export interface HostelFilteredSummary {
  rooms: number;
  occupiedRooms: number;
  students: number;
  buildings: number;
  roomsNeedingAttention: number;
}

function normalizeSearchValue(value?: string | null): string {
  return value?.trim().toLowerCase() ?? '';
}

function occupantSearchValues(occupant: HostelOccupant): string[] {
  return [
    occupant.studentName,
    occupant.fatherName,
    occupant.admissionNumber,
    occupant.className,
    occupant.academicYearName,
    occupant.admissionYear,
  ]
    .map(normalizeSearchValue)
    .filter(Boolean);
}

function boarderSearchValues(boarder: HostelUnassignedBoarder): string[] {
  return [
    boarder.studentName,
    boarder.fatherName,
    boarder.admissionNumber,
    boarder.className,
    boarder.academicYearName,
    boarder.admissionYear,
    boarder.residencyTypeName,
  ]
    .map(normalizeSearchValue)
    .filter(Boolean);
}

function matchesAcademicYear<T extends { academicYearId: string | null }>(
  row: T,
  academicYearId?: string
): boolean {
  if (!academicYearId) {
    return true;
  }

  return row.academicYearId === academicYearId;
}

function matchesClass<T extends { classId: string | null }>(row: T, classId?: string): boolean {
  if (!classId) {
    return true;
  }

  return row.classId === classId;
}

export function getHostelRoomStatus(room: HostelRoom): HostelRoomStatus {
  if (room.occupants.length === 0) {
    return 'empty';
  }

  if (!room.staffId || !room.staffName || !room.buildingId || !room.buildingName) {
    return 'attention';
  }

  if (typeof room.capacity === 'number' && room.capacity > 0 && room.occupants.length >= room.capacity) {
    return 'full';
  }

  return 'occupied';
}

export function matchesHostelRoomSearch(room: HostelRoom, search: string): boolean {
  const term = normalizeSearchValue(search);

  if (!term) {
    return true;
  }

  const roomValues = [room.roomNumber, room.buildingName, room.staffName]
    .map(normalizeSearchValue)
    .filter(Boolean);

  if (roomValues.some((value) => value.includes(term))) {
    return true;
  }

  return room.occupants.some((occupant) =>
    occupantSearchValues(occupant).some((value) => value.includes(term))
  );
}

export function filterHostelRooms(rooms: HostelRoom[], filters: HostelRoomFilters): HostelRoom[] {
  return rooms.filter((room) => {
    if (filters.buildingId && room.buildingId !== filters.buildingId) {
      return false;
    }

    if (filters.roomId && room.id !== filters.roomId) {
      return false;
    }

    if (filters.status && filters.status !== 'all' && getHostelRoomStatus(room) !== filters.status) {
      return false;
    }

    if (
      (filters.academicYearId || filters.classId) &&
      !room.occupants.some(
        (occupant) =>
          matchesAcademicYear(occupant, filters.academicYearId) &&
          matchesClass(occupant, filters.classId)
      )
    ) {
      return false;
    }

    return matchesHostelRoomSearch(room, filters.search ?? '');
  });
}

export function flattenAssignedBoarders(rooms: HostelRoom[]): HostelStudentDirectoryRow[] {
  return rooms
    .flatMap((room) =>
      room.occupants.map((occupant) => ({
        ...occupant,
        roomId: room.id,
        roomNumber: room.roomNumber,
        buildingId: room.buildingId,
        buildingName: room.buildingName,
        staffId: room.staffId,
        staffName: room.staffName,
        roomStatus: getHostelRoomStatus(room),
      }))
    )
    .sort((left, right) => {
      const buildingCompare = (left.buildingName ?? '').localeCompare(right.buildingName ?? '');
      if (buildingCompare !== 0) {
        return buildingCompare;
      }

      const roomCompare = left.roomNumber.localeCompare(right.roomNumber, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      if (roomCompare !== 0) {
        return roomCompare;
      }

      return (left.studentName ?? '').localeCompare(right.studentName ?? '');
    });
}

export function filterAssignedBoarders(
  rows: HostelStudentDirectoryRow[],
  filters: HostelAssignedBoarderFilters
): HostelStudentDirectoryRow[] {
  return rows.filter((row) => {
    if (filters.buildingId && row.buildingId !== filters.buildingId) {
      return false;
    }

    if (filters.roomId && row.roomId !== filters.roomId) {
      return false;
    }

    if (filters.roomStatus && filters.roomStatus !== 'all' && row.roomStatus !== filters.roomStatus) {
      return false;
    }

    if (!matchesAcademicYear(row, filters.academicYearId)) {
      return false;
    }

    if (!matchesClass(row, filters.classId)) {
      return false;
    }

    const term = normalizeSearchValue(filters.search);
    if (!term) {
      return true;
    }

    const rowValues = [row.roomNumber, row.buildingName, row.staffName]
      .map(normalizeSearchValue)
      .filter(Boolean);

    if (rowValues.some((value) => value.includes(term))) {
      return true;
    }

    return occupantSearchValues(row).some((value) => value.includes(term));
  });
}

export function filterUnassignedBoarders(
  boarders: HostelUnassignedBoarder[],
  filters: HostelUnassignedBoarderFilters
): HostelUnassignedBoarder[] {
  return boarders.filter((boarder) => {
    if (!matchesAcademicYear(boarder, filters.academicYearId)) {
      return false;
    }

    if (!matchesClass(boarder, filters.classId)) {
      return false;
    }

    const term = normalizeSearchValue(filters.search);
    if (!term) {
      return true;
    }

    return boarderSearchValues(boarder).some((value) => value.includes(term));
  });
}

export function summarizeHostelRooms(rooms: HostelRoom[]): HostelFilteredSummary {
  const buildings = new Set<string>();
  let occupiedRooms = 0;
  let students = 0;
  let roomsNeedingAttention = 0;

  rooms.forEach((room) => {
    if (room.buildingId) {
      buildings.add(room.buildingId);
    }

    if (room.occupants.length > 0) {
      occupiedRooms += 1;
      students += room.occupants.length;
    }

    if (getHostelRoomStatus(room) === 'attention') {
      roomsNeedingAttention += 1;
    }
  });

  return {
    rooms: rooms.length,
    occupiedRooms,
    students,
    buildings: buildings.size,
    roomsNeedingAttention,
  };
}
