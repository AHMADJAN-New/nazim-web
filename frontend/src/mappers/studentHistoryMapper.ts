// Student History Mapper - API to Domain conversion

import type * as StudentHistoryApi from '@/types/api/studentHistory';
import type {
  StudentHistory,
  StudentBasicInfo,
  HistorySummary,
  HistoryEvent,
  HistorySections,
  HistoryMetadata,
  AcademicYear,
  AdmissionRecord,
  AttendanceHistory,
  AttendanceSummary,
  MonthlyAttendance,
  AttendanceRecord,
  ExamHistory,
  ExamRecord,
  SubjectResult,
  FeeHistory,
  FeeAssignment,
  FeePayment,
  LibraryHistory,
  LibraryLoan,
  IdCardHistory,
  IdCardRecord,
  CourseHistory,
  CourseRecord,
  GraduationHistory,
  GraduationRecord,
  EnrollmentStatus,
  StudentStatus,
  HistoryEventType,
  AttendanceStatus,
  FeeStatus,
  LibraryLoanStatus,
  CourseCompletionStatus,
  GraduationResultStatus,
} from '@/types/domain/studentHistory';

/**
 * Parse a date string to Date object
 */
function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Map API StudentBasicInfo to Domain StudentBasicInfo
 */
export function mapStudentBasicInfoApiToDomain(api: StudentHistoryApi.StudentBasicInfoApi): StudentBasicInfo {
  return {
    id: api.id,
    admissionNumber: api.admissionNumber,
    studentCode: api.studentCode,
    cardNumber: api.cardNumber,
    fullName: api.fullName,
    firstName: api.firstName,
    lastName: api.lastName,
    fatherName: api.fatherName,
    grandfatherName: api.grandfatherName,
    motherName: api.motherName,
    gender: api.gender,
    dateOfBirth: parseDate(api.dateOfBirth),
    birthYear: api.birthYear,
    birthDate: api.birthDate,
    age: api.age,
    admissionYear: api.admissionYear,
    status: api.status as StudentStatus,
    picturePath: api.picturePath,
    phone: api.phone,
    email: api.email,
    schoolId: api.schoolId,
    schoolName: api.schoolName,
    organizationId: api.organizationId,
    organizationName: api.organizationName,
    currentClass: api.currentClass,
    currentEnrollmentStatus: api.currentEnrollmentStatus as EnrollmentStatus | null,
    createdAt: parseDate(api.createdAt),
    // Full registration data
    homeAddress: api.homeAddress,
    nationality: api.nationality,
    preferredLanguage: api.preferredLanguage,
    previousSchool: api.previousSchool,
    guardianName: api.guardianName,
    guardianRelation: api.guardianRelation,
    guardianPhone: api.guardianPhone,
    guardianTazkira: api.guardianTazkira,
    guardianPicturePath: api.guardianPicturePath,
    zaminName: api.zaminName,
    zaminPhone: api.zaminPhone,
    zaminTazkira: api.zaminTazkira,
    zaminAddress: api.zaminAddress,
    applyingGrade: api.applyingGrade,
    isOrphan: api.isOrphan,
    admissionFeeStatus: api.admissionFeeStatus,
    disabilityStatus: api.disabilityStatus,
    emergencyContactName: api.emergencyContactName,
    emergencyContactPhone: api.emergencyContactPhone,
    familyIncome: api.familyIncome,
    origProvince: api.origProvince,
    origDistrict: api.origDistrict,
    origVillage: api.origVillage,
    currProvince: api.currProvince,
    currDistrict: api.currDistrict,
    currVillage: api.currVillage,
  };
}

/**
 * Map API HistorySummary to Domain HistorySummary
 */
export function mapHistorySummaryApiToDomain(api: StudentHistoryApi.HistorySummaryApi): HistorySummary {
  return {
    totalAcademicYears: api.totalAcademicYears,
    currentClass: api.currentClass,
    currentStatus: api.currentStatus,
    attendanceRate: api.attendanceRate,
    averageExamScore: api.averageExamScore,
    outstandingFees: api.outstandingFees,
    currentLibraryBooks: api.currentLibraryBooks,
    totalAdmissions: api.totalAdmissions,
    totalExams: api.totalExams,
    totalFeePayments: api.totalFeePayments,
    totalLibraryLoans: api.totalLibraryLoans,
  };
}

/**
 * Map API HistoryEvent to Domain HistoryEvent
 */
export function mapHistoryEventApiToDomain(api: StudentHistoryApi.HistoryEventApi): HistoryEvent {
  return {
    id: api.id,
    type: api.type as HistoryEventType,
    date: parseDate(api.date),
    title: api.title,
    description: api.description,
    status: api.status,
    data: api.data,
  };
}

/**
 * Map API AcademicYear to Domain AcademicYear
 */
export function mapAcademicYearApiToDomain(api: StudentHistoryApi.AcademicYearApi): AcademicYear {
  return {
    id: api.id,
    name: api.name,
    startDate: parseDate(api.startDate),
    endDate: parseDate(api.endDate),
  };
}

/**
 * Map API AdmissionRecord to Domain AdmissionRecord
 */
export function mapAdmissionRecordApiToDomain(api: StudentHistoryApi.AdmissionRecordApi): AdmissionRecord {
  return {
    id: api.id,
    admissionDate: parseDate(api.admissionDate),
    admissionYear: api.admissionYear,
    enrollmentStatus: api.enrollmentStatus as EnrollmentStatus,
    enrollmentType: api.enrollmentType,
    shift: api.shift,
    isBoarder: api.isBoarder,
    feeStatus: api.feeStatus,
    class: api.class,
    classAcademicYear: api.classAcademicYear,
    academicYear: api.academicYear ? mapAcademicYearApiToDomain(api.academicYear) : null,
    residencyType: api.residencyType,
    room: api.room,
    school: api.school,
    placementNotes: api.placementNotes,
    createdAt: parseDate(api.createdAt),
    updatedAt: parseDate(api.updatedAt),
  };
}

/**
 * Map API AttendanceSummary to Domain AttendanceHistory
 */
export function mapAttendanceHistoryApiToDomain(api: StudentHistoryApi.AttendanceSummaryApi): AttendanceHistory {
  const summary: AttendanceSummary = {
    totalRecords: api.summary.totalRecords,
    presentCount: api.summary.presentCount,
    absentCount: api.summary.absentCount,
    lateCount: api.summary.lateCount,
    excusedCount: api.summary.excusedCount,
    sickCount: api.summary.sickCount,
    leaveCount: api.summary.leaveCount,
    attendanceRate: api.summary.attendanceRate,
    firstRecordDate: parseDate(api.summary.firstRecordDate),
    lastRecordDate: parseDate(api.summary.lastRecordDate),
  };

  const monthlyBreakdown: MonthlyAttendance[] = api.monthlyBreakdown.map(item => ({
    month: item.month,
    total: item.total,
    present: item.present,
    absent: item.absent,
    late: item.late,
    rate: item.rate,
  }));

  const recentRecords: AttendanceRecord[] = api.recentRecords.map(record => ({
    id: record.id,
    date: new Date(record.date),
    status: record.status as AttendanceStatus,
    note: record.note,
    markedAt: parseDate(record.markedAt),
  }));

  return {
    summary,
    monthlyBreakdown,
    recentRecords,
  };
}

/**
 * Map API ExamHistory to Domain ExamHistory
 */
export function mapExamHistoryApiToDomain(api: StudentHistoryApi.ExamHistoryApi): ExamHistory {
  const exams: ExamRecord[] = api.exams.map(exam => ({
    id: exam.id,
    examId: exam.examId,
    examName: exam.examName,
    examRollNumber: exam.examRollNumber,
    examSecretNumber: exam.examSecretNumber,
    className: exam.className,
    examStatus: exam.examStatus,
    examStartDate: parseDate(exam.examStartDate),
    examEndDate: parseDate(exam.examEndDate),
    totalMarks: exam.totalMarks,
    maxMarks: exam.maxMarks,
    percentage: exam.percentage,
    subjectResults: exam.subjectResults.map((result): SubjectResult => ({
      id: result.id,
      subjectName: result.subjectName,
      marksObtained: result.marksObtained,
      maxMarks: result.maxMarks,
      isAbsent: result.isAbsent,
      percentage: result.percentage,
      remarks: result.remarks,
    })),
  }));

  return {
    summary: {
      totalExams: api.summary.totalExams,
      totalMarks: api.summary.totalMarks,
      totalMaxMarks: api.summary.totalMaxMarks,
      averagePercentage: api.summary.averagePercentage,
    },
    exams,
  };
}

/**
 * Map API FeeHistory to Domain FeeHistory
 */
export function mapFeeHistoryApiToDomain(api: StudentHistoryApi.FeeHistoryApi): FeeHistory {
  const assignments: FeeAssignment[] = api.assignments.map(assignment => ({
    id: assignment.id,
    feeStructure: assignment.feeStructure,
    academicYear: assignment.academicYear ? mapAcademicYearApiToDomain(assignment.academicYear) : null,
    originalAmount: assignment.originalAmount,
    assignedAmount: assignment.assignedAmount,
    paidAmount: assignment.paidAmount,
    remainingAmount: assignment.remainingAmount,
    exceptionType: assignment.exceptionType,
    exceptionAmount: assignment.exceptionAmount,
    exceptionReason: assignment.exceptionReason,
    dueDate: parseDate(assignment.dueDate),
    status: assignment.status as FeeStatus | null,
    currency: assignment.currency,
    createdAt: parseDate(assignment.createdAt),
  }));

  const payments: FeePayment[] = api.payments.map(payment => ({
    id: payment.id,
    amount: payment.amount,
    paymentDate: parseDate(payment.paymentDate),
    paymentMethod: payment.paymentMethod,
    referenceNo: payment.referenceNo,
    feeStructureName: payment.feeStructureName,
    currency: payment.currency,
    receivedBy: payment.receivedBy,
    notes: payment.notes,
    createdAt: parseDate(payment.createdAt),
  }));

  return {
    summary: {
      totalAssigned: api.summary.totalAssigned,
      totalPaid: api.summary.totalPaid,
      totalRemaining: api.summary.totalRemaining,
      totalDiscount: api.summary.totalDiscount,
      paymentProgress: api.summary.paymentProgress,
    },
    assignments,
    payments,
  };
}

/**
 * Map API LibraryHistory to Domain LibraryHistory
 */
export function mapLibraryHistoryApiToDomain(api: StudentHistoryApi.LibraryHistoryApi): LibraryHistory {
  const loans: LibraryLoan[] = api.loans.map(loan => ({
    id: loan.id,
    book: loan.book,
    copyCode: loan.copyCode,
    loanDate: parseDate(loan.loanDate),
    dueDate: parseDate(loan.dueDate),
    returnedAt: parseDate(loan.returnedAt),
    depositAmount: loan.depositAmount,
    feeRetained: loan.feeRetained,
    refunded: loan.refunded,
    isOverdue: loan.isOverdue,
    status: loan.status as LibraryLoanStatus,
    notes: loan.notes,
  }));

  return {
    summary: {
      totalLoans: api.summary.totalLoans,
      returnedLoans: api.summary.returnedLoans,
      currentLoans: api.summary.currentLoans,
      overdueLoans: api.summary.overdueLoans,
      returnRate: api.summary.returnRate,
    },
    loans,
  };
}

/**
 * Map API IdCardHistory to Domain IdCardHistory
 */
export function mapIdCardHistoryApiToDomain(api: StudentHistoryApi.IdCardHistoryApi): IdCardHistory {
  const cards: IdCardRecord[] = api.cards.map(card => ({
    id: card.id,
    cardNumber: card.cardNumber,
    template: card.template,
    academicYear: card.academicYear ? mapAcademicYearApiToDomain(card.academicYear) : null,
    class: card.class,
    cardFee: card.cardFee,
    cardFeePaid: card.cardFeePaid,
    cardFeePaidDate: parseDate(card.cardFeePaidDate),
    isPrinted: card.isPrinted,
    printedAt: parseDate(card.printedAt),
    printedBy: card.printedBy,
    notes: card.notes,
    createdAt: parseDate(card.createdAt),
  }));

  return {
    summary: {
      totalCards: api.summary.totalCards,
      printedCards: api.summary.printedCards,
      unprintedCards: api.summary.unprintedCards,
      feePaidCards: api.summary.feePaidCards,
      feeUnpaidCards: api.summary.feeUnpaidCards,
    },
    cards,
  };
}

/**
 * Map API CourseHistory to Domain CourseHistory
 */
export function mapCourseHistoryApiToDomain(api: StudentHistoryApi.CourseHistoryApi): CourseHistory {
  const courses: CourseRecord[] = api.courses.map(course => ({
    id: course.id,
    course: course.course,
    admissionNo: course.admissionNo,
    registrationDate: parseDate(course.registrationDate),
    completionStatus: course.completionStatus as CourseCompletionStatus,
    completionDate: parseDate(course.completionDate),
    grade: course.grade,
    certificateIssued: course.certificateIssued,
    certificateIssuedDate: parseDate(course.certificateIssuedDate),
    certificateNumber: course.certificateNumber,
    feePaid: course.feePaid,
    feePaidDate: parseDate(course.feePaidDate),
    feeAmount: course.feeAmount,
    createdAt: parseDate(course.createdAt),
  }));

  return {
    summary: {
      totalCourses: api.summary.totalCourses,
      completedCourses: api.summary.completedCourses,
      enrolledCourses: api.summary.enrolledCourses,
      droppedCourses: api.summary.droppedCourses,
      certificatesIssued: api.summary.certificatesIssued,
      completionRate: api.summary.completionRate,
    },
    courses,
  };
}

/**
 * Map API GraduationHistory to Domain GraduationHistory
 */
export function mapGraduationHistoryApiToDomain(api: StudentHistoryApi.GraduationHistoryApi): GraduationHistory {
  const graduations: GraduationRecord[] = api.graduations.map(graduation => ({
    id: graduation.id,
    batch: graduation.batch ? {
      id: graduation.batch.id,
      name: graduation.batch.name,
      graduationDate: parseDate(graduation.batch.graduationDate),
      academicYear: graduation.batch.academicYear,
      class: graduation.batch.class,
    } : null,
    finalResultStatus: graduation.finalResultStatus as GraduationResultStatus | null,
    position: graduation.position,
    remarks: graduation.remarks,
    eligibilityJson: graduation.eligibilityJson,
    createdAt: parseDate(graduation.createdAt),
  }));

  return {
    summary: {
      totalGraduations: api.summary.totalGraduations,
      passed: api.summary.passed,
      failed: api.summary.failed,
      conditional: api.summary.conditional,
    },
    graduations,
  };
}

/**
 * Map complete API StudentHistoryResponse to Domain StudentHistory
 */
export function mapStudentHistoryApiToDomain(api: StudentHistoryApi.StudentHistoryResponse): StudentHistory {
  const sections: HistorySections = {
    admissions: api.sections.admissions.map(mapAdmissionRecordApiToDomain),
    attendance: mapAttendanceHistoryApiToDomain(api.sections.attendance),
    exams: mapExamHistoryApiToDomain(api.sections.exams),
    fees: mapFeeHistoryApiToDomain(api.sections.fees),
    library: mapLibraryHistoryApiToDomain(api.sections.library),
    idCards: mapIdCardHistoryApiToDomain(api.sections.idCards),
    courses: mapCourseHistoryApiToDomain(api.sections.courses),
    graduations: mapGraduationHistoryApiToDomain(api.sections.graduations),
  };

  const metadata: HistoryMetadata = {
    generatedAt: new Date(api.metadata.generatedAt),
    academicYears: api.metadata.academicYears.map(mapAcademicYearApiToDomain),
    totalRecords: api.metadata.totalRecords,
  };

  return {
    student: mapStudentBasicInfoApiToDomain(api.student),
    summary: mapHistorySummaryApiToDomain(api.summary),
    timeline: api.timeline.map(mapHistoryEventApiToDomain),
    sections,
    metadata,
  };
}

