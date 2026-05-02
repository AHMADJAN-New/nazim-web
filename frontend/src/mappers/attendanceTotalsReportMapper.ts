import type * as AttendanceTotalsReportApi from '@/types/api/attendanceTotalsReport';
import type { AttendanceTotalsReport } from '@/types/domain/attendanceTotalsReport';

const computeRate = (present: number, total: number) => {
  if (!total) return 0;
  return Math.round((present / total) * 1000) / 10;
};

export const mapAttendanceTotalsReportApiToDomain = (
  apiReport: AttendanceTotalsReportApi.AttendanceTotalsReport
): AttendanceTotalsReport => {
  const totalMarked =
    apiReport.totals.present +
    apiReport.totals.absent +
    apiReport.totals.late +
    apiReport.totals.excused +
    apiReport.totals.sick +
    apiReport.totals.leave;

  return {
    totals: {
      sessions: apiReport.totals.sessions,
      studentsMarked: apiReport.totals.students_marked,
      present: apiReport.totals.present,
      absent: apiReport.totals.absent,
      late: apiReport.totals.late,
      excused: apiReport.totals.excused,
      sick: apiReport.totals.sick,
      leave: apiReport.totals.leave,
      attendanceRate:
        typeof apiReport.totals.attendance_rate === 'number'
          ? apiReport.totals.attendance_rate
          : computeRate(apiReport.totals.present, totalMarked),
    },
    statusBreakdown: apiReport.status_breakdown.map((item) => ({
      status: item.status,
      total: item.total,
    })),
    classBreakdown: apiReport.class_breakdown.map((item) => ({
      classId: item.class_id,
      className: item.class_name,
      schoolName: item.school_name,
      totalRecords: item.total_records,
      present: item.present_count,
      absent: item.absent_count,
      late: item.late_count,
      excused: item.excused_count,
      sick: item.sick_count,
      leave: item.leave_count,
      attendanceRate: computeRate(item.present_count, item.total_records),
    })),
    schoolBreakdown: apiReport.school_breakdown.map((item) => ({
      schoolId: item.school_id,
      schoolName: item.school_name,
      totalRecords: item.total_records,
      present: item.present_count,
      absent: item.absent_count,
      late: item.late_count,
      excused: item.excused_count,
      sick: item.sick_count,
      leave: item.leave_count,
      attendanceRate: computeRate(item.present_count, item.total_records),
    })),
    roomBreakdown: (apiReport.room_breakdown ?? []).map((item) => ({
      roomName: item.room_name,
      schoolName: item.school_name,
      totalRecords: item.total_records,
      present: item.present_count,
      absent: item.absent_count,
      late: item.late_count,
      excused: item.excused_count,
      sick: item.sick_count,
      leave: item.leave_count,
      attendanceRate: computeRate(item.present_count, item.total_records),
    })),
    studentBreakdown: (apiReport.student_breakdown ?? []).map((item) => ({
      studentId: item.student_id,
      studentName: item.student_name,
      fatherName: item.father_name ?? null,
      admissionNo: item.admission_no,
      cardNumber: item.card_number ?? null,
      buildingRoom: item.building_room ?? null,
      residency:
        item.residency === 'boarder' || item.residency === 'day_scholar' ? item.residency : null,
      totalRecords: item.total_records,
      present: item.present_count,
      absent: item.absent_count,
      late: item.late_count,
      excused: item.excused_count,
      sick: item.sick_count,
      leave: item.leave_count,
      attendanceRate:
        typeof item.attendance_rate === 'number'
          ? item.attendance_rate
          : computeRate(item.present_count, item.total_records),
    })),
    studentBreakdownMeta: apiReport.student_breakdown_meta
      ? {
          total: apiReport.student_breakdown_meta.total,
          currentPage: apiReport.student_breakdown_meta.current_page,
          perPage: apiReport.student_breakdown_meta.per_page,
          lastPage: apiReport.student_breakdown_meta.last_page,
          from: apiReport.student_breakdown_meta.from,
          to: apiReport.student_breakdown_meta.to,
        }
      : null,
    recentSessions: apiReport.recent_sessions.map((session) => ({
      id: session.id,
      sessionDate: session.session_date ? new Date(session.session_date) : null,
      status: session.status,
      roundNumber: session.round_number ?? 1,
      sessionLabel: session.session_label ?? null,
      className: session.class_name,
      schoolName: session.school_name,
      totals: session.totals,
      attendanceRate: computeRate(session.totals.present, session.totals.records),
    })),
  };
};
