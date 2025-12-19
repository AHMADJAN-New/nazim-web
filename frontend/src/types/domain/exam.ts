import type { AcademicYear, ClassAcademicYear } from './class';
import type { Subject, ClassSubject } from './subject';
import type { StudentAdmission } from './studentAdmission';

// Exam status values
export type ExamStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'archived';

import type { ExamType } from './examType';

export interface Exam {
  id: string;
  organizationId: string | null;
  academicYearId: string;
  examTypeId: string | null;
  name: string;
  description: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  status: ExamStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  academicYear?: AcademicYear;
  examType?: ExamType;
  examClasses?: ExamClass[];
  examSubjects?: ExamSubject[];
}

export interface ExamClass {
  id: string;
  examId: string;
  classAcademicYearId: string;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  classAcademicYear?: ClassAcademicYear;
}

export interface ExamSubject {
  id: string;
  examId: string;
  examClassId: string;
  classSubjectId: string;
  subjectId: string;
  organizationId: string | null;
  totalMarks?: number | null;
  passingMarks?: number | null;
  scheduledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  subject?: Subject;
  classSubject?: ClassSubject;
  examClass?: ExamClass;
}

// Exam Time (Timetable) types
export interface ExamTime {
  id: string;
  organizationId: string;
  examId: string;
  examClassId: string;
  examSubjectId: string;
  date: Date;
  startTime: string;
  endTime: string;
  roomId?: string | null;
  invigilatorId?: string | null;
  notes?: string | null;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  exam?: Exam;
  examClass?: ExamClass;
  examSubject?: ExamSubject;
  room?: {
    id: string;
    name: string;
    buildingId?: string;
  };
  invigilator?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName?: string;
  };
}

export interface ExamReportSubject {
  id: string;
  classSubjectId: string;
  subjectId: string | null;
  name: string;
  totalMarks: number | null;
  passingMarks: number | null;
  scheduledAt: Date | null;
}

export interface ExamReportClass {
  id: string;
  classAcademicYearId: string;
  className: string;
  academicYearName: string;
  studentCount: number;
  subjects: ExamReportSubject[];
}

export interface ExamReport {
  exam: Exam;
  totals: {
    classes: number;
    subjects: number;
    students: number;
  };
  classes: ExamReportClass[];
}

// Summary report types
export interface ExamSummaryReport {
  exam: {
    id: string;
    name: string;
    status: ExamStatus;
    startDate: Date | null;
    endDate: Date | null;
    academicYear?: AcademicYear;
  };
  totals: {
    classes: number;
    subjects: number;
    enrolledStudents: number;
    resultsEntered: number;
    marksEntered: number;
    absent: number;
  };
  passFail: {
    passCount: number;
    failCount: number;
    passPercentage: number;
  };
  marksStatistics: {
    average: number | null;
    distribution: Array<{
      gradeRange: string;
      count: number;
    }>;
  };
}

// Class mark sheet types
export interface ClassMarkSheetSubject {
  examSubjectId: string;
  subjectName: string;
  totalMarks: number | null;
  passingMarks: number | null;
  marksObtained: number | null;
  isAbsent: boolean;
  isPass: boolean | null;
}

export interface ClassMarkSheetStudent {
  examStudentId: string;
  student: {
    id: string | null;
    fullName: string;
    admissionNo: string | null;
    rollNumber: string | null;
  };
  subjects: ClassMarkSheetSubject[];
  totals: {
    obtained: number;
    maximum: number;
    percentage: number;
  };
  isAbsentInAny: boolean;
}

export interface ClassMarkSheetReport {
  exam: {
    id: string;
    name: string;
    status: ExamStatus;
  };
  class: {
    id: string;
    name: string;
    section: string | null;
  };
  subjects: Array<{
    id: string;
    name: string;
    totalMarks: number | null;
    passingMarks: number | null;
  }>;
  students: ClassMarkSheetStudent[];
  summary: {
    totalStudents: number;
    subjectsCount: number;
  };
}

// Student result types
export interface StudentResultSubject {
  examSubjectId: string;
  subject: {
    id: string | null;
    name: string;
    code: string | null;
  };
  marks: {
    obtained: number | null;
    total: number | null;
    passing: number | null;
    percentage: number | null;
  };
  isAbsent: boolean;
  isPass: boolean | null;
  remarks: string | null;
}

export interface StudentResultReport {
  exam: {
    id: string;
    name: string;
    status: ExamStatus;
    startDate: Date | null;
    endDate: Date | null;
    academicYear: string | null;
  };
  student: {
    id: string | null;
    fullName: string;
    admissionNo: string | null;
    rollNumber: string | null;
    className: string | null;
    section: string | null;
  };
  subjects: StudentResultSubject[];
  summary: {
    totalSubjects: number;
    passedSubjects: number;
    failedSubjects: number;
    absentSubjects: number;
    totalMarksObtained: number;
    totalMaximumMarks: number;
    overallPercentage: number;
    overallResult: 'Pass' | 'Fail';
  };
}

export interface ExamStudent {
  id: string;
  examId: string;
  examClassId: string;
  studentAdmissionId: string;
  organizationId: string | null;
  examRollNumber: string | null;
  examSecretNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  exam?: Exam;
  examClass?: ExamClass;
  studentAdmission?: StudentAdmission;
}

// Exam Numbers Domain Types
export interface StudentWithNumbers {
  examStudentId: string;
  studentId: string | null;
  studentAdmissionId: string | null;
  studentCode: string | null;
  fullName: string;
  fatherName: string | null;
  className: string;
  section: string | null;
  examClassId: string | null;
  examRollNumber: string | null;
  examSecretNumber: string | null;
  province: string | null;
  admissionYear: number | null;
}

export interface StudentsWithNumbersResponse {
  exam: {
    id: string;
    name: string;
    status: ExamStatus;
  };
  students: StudentWithNumbers[];
  summary: {
    total: number;
    withRollNumber: number;
    withSecretNumber: number;
    missingRollNumber: number;
    missingSecretNumber: number;
  };
}

export interface NumberAssignmentPreviewItem {
  examStudentId: string;
  studentId: string | null;
  studentName: string;
  className: string;
  currentRollNumber?: string | null;
  newRollNumber?: string;
  currentSecretNumber?: string | null;
  newSecretNumber?: string;
  willOverride: boolean;
  hasCollision: boolean;
}

export interface NumberAssignmentPreviewResponse {
  total: number;
  willOverrideCount: number;
  items: NumberAssignmentPreviewItem[];
}

export interface NumberAssignmentConfirmItem {
  examStudentId: string;
  newRollNumber?: string;
  newSecretNumber?: string;
}

export interface NumberAssignmentConfirmResponse {
  updated: number;
  errors: Array<{
    examStudentId: string;
    error: string;
  }>;
}

export interface RollNumberReportStudent {
  examStudentId?: string;
  examRollNumber: string;
  examSecretNumber?: string | null;
  studentCode: string | null;
  fullName: string;
  fatherName: string | null;
  className: string;
  section: string | null;
  province: string | null;
  admissionYear: number | null;
}

export interface RollNumberReportResponse {
  exam: {
    id: string;
    name: string;
    academicYear: string | null;
  };
  students: RollNumberReportStudent[];
  total: number;
}

export interface RollSlipsHtmlResponse {
  html: string;
  totalSlips: number;
}

export interface SecretLabelsHtmlResponse {
  html: string;
  totalLabels: number;
}

export interface SecretNumberLookupResponse {
  examStudentId: string;
  studentId: string | null;
  studentCode: string | null;
  fullName: string;
  fatherName: string | null;
  className: string;
  section: string | null;
  examRollNumber: string | null;
  examSecretNumber: string;
  exam: {
    id: string;
    name: string;
  };
}

export interface ExamResult {
  id: string;
  examId: string;
  examSubjectId: string;
  examStudentId: string;
  studentAdmissionId: string;
  marksObtained: number | null;
  isAbsent: boolean;
  remarks: string | null;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  exam?: Exam;
  examSubject?: ExamSubject;
  examStudent?: ExamStudent;
  studentAdmission?: StudentAdmission;
}

// Enrollment stats types
export interface EnrollmentClassStats {
  examClassId: string;
  className: string;
  sectionName: string | null;
  enrolledCount: number;
  availableCount: number;
  enrollmentPercentage: number;
}

export interface EnrollmentStats {
  examId: string;
  totalEnrolled: number;
  totalAvailable: number;
  overallPercentage: number;
  classStats: EnrollmentClassStats[];
}

// Marks progress types
export interface SubjectProgress {
  examSubjectId: string;
  subjectName: string;
  className: string;
  enrolledCount: number;
  resultsCount: number;
  percentage: number;
  isComplete: boolean;
}

export interface MarksProgress {
  examId: string;
  examName: string;
  examStatus: ExamStatus;
  totalExpected: number;
  totalEntered: number;
  overallPercentage: number;
  subjectProgress: SubjectProgress[];
}

// Exam Attendance types
export type ExamAttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface ExamAttendance {
  id: string;
  organizationId: string;
  examId: string;
  examTimeId: string;
  examClassId: string;
  examSubjectId: string;
  studentId: string;
  status: ExamAttendanceStatus;
  checkedInAt: Date | null;
  seatNumber: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  exam?: Exam;
  examTime?: ExamTime;
  examClass?: ExamClass;
  examSubject?: ExamSubject;
  student?: {
    id: string;
    fullName: string;
    fatherName?: string | null;
    admissionNo: string;
    cardNumber?: string | null;
    studentCode?: string | null;
  };
  rollNumber?: string | null;
}

// Student with attendance status for timeslot view
export interface TimeslotStudent {
  examStudentId: string;
  studentId: string;
  student: {
    id: string;
    fullName: string;
    fatherName: string | null;
    admissionNo: string;
  };
  rollNumber: string | null;
  attendance: {
    id: string;
    status: ExamAttendanceStatus;
    checkedInAt: Date | null;
    seatNumber: string | null;
    notes: string | null;
  } | null;
}

export interface TimeslotStudentsResponse {
  examTime: {
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
    examClassId: string;
    examSubjectId: string;
  };
  students: TimeslotStudent[];
  counts: {
    total: number;
    marked: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
}

// Attendance summary types
export interface AttendanceClassSummary {
  examClassId: string;
  className: string;
  sectionName: string | null;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

export interface AttendanceSubjectSummary {
  examSubjectId: string;
  subjectName: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

export interface ExamAttendanceSummary {
  exam: {
    id: string;
    name: string;
    status: ExamStatus;
  };
  totals: {
    enrolledStudents: number;
    attendanceRecords: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  byClass: AttendanceClassSummary[];
  bySubject: AttendanceSubjectSummary[];
}

// Student attendance report
export interface StudentAttendanceSession {
  id: string;
  examTime: {
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
  };
  subject: {
    id: string | null;
    name: string;
  };
  class: {
    name: string;
    section: string | null;
  };
  status: ExamAttendanceStatus;
  checkedInAt: Date | null;
  seatNumber: string | null;
  notes: string | null;
}

export interface StudentAttendanceReport {
  exam: {
    id: string;
    name: string;
  };
  student: {
    id: string;
    fullName: string;
    admissionNo: string;
  };
  attendances: StudentAttendanceSession[];
  summary: {
    totalSessions: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
}

// Timeslot attendance summary
export interface TimeslotAttendanceSummary {
  examTime: {
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
    room: {
      id: string;
      name: string;
    } | null;
    invigilator: {
      id: string;
      name: string;
    } | null;
  };
  class: {
    id: string;
    name: string;
    section: string | null;
  };
  subject: {
    id: string;
    name: string;
  };
  counts: {
    enrolled: number;
    marked: number;
    unmarked: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  percentage: {
    marked: number;
    present: number;
  };
}
