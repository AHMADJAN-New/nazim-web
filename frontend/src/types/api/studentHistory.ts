// Student History API Types - Match Laravel API response (snake_case, DB structure)

export interface StudentHistoryResponse {
  student: StudentBasicInfoApi;
  summary: HistorySummaryApi;
  timeline: HistoryEventApi[];
  sections: {
    admissions: AdmissionRecordApi[];
    attendance: AttendanceSummaryApi;
    exams: ExamHistoryApi;
    fees: FeeHistoryApi;
    library: LibraryHistoryApi;
    idCards: IdCardHistoryApi;
    courses: CourseHistoryApi;
    graduations: GraduationHistoryApi;
  };
  metadata: {
    generatedAt: string;
    academicYears: AcademicYearApi[];
    totalRecords: number;
  };
}

export interface StudentBasicInfoApi {
  id: string;
  admissionNumber: string;
  studentCode: string | null;
  cardNumber: string | null;
  fullName: string;
  firstName?: string;
  lastName?: string;
  fatherName: string;
  grandfatherName?: string | null;
  motherName?: string | null;
  gender: string;
  dateOfBirth: string | null;
  birthYear: string | null;
  birthDate?: string | null;
  age: number | null;
  admissionYear: string | null;
  status: string;
  picturePath: string | null;
  phone: string | null;
  email: string | null;
  schoolId: string | null;
  schoolName: string | null;
  organizationId: string;
  organizationName: string | null;
  currentClass: {
    id: string;
    name: string | null;
    section: string | null;
    academicYear: string | null;
  } | null;
  currentEnrollmentStatus: string | null;
  createdAt: string | null;
  // Full registration data
  homeAddress?: string | null;
  nationality?: string | null;
  preferredLanguage?: string | null;
  previousSchool?: string | null;
  guardianName?: string | null;
  guardianRelation?: string | null;
  guardianPhone?: string | null;
  guardianTazkira?: string | null;
  guardianPicturePath?: string | null;
  zaminName?: string | null;
  zaminPhone?: string | null;
  zaminTazkira?: string | null;
  zaminAddress?: string | null;
  applyingGrade?: string | null;
  isOrphan?: boolean;
  admissionFeeStatus?: string | null;
  disabilityStatus?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  familyIncome?: string | null;
  origProvince?: string | null;
  origDistrict?: string | null;
  origVillage?: string | null;
  currProvince?: string | null;
  currDistrict?: string | null;
  currVillage?: string | null;
}

export interface HistorySummaryApi {
  totalAcademicYears: number;
  currentClass: {
    id: string;
    name: string | null;
    section: string | null;
    academicYear: string | null;
  } | null;
  currentStatus: string | null;
  attendanceRate: number;
  averageExamScore: number;
  outstandingFees: number;
  currentLibraryBooks: number;
  totalAdmissions: number;
  totalExams: number;
  totalFeePayments: number;
  totalLibraryLoans: number;
}

export interface HistoryEventApi {
  id: string;
  type: 'admission' | 'exam' | 'fee_payment' | 'library_loan' | 'id_card' | 'course' | 'graduation' | 'attendance';
  date: string | null;
  title: string;
  description: string;
  status: string | null;
  data: Record<string, unknown>;
}

export interface AcademicYearApi {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
}

export interface AdmissionRecordApi {
  id: string;
  admissionDate: string | null;
  admissionYear: string | null;
  enrollmentStatus: string;
  enrollmentType: string | null;
  shift: string | null;
  isBoarder: boolean;
  feeStatus: string | null;
  class: {
    id: string;
    name: string;
    gradeLevel: number | null;
  } | null;
  classAcademicYear: {
    id: string;
    sectionName: string | null;
  } | null;
  academicYear: AcademicYearApi | null;
  residencyType: {
    id: string;
    name: string;
  } | null;
  room: {
    id: string;
    roomNumber: string;
  } | null;
  school: {
    id: string;
    name: string;
  } | null;
  placementNotes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AttendanceSummaryApi {
  summary: {
    totalRecords: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    sickCount: number;
    leaveCount: number;
    attendanceRate: number;
    firstRecordDate: string | null;
    lastRecordDate: string | null;
  };
  monthlyBreakdown: {
    month: string;
    total: number;
    present: number;
    absent: number;
    late: number;
    rate: number;
  }[];
  recentRecords: {
    id: string;
    date: string;
    status: string;
    note: string | null;
    markedAt: string | null;
  }[];
}

export interface ExamHistoryApi {
  summary: {
    totalExams: number;
    totalMarks: number;
    totalMaxMarks: number;
    averagePercentage: number;
  };
  exams: {
    id: string;
    examId: string;
    examName: string | null;
    examRollNumber: string | null;
    examSecretNumber: string | null;
    className: string | null;
    examStatus: string | null;
    examStartDate: string | null;
    examEndDate: string | null;
    totalMarks: number;
    maxMarks: number;
    percentage: number;
    subjectResults: {
      id: string;
      subjectName: string;
      marksObtained: number | null;
      maxMarks: number;
      isAbsent: boolean;
      percentage: number;
      remarks: string | null;
    }[];
  }[];
}

export interface FeeHistoryApi {
  summary: {
    totalAssigned: number;
    totalPaid: number;
    totalRemaining: number;
    totalDiscount: number;
    paymentProgress: number;
  };
  assignments: {
    id: string;
    feeStructure: {
      id: string;
      name: string;
    } | null;
    academicYear: AcademicYearApi | null;
    originalAmount: number;
    assignedAmount: number;
    paidAmount: number;
    remainingAmount: number;
    exceptionType: string | null;
    exceptionAmount: number;
    exceptionReason: string | null;
    dueDate: string | null;
    status: string | null;
    currency: string | null;
    createdAt: string | null;
  }[];
  payments: {
    id: string;
    amount: number;
    paymentDate: string | null;
    paymentMethod: string | null;
    referenceNo: string | null;
    feeStructureName: string | null;
    currency: string | null;
    receivedBy: string | null;
    notes: string | null;
    createdAt: string | null;
  }[];
}

export interface LibraryHistoryApi {
  summary: {
    totalLoans: number;
    returnedLoans: number;
    currentLoans: number;
    overdueLoans: number;
    returnRate: number;
  };
  loans: {
    id: string;
    book: {
      id: string;
      title: string;
      author: string | null;
      isbn: string | null;
    } | null;
    copyCode: string | null;
    loanDate: string | null;
    dueDate: string | null;
    returnedAt: string | null;
    depositAmount: number;
    feeRetained: number;
    refunded: boolean;
    isOverdue: boolean;
    status: 'active' | 'returned' | 'overdue';
    notes: string | null;
  }[];
}

export interface IdCardHistoryApi {
  summary: {
    totalCards: number;
    printedCards: number;
    unprintedCards: number;
    feePaidCards: number;
    feeUnpaidCards: number;
  };
  cards: {
    id: string;
    cardNumber: string | null;
    template: {
      id: string;
      name: string;
    } | null;
    academicYear: AcademicYearApi | null;
    class: {
      id: string;
      name: string;
    } | null;
    cardFee: number;
    cardFeePaid: boolean;
    cardFeePaidDate: string | null;
    isPrinted: boolean;
    printedAt: string | null;
    printedBy: string | null;
    notes: string | null;
    createdAt: string | null;
  }[];
}

export interface CourseHistoryApi {
  summary: {
    totalCourses: number;
    completedCourses: number;
    enrolledCourses: number;
    droppedCourses: number;
    certificatesIssued: number;
    completionRate: number;
  };
  courses: {
    id: string;
    course: {
      id: string;
      name: string;
      code: string | null;
      description: string | null;
    } | null;
    admissionNo: string | null;
    registrationDate: string | null;
    completionStatus: 'enrolled' | 'completed' | 'dropped' | 'failed';
    completionDate: string | null;
    grade: string | null;
    certificateIssued: boolean;
    certificateIssuedDate: string | null;
    certificateNumber: string | null;
    feePaid: boolean;
    feePaidDate: string | null;
    feeAmount: number;
    createdAt: string | null;
  }[];
}

export interface GraduationHistoryApi {
  summary: {
    totalGraduations: number;
    passed: number;
    failed: number;
    conditional: number;
  };
  graduations: {
    id: string;
    batch: {
      id: string;
      name: string;
      graduationDate: string | null;
      academicYear: string | null;
      class: string | null;
    } | null;
    finalResultStatus: 'pass' | 'fail' | 'conditional' | null;
    position: number | null;
    remarks: string | null;
    eligibilityJson: Record<string, unknown> | null;
    createdAt: string | null;
  }[];
}

// Request types
export interface StudentHistoryFilters {
  date_from?: string;
  date_to?: string;
  section?: string;
}

export interface StudentHistoryExportRequest {
  report_type: 'pdf' | 'excel';
  branding_id?: string;
  calendar_preference?: 'gregorian' | 'jalali' | 'qamari';
  language?: 'en' | 'ps' | 'fa' | 'ar';
  sections?: string[];
}

