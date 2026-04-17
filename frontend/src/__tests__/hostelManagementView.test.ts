import { describe, expect, it } from 'vitest';

import {
  filterAssignedBoarders,
  filterHostelRooms,
  filterUnassignedBoarders,
  flattenAssignedBoarders,
  getHostelRoomStatus,
  summarizeHostelRooms,
} from '@/lib/hostelManagementView';
import type { HostelRoom, HostelUnassignedBoarder } from '@/types/domain/hostel';

const hostelRooms: HostelRoom[] = [
  {
    id: 'room-1',
    roomNumber: '101',
    capacity: 1,
    buildingId: 'building-a',
    buildingName: 'North Wing',
    staffId: 'warden-1',
    staffName: 'Ustad Karim',
    occupants: [
      {
        id: 'occ-1',
        studentId: 'student-1',
        studentName: 'Ahmad Jan',
        fatherName: 'Rahim Jan',
        admissionNumber: 'ADM-101',
        admissionYear: '2025',
        academicYearId: 'ay-1',
        academicYearName: '1404',
        classId: 'class-1',
        classAcademicYearId: 'cay-1',
        className: 'Grade 7',
      },
    ],
  },
  {
    id: 'room-2',
    roomNumber: '102',
    capacity: 2,
    buildingId: 'building-a',
    buildingName: 'North Wing',
    staffId: null,
    staffName: null,
    occupants: [
      {
        id: 'occ-2',
        studentId: 'student-2',
        studentName: 'Bilal Noor',
        fatherName: 'Sami Noor',
        admissionNumber: 'ADM-102',
        admissionYear: '2024',
        academicYearId: 'ay-2',
        academicYearName: '1403',
        classId: 'class-2',
        classAcademicYearId: 'cay-2',
        className: 'Grade 8',
      },
    ],
  },
  {
    id: 'room-3',
    roomNumber: '201',
    capacity: 3,
    buildingId: 'building-b',
    buildingName: 'South Wing',
    staffId: 'warden-2',
    staffName: 'Maulvi Isa',
    occupants: [],
  },
];

const unassignedBoarders: HostelUnassignedBoarder[] = [
  {
    id: 'ua-1',
    studentId: 'student-3',
    studentName: 'Habibullah',
    fatherName: 'Latif',
    admissionNumber: 'ADM-301',
    admissionYear: '2025',
    academicYearId: 'ay-1',
    academicYearName: '1404',
    classId: 'class-3',
    classAcademicYearId: 'cay-3',
    className: 'Grade 9',
    residencyTypeId: 'res-1',
    residencyTypeName: 'Full boarder',
  },
];

describe('hostelManagementView', () => {
  it('classifies room status for full, attention, and empty rooms', () => {
    expect(getHostelRoomStatus(hostelRooms[0])).toBe('full');
    expect(getHostelRoomStatus(hostelRooms[1])).toBe('attention');
    expect(getHostelRoomStatus(hostelRooms[2])).toBe('empty');
  });

  it('filters rooms by building, status, and student-related search terms', () => {
    expect(
      filterHostelRooms(hostelRooms, {
        buildingId: 'building-a',
        status: 'attention',
        search: 'bilal',
      })
    ).toEqual([hostelRooms[1]]);

    expect(
      filterHostelRooms(hostelRooms, {
        search: 'rahim',
      })
    ).toEqual([hostelRooms[0]]);

    expect(
      filterHostelRooms(hostelRooms, {
        search: '1403',
      })
    ).toEqual([hostelRooms[1]]);

    expect(
      filterHostelRooms(hostelRooms, {
        roomId: 'room-1',
        academicYearId: 'ay-1',
        classId: 'class-1',
      })
    ).toEqual([hostelRooms[0]]);

    expect(
      filterHostelRooms(hostelRooms, {
        status: 'full',
      })
    ).toEqual([hostelRooms[0]]);
  });

  it('flattens assigned boarders with room metadata and stable ordering', () => {
    const rows = flattenAssignedBoarders(hostelRooms);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      studentName: 'Ahmad Jan',
      roomNumber: '101',
      buildingName: 'North Wing',
      roomStatus: 'full',
    });
    expect(rows[1]).toMatchObject({
      studentName: 'Bilal Noor',
      roomNumber: '102',
      buildingName: 'North Wing',
      roomStatus: 'attention',
    });
  });

  it('filters assigned boarders precisely by student and room metadata', () => {
    const rows = flattenAssignedBoarders(hostelRooms);

    expect(filterAssignedBoarders(rows, { search: 'ahmad' })).toEqual([rows[0]]);
    expect(filterAssignedBoarders(rows, { search: 'north wing' })).toEqual(rows);
    expect(filterAssignedBoarders(rows, { search: '102' })).toEqual([rows[1]]);
    expect(
      filterAssignedBoarders(rows, {
        academicYearId: 'ay-2',
        classId: 'class-2',
        roomStatus: 'attention',
      })
    ).toEqual([rows[1]]);
  });

  it('filters unassigned boarders by student, father, class, year, and residency type', () => {
    expect(filterUnassignedBoarders(unassignedBoarders, { search: 'latif' })).toEqual(unassignedBoarders);
    expect(filterUnassignedBoarders(unassignedBoarders, { search: 'grade 9' })).toEqual(unassignedBoarders);
    expect(filterUnassignedBoarders(unassignedBoarders, { search: 'full boarder' })).toEqual(unassignedBoarders);
    expect(
      filterUnassignedBoarders(unassignedBoarders, {
        academicYearId: 'ay-1',
        classId: 'class-3',
      })
    ).toEqual(unassignedBoarders);
    expect(filterUnassignedBoarders(unassignedBoarders, { search: 'missing' })).toEqual([]);
  });

  it('summarizes filtered room results for the dashboard strip', () => {
    expect(summarizeHostelRooms(hostelRooms)).toEqual({
      rooms: 3,
      occupiedRooms: 2,
      students: 2,
      buildings: 2,
      roomsNeedingAttention: 1,
    });
  });
});
