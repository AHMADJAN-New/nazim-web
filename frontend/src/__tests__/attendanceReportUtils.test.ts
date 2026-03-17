import { describe, expect, it } from 'vitest';

import {
  buildAttendanceReportParams,
  getAttendanceReportSummary,
  mapAttendanceReportRecord,
} from '../lib/attendance/attendanceReportUtils';

describe('attendanceReportUtils', () => {
  it('builds school-scoped attendance report params with class_ids for class filters', () => {
    expect(
      buildAttendanceReportParams({
        organizationId: 'org-1',
        studentId: 'student-1',
        classId: 'class-1',
        academicYearId: 'year-1',
        status: 'present',
        dateFrom: '2026-03-01',
        dateTo: '2026-03-10',
        page: 2,
        perPage: 50,
      })
    ).toEqual({
      organization_id: 'org-1',
      student_id: 'student-1',
      class_ids: ['class-1'],
      academic_year_id: 'year-1',
      status: 'present',
      date_from: '2026-03-01',
      date_to: '2026-03-10',
      page: 2,
      per_page: 50,
    });
  });

  it('maps attendance report rows using the current multi-class session shape', () => {
    const mapped = mapAttendanceReportRecord({
      id: 'record-1',
      attendance_session_id: 'session-1',
      organization_id: 'org-1',
      school_id: 'school-1',
      student_id: 'student-1',
      status: 'late',
      entry_method: 'manual',
      marked_at: '2026-03-17T09:15:00Z',
      marked_by: 'user-1',
      note: 'Traffic',
      created_at: '2026-03-17T09:15:00Z',
      updated_at: '2026-03-17T09:15:00Z',
      student: {
        id: 'student-1',
        full_name: 'Ahmad Khan',
        admission_no: 'ADM-1001',
        card_number: 'CARD-1',
        gender: 'male',
      },
      session: {
        id: 'session-1',
        organization_id: 'org-1',
        school_id: 'school-1',
        class_id: null,
        academic_year_id: 'year-1',
        session_date: '2026-03-17',
        method: 'manual',
        status: 'open',
        remarks: null,
        created_by: 'user-1',
        closed_at: null,
        created_at: '2026-03-17T08:00:00Z',
        updated_at: '2026-03-17T08:00:00Z',
        classes: [
          { id: 'class-1', name: 'Grade 7-A', grade_level: 7 },
          { id: 'class-2', name: 'Grade 7-B', grade_level: 7 },
        ],
        school: {
          id: 'school-1',
          school_name: 'Main Campus',
        },
      },
    });

    expect(mapped).toMatchObject({
      id: 'record-1',
      studentId: 'student-1',
      studentName: 'Ahmad Khan',
      admissionNo: 'ADM-1001',
      cardNumber: 'CARD-1',
      status: 'late',
      className: 'Grade 7-A, Grade 7-B',
      classNames: ['Grade 7-A', 'Grade 7-B'],
      schoolName: 'Main Campus',
      entryMethod: 'manual',
      note: 'Traffic',
    });

    expect(mapped.sessionDate).toBeInstanceOf(Date);
    expect(mapped.markedAt).toBeInstanceOf(Date);
  });

  it('summarizes visible attendance records by status and unique student count', () => {
    const records = [
      {
        id: '1',
        studentId: 'student-1',
        status: 'present',
      },
      {
        id: '2',
        studentId: 'student-2',
        status: 'absent',
      },
      {
        id: '3',
        studentId: 'student-1',
        status: 'late',
      },
    ];

    expect(getAttendanceReportSummary(records)).toEqual({
      total: 3,
      uniqueStudents: 2,
      present: 1,
      absent: 1,
      late: 1,
      exceptions: 0,
    });
  });
});

