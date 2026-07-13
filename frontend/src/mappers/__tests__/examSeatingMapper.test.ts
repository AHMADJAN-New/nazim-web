import { describe, expect, it } from 'vitest';

import {
  mapExamSeatingAssignmentApiToDomain,
  mapExamSeatingMapApiToDomain,
  mapExamSeatingMapFormToInsert,
  mapSyncAssignmentsDomainToApi,
  mapSyncClassColorsDomainToApi,
} from '@/mappers/examSeatingMapper';

describe('examSeatingMapper', () => {
  it('maps seating map API model to domain shape', () => {
    const map = mapExamSeatingMapApiToDomain({
      id: 'map-1',
      organization_id: 'org-1',
      school_id: 'school-1',
      exam_id: 'exam-1',
      room_id: 'room-1',
      name: 'Hall A',
      rows: 10,
      columns: 8,
      start_seat_number: 101,
      status: 'draft',
      revision: 2,
      input_checksum: 'abc123',
      solver_status: 'not_run',
      solver_diagnostics: {
        conflicts_count: 1,
        message: 'One conflict',
      },
      applied_at: null,
      applied_by: null,
      finalized_at: null,
      finalized_by: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      deleted_at: null,
      room: {
        id: 'room-1',
        name: 'Main Hall',
        room_number: 'A1',
      },
      assigned_count: 5,
      total_seats: 80,
    });

    expect(map.name).toBe('Hall A');
    expect(map.startSeatNumber).toBe(101);
    expect(map.solverStatus).toBe('not_run');
    expect(map.solverDiagnostics?.conflictsCount).toBe(1);
    expect(map.room?.roomNumber).toBe('A1');
  });

  it('maps assignment API model to domain shape', () => {
    const assignment = mapExamSeatingAssignmentApiToDomain({
      id: 'assign-1',
      organization_id: 'org-1',
      school_id: 'school-1',
      exam_seating_map_id: 'map-1',
      exam_id: 'exam-1',
      exam_student_id: 'student-1',
      row_number: 2,
      column_number: 3,
      seat_number: 115,
      is_locked: true,
      is_disabled: false,
      locked_at: '2024-01-03T00:00:00Z',
      locked_by: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      exam_student: {
        id: 'student-1',
        student_id: 'std-1',
        full_name: 'Ahmad Khan',
        father_name: 'Khan',
        exam_roll_number: '101',
        class_name: '10A',
        exam_class_id: 'class-1',
      },
    });

    expect(assignment.rowNumber).toBe(2);
    expect(assignment.columnNumber).toBe(3);
    expect(assignment.isLocked).toBe(true);
    expect(assignment.examStudent?.fullName).toBe('Ahmad Khan');
    expect(assignment.lockedAt?.toISOString()).toContain('2024-01-03');
  });

  it('maps domain form data to API insert payload', () => {
    const payload = mapExamSeatingMapFormToInsert({
      name: 'Hall B',
      rows: 12,
      columns: 6,
      startSeatNumber: 1,
      roomId: null,
    });

    expect(payload).toEqual({
      name: 'Hall B',
      rows: 12,
      columns: 6,
      start_seat_number: 1,
      room_id: null,
    });
  });

  it('maps sync assignments domain payload to API payload', () => {
    const payload = mapSyncAssignmentsDomainToApi(3, [
      {
        rowNumber: 1,
        columnNumber: 1,
        examStudentId: 'student-1',
        isLocked: false,
        isDisabled: false,
      },
      {
        rowNumber: 1,
        columnNumber: 2,
        examStudentId: null,
        isLocked: false,
        isDisabled: true,
      },
    ]);

    expect(payload.revision).toBe(3);
    expect(payload.assignments).toHaveLength(2);
    expect(payload.assignments[0]).toEqual({
      row_number: 1,
      column_number: 1,
      exam_student_id: 'student-1',
      is_locked: false,
      is_disabled: false,
    });
    expect(payload.assignments[1].exam_student_id).toBeNull();
    expect(payload.assignments[1].is_disabled).toBe(true);
  });

  it('preserves enabled empty seat flag in sync payload', () => {
    const payload = mapSyncAssignmentsDomainToApi(1, [
      {
        rowNumber: 2,
        columnNumber: 1,
        examStudentId: null,
        isLocked: false,
        isDisabled: false,
      },
    ]);

    expect(payload.assignments[0].is_disabled).toBe(false);
  });

  it('maps class colors to API payload with class_colors key', () => {
    const payload = mapSyncClassColorsDomainToApi([
      { examClassId: 'class-1', colorHex: '#FF0000' },
      { examClassId: 'class-2', colorHex: '#00FF00' },
    ]);

    expect(payload.class_colors).toEqual([
      { exam_class_id: 'class-1', color_hex: '#FF0000' },
      { exam_class_id: 'class-2', color_hex: '#00FF00' },
    ]);
  });
});
