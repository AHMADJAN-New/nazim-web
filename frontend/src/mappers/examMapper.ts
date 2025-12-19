import type * as ExamApi from '@/types/api/exam';
import type {
  Exam, ExamClass, ExamSubject, ExamReport, ExamReportClass, ExamReportSubject,
  ExamStudent, ExamResult, ExamTime, ExamSummaryReport, ClassMarkSheetReport,
  ClassMarkSheetStudent, ClassMarkSheetSubject, StudentResultReport, StudentResultSubject,
  EnrollmentStats, EnrollmentClassStats, MarksProgress, SubjectProgress,
  ExamAttendance, ExamAttendanceSummary, AttendanceClassSummary, AttendanceSubjectSummary,
  TimeslotStudent, TimeslotStudentsResponse, StudentAttendanceReport, StudentAttendanceSession,
  TimeslotAttendanceSummary
} from '@/types/domain/exam';

import { mapExamTypeApiToDomain } from './examTypeMapper';

export const mapExamApiToDomain = (exam: ExamApi.Exam): Exam => ({
  id: exam.id,
  organizationId: exam.organization_id,
  academicYearId: exam.academic_year_id,
  examTypeId: exam.exam_type_id ?? null,
  name: exam.name,
  description: exam.description,
  startDate: exam.start_date ? new Date(exam.start_date) : null,
  endDate: exam.end_date ? new Date(exam.end_date) : null,
  status: exam.status || 'draft',
  createdAt: new Date(exam.created_at),
  updatedAt: new Date(exam.updated_at),
  deletedAt: exam.deleted_at ? new Date(exam.deleted_at) : null,
  academicYear: exam.academic_year
    ? {
      id: exam.academic_year.id,
      name: exam.academic_year.name,
      startDate: new Date(exam.academic_year.start_date),
      endDate: new Date(exam.academic_year.end_date),
      isCurrent: exam.academic_year.is_current,
    }
    : undefined,
  examType: exam.exam_type
    ? mapExamTypeApiToDomain({
        id: exam.exam_type.id,
        organization_id: exam.organization_id || '',
        name: exam.exam_type.name,
        code: exam.exam_type.code,
        description: null,
        display_order: 0,
        is_active: true,
        created_at: exam.created_at,
        updated_at: exam.updated_at,
      })
    : undefined,
});

export const mapExamDomainToInsert = (exam: Partial<Exam>): Partial<ExamApi.Exam> => ({
  name: exam.name!,
  academic_year_id: exam.academicYearId!,
  exam_type_id: exam.examTypeId ?? null,
  description: exam.description ?? null,
  start_date: exam.startDate ? exam.startDate.toISOString().slice(0, 10) : null,
  end_date: exam.endDate ? exam.endDate.toISOString().slice(0, 10) : null,
  status: exam.status || 'draft',
});

export const mapExamDomainToUpdate = (exam: Partial<Exam>): Partial<ExamApi.Exam> => ({
  name: exam.name,
  academic_year_id: exam.academicYearId,
  exam_type_id: exam.examTypeId,
  description: exam.description ?? null,
  start_date: exam.startDate ? exam.startDate.toISOString().slice(0, 10) : null,
  end_date: exam.endDate ? exam.endDate.toISOString().slice(0, 10) : null,
  status: exam.status,
});

export const mapExamClassApiToDomain = (examClass: ExamApi.ExamClass): ExamClass => ({
  id: examClass.id,
  examId: examClass.exam_id,
  classAcademicYearId: examClass.class_academic_year_id,
  organizationId: examClass.organization_id,
  createdAt: new Date(examClass.created_at),
  updatedAt: new Date(examClass.updated_at),
  deletedAt: examClass.deleted_at ? new Date(examClass.deleted_at) : null,
  classAcademicYear: examClass.class_academic_year
    ? {
      id: examClass.class_academic_year.id,
      classId: examClass.class_academic_year.class_id,
      academicYearId: examClass.class_academic_year.academic_year_id,
      organizationId: examClass.class_academic_year.organization_id,
      sectionName: examClass.class_academic_year.section_name,
      teacherId: examClass.class_academic_year.teacher_id,
      roomId: examClass.class_academic_year.room_id,
      capacity: examClass.class_academic_year.capacity,
      currentStudentCount: examClass.class_academic_year.current_student_count ?? 0,
      isActive: examClass.class_academic_year.is_active ?? true,
      notes: examClass.class_academic_year.notes,
      createdAt: new Date(examClass.class_academic_year.created_at),
      updatedAt: new Date(examClass.class_academic_year.updated_at),
      deletedAt: examClass.class_academic_year.deleted_at
        ? new Date(examClass.class_academic_year.deleted_at)
        : null,
      class: examClass.class_academic_year.class,
      academicYear: examClass.class_academic_year.academic_year
        ? {
          id: examClass.class_academic_year.academic_year.id,
          name: examClass.class_academic_year.academic_year.name,
          startDate: new Date(examClass.class_academic_year.academic_year.start_date),
          endDate: new Date(examClass.class_academic_year.academic_year.end_date),
          isCurrent: examClass.class_academic_year.academic_year.is_current,
        }
        : undefined,
    }
    : undefined,
});

export const mapExamSubjectApiToDomain = (examSubject: ExamApi.ExamSubject): ExamSubject => ({
  id: examSubject.id,
  examId: examSubject.exam_id,
  examClassId: examSubject.exam_class_id,
  classSubjectId: examSubject.class_subject_id,
  subjectId: examSubject.subject_id,
  organizationId: examSubject.organization_id,
  totalMarks: examSubject.total_marks ?? null,
  passingMarks: examSubject.passing_marks ?? null,
  scheduledAt: examSubject.scheduled_at ? new Date(examSubject.scheduled_at) : null,
  createdAt: new Date(examSubject.created_at),
  updatedAt: new Date(examSubject.updated_at),
  deletedAt: examSubject.deleted_at ? new Date(examSubject.deleted_at) : null,
  subject: examSubject.subject
    ? {
      id: examSubject.subject.id,
      organizationId: examSubject.subject.organization_id,
      name: examSubject.subject.name,
      code: examSubject.subject.code,
      description: examSubject.subject.description,
      isActive: examSubject.subject.is_active,
      createdAt: new Date(examSubject.subject.created_at),
      updatedAt: new Date(examSubject.subject.updated_at),
      deletedAt: examSubject.subject.deleted_at ? new Date(examSubject.subject.deleted_at) : null,
    }
    : undefined,
  classSubject: examSubject.class_subject
    ? {
      id: examSubject.class_subject.id,
      classSubjectTemplateId: examSubject.class_subject.class_subject_template_id,
      classAcademicYearId: examSubject.class_subject.class_academic_year_id,
      subjectId: examSubject.class_subject.subject_id,
      organizationId: examSubject.class_subject.organization_id,
      teacherId: examSubject.class_subject.teacher_id,
      roomId: examSubject.class_subject.room_id,
      credits: examSubject.class_subject.credits,
      hoursPerWeek: examSubject.class_subject.hours_per_week,
      isRequired: examSubject.class_subject.is_required,
      notes: examSubject.class_subject.notes,
      createdAt: new Date(examSubject.class_subject.created_at),
      updatedAt: new Date(examSubject.class_subject.updated_at),
      deletedAt: examSubject.class_subject.deleted_at
        ? new Date(examSubject.class_subject.deleted_at)
        : null,
    }
    : undefined,
  examClass: examSubject.exam_class ? mapExamClassApiToDomain(examSubject.exam_class) : undefined,
});

// Exam Time mappers
export const mapExamTimeApiToDomain = (examTime: ExamApi.ExamTime): ExamTime => ({
  id: examTime.id,
  organizationId: examTime.organization_id,
  examId: examTime.exam_id,
  examClassId: examTime.exam_class_id,
  examSubjectId: examTime.exam_subject_id,
  date: new Date(examTime.date),
  startTime: examTime.start_time,
  endTime: examTime.end_time,
  roomId: examTime.room_id ?? null,
  invigilatorId: examTime.invigilator_id ?? null,
  notes: examTime.notes ?? null,
  isLocked: examTime.is_locked,
  createdAt: new Date(examTime.created_at),
  updatedAt: new Date(examTime.updated_at),
  deletedAt: examTime.deleted_at ? new Date(examTime.deleted_at) : null,
  exam: examTime.exam ? mapExamApiToDomain(examTime.exam) : undefined,
  examClass: examTime.exam_class ? mapExamClassApiToDomain(examTime.exam_class) : undefined,
  examSubject: examTime.exam_subject ? mapExamSubjectApiToDomain(examTime.exam_subject) : undefined,
  room: examTime.room
    ? {
      id: examTime.room.id,
      name: examTime.room.name,
      buildingId: examTime.room.building_id,
    }
    : undefined,
  invigilator: examTime.invigilator
    ? {
      id: examTime.invigilator.id,
      firstName: examTime.invigilator.first_name,
      lastName: examTime.invigilator.last_name,
      fullName: examTime.invigilator.full_name,
    }
    : undefined,
});

export const mapExamTimeDomainToInsert = (examTime: Partial<ExamTime>): ExamApi.ExamTimeInsert => ({
  exam_class_id: examTime.examClassId!,
  exam_subject_id: examTime.examSubjectId!,
  date: examTime.date ? examTime.date.toISOString().slice(0, 10) : '',
  start_time: examTime.startTime!,
  end_time: examTime.endTime!,
  room_id: examTime.roomId ?? null,
  invigilator_id: examTime.invigilatorId ?? null,
  notes: examTime.notes ?? null,
});

export const mapExamTimeDomainToUpdate = (examTime: Partial<ExamTime>): ExamApi.ExamTimeUpdate => ({
  date: examTime.date ? examTime.date.toISOString().slice(0, 10) : undefined,
  start_time: examTime.startTime,
  end_time: examTime.endTime,
  room_id: examTime.roomId,
  invigilator_id: examTime.invigilatorId,
  notes: examTime.notes,
  is_locked: examTime.isLocked,
});

const mapReportSubjectApiToDomain = (subject: ExamApi.ExamReportSubject): ExamReportSubject => ({
  id: subject.id,
  classSubjectId: subject.class_subject_id,
  subjectId: subject.subject_id,
  name: subject.subject?.name || subject.subject_id || 'Subject',
  totalMarks: subject.total_marks,
  passingMarks: subject.passing_marks,
  scheduledAt: subject.scheduled_at ? new Date(subject.scheduled_at) : null,
});

const mapReportClassApiToDomain = (examClass: ExamApi.ExamReportClass): ExamReportClass => {
  const classLabelParts = [examClass.class?.name || 'Class'];
  if (examClass.class_academic_year?.section_name) {
    classLabelParts.push(examClass.class_academic_year.section_name);
  }

  return {
    id: examClass.id,
    classAcademicYearId: examClass.class_academic_year_id,
    className: classLabelParts.join(' - '),
    academicYearName: examClass.academic_year?.name || examClass.class_academic_year?.academic_year?.name || 'Academic Year',
    studentCount: examClass.student_count ?? 0,
    subjects: (examClass.subjects || []).map(mapReportSubjectApiToDomain),
  };
};

export const mapExamReportApiToDomain = (report: ExamApi.ExamReport): ExamReport => ({
  exam: mapExamApiToDomain(report.exam),
  totals: report.totals,
  classes: (report.classes || []).map(mapReportClassApiToDomain),
});

// Summary report mapper
export const mapExamSummaryReportApiToDomain = (report: ExamApi.ExamSummaryReport): ExamSummaryReport => ({
  exam: {
    id: report.exam.id,
    name: report.exam.name,
    status: report.exam.status,
    startDate: report.exam.start_date ? new Date(report.exam.start_date) : null,
    endDate: report.exam.end_date ? new Date(report.exam.end_date) : null,
    academicYear: report.exam.academic_year
      ? {
        id: report.exam.academic_year.id,
        name: report.exam.academic_year.name,
        startDate: new Date(report.exam.academic_year.start_date),
        endDate: new Date(report.exam.academic_year.end_date),
        isCurrent: report.exam.academic_year.is_current,
      }
      : undefined,
  },
  totals: {
    classes: report.totals.classes,
    subjects: report.totals.subjects,
    enrolledStudents: report.totals.enrolled_students,
    resultsEntered: report.totals.results_entered,
    marksEntered: report.totals.marks_entered,
    absent: report.totals.absent,
  },
  passFail: {
    passCount: report.pass_fail.pass_count,
    failCount: report.pass_fail.fail_count,
    passPercentage: report.pass_fail.pass_percentage,
  },
  marksStatistics: {
    average: report.marks_statistics.average,
    distribution: report.marks_statistics.distribution.map((d) => ({
      gradeRange: d.grade_range,
      count: d.count,
    })),
  },
});

// Class mark sheet mapper
export const mapClassMarkSheetApiToDomain = (report: ExamApi.ClassMarkSheetReport): ClassMarkSheetReport => ({
  exam: report.exam,
  class: report.class,
  subjects: report.subjects.map((s) => ({
    id: s.id,
    name: s.name,
    totalMarks: s.total_marks,
    passingMarks: s.passing_marks,
  })),
  students: report.students.map((student): ClassMarkSheetStudent => ({
    examStudentId: student.exam_student_id,
    student: {
      id: student.student.id,
      fullName: student.student.full_name,
      admissionNo: student.student.admission_no,
      rollNumber: student.student.roll_number,
    },
    subjects: student.subjects.map((s): ClassMarkSheetSubject => ({
      examSubjectId: s.exam_subject_id,
      subjectName: s.subject_name,
      totalMarks: s.total_marks,
      passingMarks: s.passing_marks,
      marksObtained: s.marks_obtained,
      isAbsent: s.is_absent,
      isPass: s.is_pass,
    })),
    totals: student.totals,
    isAbsentInAny: student.is_absent_in_any,
  })),
  summary: {
    totalStudents: report.summary.total_students,
    subjectsCount: report.summary.subjects_count,
  },
});

// Student result mapper
export const mapStudentResultApiToDomain = (report: ExamApi.StudentResultReport): StudentResultReport => ({
  exam: {
    id: report.exam.id,
    name: report.exam.name,
    status: report.exam.status,
    startDate: report.exam.start_date ? new Date(report.exam.start_date) : null,
    endDate: report.exam.end_date ? new Date(report.exam.end_date) : null,
    academicYear: report.exam.academic_year,
  },
  student: {
    id: report.student.id,
    fullName: report.student.full_name,
    admissionNo: report.student.admission_no,
    rollNumber: report.student.roll_number,
    className: report.student.class,
    section: report.student.section,
  },
  subjects: report.subjects.map((s): StudentResultSubject => ({
    examSubjectId: s.exam_subject_id,
    subject: {
      id: s.subject.id,
      name: s.subject.name,
      code: s.subject.code,
    },
    marks: s.marks,
    isAbsent: s.is_absent,
    isPass: s.is_pass,
    remarks: s.remarks,
  })),
  summary: {
    totalSubjects: report.summary.total_subjects,
    passedSubjects: report.summary.passed_subjects,
    failedSubjects: report.summary.failed_subjects,
    absentSubjects: report.summary.absent_subjects,
    totalMarksObtained: report.summary.total_marks_obtained,
    totalMaximumMarks: report.summary.total_maximum_marks,
    overallPercentage: report.summary.overall_percentage,
    overallResult: report.summary.overall_result,
  },
});

// Enrollment stats mapper
export const mapEnrollmentStatsApiToDomain = (stats: ExamApi.EnrollmentStats): EnrollmentStats => ({
  examId: stats.exam_id,
  totalEnrolled: stats.total_enrolled,
  totalAvailable: stats.total_available,
  overallPercentage: stats.overall_percentage,
  classStats: stats.class_stats.map((cs): EnrollmentClassStats => ({
    examClassId: cs.exam_class_id,
    className: cs.class_name,
    sectionName: cs.section_name,
    enrolledCount: cs.enrolled_count,
    availableCount: cs.available_count,
    enrollmentPercentage: cs.enrollment_percentage,
  })),
});

// Marks progress mapper
export const mapMarksProgressApiToDomain = (progress: ExamApi.MarksProgress): MarksProgress => ({
  examId: progress.exam_id,
  examName: progress.exam_name,
  examStatus: progress.exam_status,
  totalExpected: progress.total_expected,
  totalEntered: progress.total_entered,
  overallPercentage: progress.overall_percentage,
  subjectProgress: progress.subject_progress.map((sp): SubjectProgress => ({
    examSubjectId: sp.exam_subject_id,
    subjectName: sp.subject_name,
    className: sp.class_name,
    enrolledCount: sp.enrolled_count,
    resultsCount: sp.results_count,
    percentage: sp.percentage,
    isComplete: sp.is_complete,
  })),
});

export const mapExamStudentApiToDomain = (examStudent: ExamApi.ExamStudent): ExamStudent => ({
  id: examStudent.id,
  examId: examStudent.exam_id,
  examClassId: examStudent.exam_class_id,
  studentAdmissionId: examStudent.student_admission_id,
  organizationId: examStudent.organization_id,
  examRollNumber: examStudent.exam_roll_number ?? null,
  examSecretNumber: examStudent.exam_secret_number ?? null,
  createdAt: new Date(examStudent.created_at),
  updatedAt: new Date(examStudent.updated_at),
  deletedAt: examStudent.deleted_at ? new Date(examStudent.deleted_at) : null,
  exam: examStudent.exam ? mapExamApiToDomain(examStudent.exam) : undefined,
  examClass: examStudent.exam_class ? mapExamClassApiToDomain(examStudent.exam_class) : undefined,
  studentAdmission: examStudent.student_admission
    ? {
      id: examStudent.student_admission.id,
      organizationId: examStudent.student_admission.organization_id,
      schoolId: examStudent.student_admission.school_id,
      studentId: examStudent.student_admission.student_id,
      academicYearId: examStudent.student_admission.academic_year_id,
      classId: examStudent.student_admission.class_id,
      classAcademicYearId: examStudent.student_admission.class_academic_year_id,
      admissionDate: new Date(examStudent.student_admission.admission_date),
      status: examStudent.student_admission.status,
      rollNumber: examStudent.student_admission.roll_number,
      remarks: examStudent.student_admission.remarks,
      createdAt: new Date(examStudent.student_admission.created_at),
      updatedAt: new Date(examStudent.student_admission.updated_at),
      deletedAt: examStudent.student_admission.deleted_at
        ? new Date(examStudent.student_admission.deleted_at)
        : null,
      student: examStudent.student_admission.student ? {
        id: examStudent.student_admission.student.id,
        fullName: examStudent.student_admission.student.full_name || examStudent.student_admission.student.fullName || '',
        admissionNumber: examStudent.student_admission.student.admission_no || examStudent.student_admission.student.admissionNumber || '',
        studentCode: examStudent.student_admission.student.student_code || examStudent.student_admission.student.studentCode || null,
        cardNumber: examStudent.student_admission.student.card_number || examStudent.student_admission.student.cardNumber || null,
        fatherName: examStudent.student_admission.student.father_name || examStudent.student_admission.student.fatherName || null,
        gender: examStudent.student_admission.student.gender || null,
        admissionYear: examStudent.student_admission.student.admission_year || examStudent.student_admission.student.admissionYear || null,
        guardianName: examStudent.student_admission.student.guardian_name || examStudent.student_admission.student.guardianName || null,
        guardianPhone: examStudent.student_admission.student.guardian_phone || examStudent.student_admission.student.guardianPhone || null,
      } : undefined,
    }
    : undefined,
});

export const mapExamResultApiToDomain = (examResult: ExamApi.ExamResult): ExamResult => ({
  id: examResult.id,
  examId: examResult.exam_id,
  examSubjectId: examResult.exam_subject_id,
  examStudentId: examResult.exam_student_id,
  studentAdmissionId: examResult.student_admission_id,
  marksObtained: examResult.marks_obtained,
  isAbsent: examResult.is_absent,
  remarks: examResult.remarks,
  organizationId: examResult.organization_id,
  createdAt: new Date(examResult.created_at),
  updatedAt: new Date(examResult.updated_at),
  deletedAt: examResult.deleted_at ? new Date(examResult.deleted_at) : null,
  exam: examResult.exam ? mapExamApiToDomain(examResult.exam) : undefined,
  examSubject: examResult.exam_subject ? mapExamSubjectApiToDomain(examResult.exam_subject) : undefined,
  examStudent: examResult.exam_student ? mapExamStudentApiToDomain(examResult.exam_student) : undefined,
  studentAdmission: examResult.student_admission
    ? {
      id: examResult.student_admission.id,
      organizationId: examResult.student_admission.organization_id,
      schoolId: examResult.student_admission.school_id,
      studentId: examResult.student_admission.student_id,
      academicYearId: examResult.student_admission.academic_year_id,
      classId: examResult.student_admission.class_id,
      classAcademicYearId: examResult.student_admission.class_academic_year_id,
      admissionDate: new Date(examResult.student_admission.admission_date),
      status: examResult.student_admission.status,
      rollNumber: examResult.student_admission.roll_number,
      remarks: examResult.student_admission.remarks,
      createdAt: new Date(examResult.student_admission.created_at),
      updatedAt: new Date(examResult.student_admission.updated_at),
      deletedAt: examResult.student_admission.deleted_at
        ? new Date(examResult.student_admission.deleted_at)
        : null,
      student: examResult.student_admission.student ? {
        id: examResult.student_admission.student.id,
        fullName: examResult.student_admission.student.full_name || examResult.student_admission.student.fullName || '',
        admissionNumber: examResult.student_admission.student.admission_no || examResult.student_admission.student.admissionNumber || '',
        studentCode: examResult.student_admission.student.student_code || examResult.student_admission.student.studentCode || null,
        cardNumber: examResult.student_admission.student.card_number || examResult.student_admission.student.cardNumber || null,
        fatherName: examResult.student_admission.student.father_name || examResult.student_admission.student.fatherName || null,
        gender: examResult.student_admission.student.gender || null,
        admissionYear: examResult.student_admission.student.admission_year || examResult.student_admission.student.admissionYear || null,
        guardianName: examResult.student_admission.student.guardian_name || examResult.student_admission.student.guardianName || null,
        guardianPhone: examResult.student_admission.student.guardian_phone || examResult.student_admission.student.guardianPhone || null,
      } : undefined,
    }
    : undefined,
});

// =========== Exam Attendance Mappers ===========

export const mapExamAttendanceApiToDomain = (attendance: ExamApi.ExamAttendance): ExamAttendance => ({
  id: attendance.id,
  organizationId: attendance.organization_id,
  examId: attendance.exam_id,
  examTimeId: attendance.exam_time_id,
  examClassId: attendance.exam_class_id,
  examSubjectId: attendance.exam_subject_id,
  studentId: attendance.student_id,
  status: attendance.status,
  checkedInAt: attendance.checked_in_at ? new Date(attendance.checked_in_at) : null,
  seatNumber: attendance.seat_number,
  notes: attendance.notes,
  createdAt: new Date(attendance.created_at),
  updatedAt: new Date(attendance.updated_at),
  deletedAt: attendance.deleted_at ? new Date(attendance.deleted_at) : null,
  exam: attendance.exam ? mapExamApiToDomain(attendance.exam) : undefined,
  examTime: attendance.exam_time ? mapExamTimeApiToDomain(attendance.exam_time) : undefined,
  examClass: attendance.exam_class ? mapExamClassApiToDomain(attendance.exam_class) : undefined,
  examSubject: attendance.exam_subject ? mapExamSubjectApiToDomain(attendance.exam_subject) : undefined,
  rollNumber: (attendance as any).roll_number ?? null,
  student: attendance.student
    ? {
      id: attendance.student.id,
      fullName: attendance.student.full_name,
      fatherName: attendance.student.father_name ?? null,
      admissionNo: attendance.student.admission_no,
      cardNumber: attendance.student.card_number || null,
      studentCode: attendance.student.student_code || null,
    }
    : undefined,
});

export const mapTimeslotStudentApiToDomain = (student: ExamApi.TimeslotStudent): TimeslotStudent => ({
  examStudentId: student.exam_student_id,
  studentId: student.student_id,
  student: {
    id: student.student.id,
    fullName: student.student.full_name,
    fatherName: student.student.father_name ?? null,
    admissionNo: student.student.admission_no,
  },
  rollNumber: student.roll_number,
  attendance: student.attendance
    ? {
      id: student.attendance.id,
      status: student.attendance.status,
      checkedInAt: student.attendance.checked_in_at ? new Date(student.attendance.checked_in_at) : null,
      seatNumber: student.attendance.seat_number,
      notes: student.attendance.notes,
    }
    : null,
});

export const mapTimeslotStudentsResponseApiToDomain = (response: ExamApi.TimeslotStudentsResponse): TimeslotStudentsResponse => ({
  examTime: {
    id: response.exam_time.id,
    date: new Date(response.exam_time.date),
    startTime: response.exam_time.start_time,
    endTime: response.exam_time.end_time,
    examClassId: response.exam_time.exam_class_id,
    examSubjectId: response.exam_time.exam_subject_id,
  },
  students: response.students.map(mapTimeslotStudentApiToDomain),
  counts: response.counts,
});

export const mapAttendanceSummaryApiToDomain = (summary: ExamApi.ExamAttendanceSummary): ExamAttendanceSummary => ({
  exam: summary.exam,
  totals: {
    enrolledStudents: summary.totals.enrolled_students,
    attendanceRecords: summary.totals.attendance_records,
    present: summary.totals.present,
    absent: summary.totals.absent,
    late: summary.totals.late,
    excused: summary.totals.excused,
  },
  byClass: summary.by_class.map((c): AttendanceClassSummary => ({
    examClassId: c.exam_class_id,
    className: c.class_name,
    sectionName: c.section_name,
    present: c.present,
    absent: c.absent,
    late: c.late,
    excused: c.excused,
  })),
  bySubject: summary.by_subject.map((s): AttendanceSubjectSummary => ({
    examSubjectId: s.exam_subject_id,
    subjectName: s.subject_name,
    present: s.present,
    absent: s.absent,
    late: s.late,
    excused: s.excused,
  })),
});

export const mapStudentAttendanceReportApiToDomain = (report: ExamApi.StudentAttendanceReport): StudentAttendanceReport => ({
  exam: report.exam,
  student: {
    id: report.student.id,
    fullName: report.student.full_name,
    admissionNo: report.student.admission_no,
  },
  attendances: report.attendances.map((a): StudentAttendanceSession => ({
    id: a.id,
    examTime: {
      id: a.exam_time.id,
      date: new Date(a.exam_time.date),
      startTime: a.exam_time.start_time,
      endTime: a.exam_time.end_time,
    },
    subject: a.subject,
    class: a.class,
    status: a.status,
    checkedInAt: a.checked_in_at ? new Date(a.checked_in_at) : null,
    seatNumber: a.seat_number,
    notes: a.notes,
  })),
  summary: {
    totalSessions: report.summary.total_sessions,
    present: report.summary.present,
    absent: report.summary.absent,
    late: report.summary.late,
    excused: report.summary.excused,
  },
});

export const mapTimeslotAttendanceSummaryApiToDomain = (summary: ExamApi.TimeslotAttendanceSummary): TimeslotAttendanceSummary => ({
  examTime: {
    id: summary.exam_time.id,
    date: new Date(summary.exam_time.date),
    startTime: summary.exam_time.start_time,
    endTime: summary.exam_time.end_time,
    room: summary.exam_time.room,
    invigilator: summary.exam_time.invigilator,
  },
  class: summary.class,
  subject: summary.subject,
  counts: summary.counts,
  percentage: summary.percentage,
});

// ========== Exam Numbers Mappers ==========

import type {
  StudentWithNumbers,
  StudentsWithNumbersResponse,
  NumberAssignmentPreviewItem,
  NumberAssignmentPreviewResponse,
  NumberAssignmentConfirmResponse,
  RollNumberReportStudent,
  RollNumberReportResponse,
  RollSlipsHtmlResponse,
  SecretLabelsHtmlResponse,
  SecretNumberLookupResponse,
} from '@/types/domain/exam';

export const mapStudentWithNumbersApiToDomain = (student: ExamApi.StudentWithNumbers): StudentWithNumbers => ({
  examStudentId: student.exam_student_id,
  studentId: student.student_id,
  studentAdmissionId: student.student_admission_id,
  studentCode: student.student_code,
  fullName: student.full_name,
  fatherName: student.father_name,
  className: student.class_name,
  section: student.section,
  examClassId: student.exam_class_id,
  examRollNumber: student.exam_roll_number,
  examSecretNumber: student.exam_secret_number,
  province: student.province,
  admissionYear: student.admission_year,
});

export const mapStudentsWithNumbersResponseApiToDomain = (
  response: ExamApi.StudentsWithNumbersResponse
): StudentsWithNumbersResponse => ({
  exam: response.exam,
  students: response.students.map(mapStudentWithNumbersApiToDomain),
  summary: {
    total: response.summary.total,
    withRollNumber: response.summary.with_roll_number,
    withSecretNumber: response.summary.with_secret_number,
    missingRollNumber: response.summary.missing_roll_number,
    missingSecretNumber: response.summary.missing_secret_number,
  },
});

export const mapNumberAssignmentPreviewItemApiToDomain = (
  item: ExamApi.NumberAssignmentPreviewItem
): NumberAssignmentPreviewItem => ({
  examStudentId: item.exam_student_id,
  studentId: item.student_id,
  studentName: item.student_name,
  className: item.class_name,
  currentRollNumber: item.current_roll_number,
  newRollNumber: item.new_roll_number,
  currentSecretNumber: item.current_secret_number,
  newSecretNumber: item.new_secret_number,
  willOverride: item.will_override,
  hasCollision: item.has_collision,
});

export const mapNumberAssignmentPreviewResponseApiToDomain = (
  response: ExamApi.NumberAssignmentPreviewResponse
): NumberAssignmentPreviewResponse => ({
  total: response.total,
  willOverrideCount: response.will_override_count,
  items: response.items.map(mapNumberAssignmentPreviewItemApiToDomain),
});

export const mapNumberAssignmentConfirmResponseApiToDomain = (
  response: ExamApi.NumberAssignmentConfirmResponse
): NumberAssignmentConfirmResponse => ({
  updated: response.updated,
  errors: response.errors.map((e) => ({
    examStudentId: e.exam_student_id,
    error: e.error,
  })),
});

export const mapRollNumberReportStudentApiToDomain = (
  student: ExamApi.RollNumberReportStudent
): RollNumberReportStudent => ({
  examStudentId: student.exam_student_id,
  examRollNumber: student.exam_roll_number,
  examSecretNumber: student.exam_secret_number ?? null,
  studentCode: student.student_code,
  fullName: student.full_name,
  fatherName: student.father_name,
  className: student.class_name,
  section: student.section,
  province: student.province,
  admissionYear: student.admission_year,
});

export const mapRollNumberReportResponseApiToDomain = (
  response: ExamApi.RollNumberReportResponse
): RollNumberReportResponse => ({
  exam: {
    id: response.exam.id,
    name: response.exam.name,
    academicYear: response.exam.academic_year,
  },
  students: response.students.map(mapRollNumberReportStudentApiToDomain),
  total: response.total,
});

export const mapRollSlipsHtmlResponseApiToDomain = (
  response: ExamApi.RollSlipsHtmlResponse
): RollSlipsHtmlResponse => ({
  html: response.html,
  totalSlips: response.total_slips,
});

export const mapSecretLabelsHtmlResponseApiToDomain = (
  response: ExamApi.SecretLabelsHtmlResponse
): SecretLabelsHtmlResponse => ({
  html: response.html,
  totalLabels: response.total_labels,
});

export const mapSecretNumberLookupResponseApiToDomain = (
  response: ExamApi.SecretNumberLookupResponse
): SecretNumberLookupResponse => ({
  examStudentId: response.exam_student_id,
  studentId: response.student_id,
  studentCode: response.student_code,
  fullName: response.full_name,
  fatherName: response.father_name,
  className: response.class_name,
  section: response.section,
  examRollNumber: response.exam_roll_number,
  examSecretNumber: response.exam_secret_number,
  exam: response.exam,
});
