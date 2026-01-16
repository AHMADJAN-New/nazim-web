// Student History Domain Types - UI-friendly structure (camelCase, Date objects, nested structures)

export interface StudentHistory {
  student: StudentBasicInfo;
  summary: HistorySummary;
  timeline: HistoryEvent[];
  sections: HistorySections;
  metadata: HistoryMetadata;
}

export interface StudentBasicInfo {
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
  dateOfBirth: Date | null;
  birthYear: string | null;
  birthDate?: string | null;
  age: number | null;
  admissionYear: string | null;
  status: StudentStatus;
  picturePath: string | null;
  phone: string | null;
  email: string | null;
  schoolId: string | null;
  schoolName: string | null;
  organizationId: string;
  organizationName: string | null;
  currentClass: CurrentClass | null;
  currentEnrollmentStatus: EnrollmentStatus | null;
  createdAt: Date | null;
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

export type StudentStatus = 'active' | 'inactive' | 'suspended' | 'withdrawn' | 'graduated' | 'transferred';
export type EnrollmentStatus = 'pending' | 'admitted' | 'active' | 'inactive' | 'suspended' | 'withdrawn' | 'graduated';

export interface CurrentClass {
  id: string;
  name: string | null;
  section: string | null;
  academicYear: string | null;
}

export interface HistorySummary {
  totalAcademicYears: number;
  currentClass: CurrentClass | null;
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

export type HistoryEventType = 
  | 'admission' 
  | 'exam' 
  | 'fee_payment' 
  | 'library_loan' 
  | 'id_card' 
  | 'course' 
  | 'graduation' 
  | 'attendance';

export interface HistoryEvent {
  id: string;
  type: HistoryEventType;
  date: Date | null;
  title: string;
  description: string;
  status: string | null;
  data: Record<string, unknown>;
}

export interface HistorySections {
  admissions: AdmissionRecord[];
  attendance: AttendanceHistory;
  exams: ExamHistory;
  fees: FeeHistory;
  library: LibraryHistory;
  idCards: IdCardHistory;
  courses: CourseHistory;
  graduations: GraduationHistory;
}

export interface HistoryMetadata {
  generatedAt: Date;
  academicYears: AcademicYear[];
  totalRecords: number;
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
}

// Admission Records
export interface AdmissionRecord {
  id: string;
  admissionDate: Date | null;
  admissionYear: string | null;
  enrollmentStatus: EnrollmentStatus;
  enrollmentType: string | null;
  shift: string | null;
  isBoarder: boolean;
  feeStatus: string | null;
  class: ClassInfo | null;
  classAcademicYear: ClassAcademicYearInfo | null;
  academicYear: AcademicYear | null;
  residencyType: ResidencyTypeInfo | null;
  room: RoomInfo | null;
  school: SchoolInfo | null;
  placementNotes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ClassInfo {
  id: string;
  name: string;
  gradeLevel: number | null;
}

export interface ClassAcademicYearInfo {
  id: string;
  sectionName: string | null;
}

export interface ResidencyTypeInfo {
  id: string;
  name: string;
}

export interface RoomInfo {
  id: string;
  roomNumber: string;
}

export interface SchoolInfo {
  id: string;
  name: string;
}

// Attendance History
export interface AttendanceHistory {
  summary: AttendanceSummary;
  monthlyBreakdown: MonthlyAttendance[];
  recentRecords: AttendanceRecord[];
}

export interface AttendanceSummary {
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  sickCount: number;
  leaveCount: number;
  attendanceRate: number;
  firstRecordDate: Date | null;
  lastRecordDate: Date | null;
}

export interface MonthlyAttendance {
  month: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  rate: number;
}

export interface AttendanceRecord {
  id: string;
  date: Date;
  status: AttendanceStatus;
  note: string | null;
  markedAt: Date | null;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'sick' | 'leave';

// Exam History
export interface ExamHistory {
  summary: ExamSummary;
  exams: ExamRecord[];
}

export interface ExamSummary {
  totalExams: number;
  totalMarks: number;
  totalMaxMarks: number;
  averagePercentage: number;
}

export interface ExamRecord {
  id: string;
  examId: string;
  examName: string | null;
  examRollNumber: string | null;
  examSecretNumber: string | null;
  className: string | null;
  examStatus: string | null;
  examStartDate: Date | null;
  examEndDate: Date | null;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  subjectResults: SubjectResult[];
}

export interface SubjectResult {
  id: string;
  subjectName: string;
  marksObtained: number | null;
  maxMarks: number;
  isAbsent: boolean;
  percentage: number;
  remarks: string | null;
}

// Fee History
export interface FeeHistory {
  summary: FeeSummary;
  assignments: FeeAssignment[];
  payments: FeePayment[];
}

export interface FeeSummary {
  totalAssigned: number;
  totalPaid: number;
  totalRemaining: number;
  totalDiscount: number;
  paymentProgress: number;
}

export interface FeeAssignment {
  id: string;
  feeStructure: FeeStructureInfo | null;
  academicYear: AcademicYear | null;
  originalAmount: number;
  assignedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  exceptionType: string | null;
  exceptionAmount: number;
  exceptionReason: string | null;
  dueDate: Date | null;
  status: FeeStatus | null;
  currency: string | null;
  createdAt: Date | null;
}

export interface FeeStructureInfo {
  id: string;
  name: string;
}

export type FeeStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';

export interface FeePayment {
  id: string;
  amount: number;
  paymentDate: Date | null;
  paymentMethod: string | null;
  referenceNo: string | null;
  feeStructureName: string | null;
  currency: string | null;
  receivedBy: string | null;
  notes: string | null;
  createdAt: Date | null;
}

// Library History
export interface LibraryHistory {
  summary: LibrarySummary;
  loans: LibraryLoan[];
}

export interface LibrarySummary {
  totalLoans: number;
  returnedLoans: number;
  currentLoans: number;
  overdueLoans: number;
  returnRate: number;
}

export interface LibraryLoan {
  id: string;
  book: BookInfo | null;
  copyCode: string | null;
  loanDate: Date | null;
  dueDate: Date | null;
  returnedAt: Date | null;
  depositAmount: number;
  feeRetained: number;
  refunded: boolean;
  isOverdue: boolean;
  status: LibraryLoanStatus;
  notes: string | null;
}

export interface BookInfo {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
}

export type LibraryLoanStatus = 'active' | 'returned' | 'overdue';

// ID Card History
export interface IdCardHistory {
  summary: IdCardSummary;
  cards: IdCardRecord[];
}

export interface IdCardSummary {
  totalCards: number;
  printedCards: number;
  unprintedCards: number;
  feePaidCards: number;
  feeUnpaidCards: number;
}

export interface IdCardRecord {
  id: string;
  cardNumber: string | null;
  template: IdCardTemplateInfo | null;
  academicYear: AcademicYear | null;
  class: ClassInfo | null;
  cardFee: number;
  cardFeePaid: boolean;
  cardFeePaidDate: Date | null;
  isPrinted: boolean;
  printedAt: Date | null;
  printedBy: string | null;
  notes: string | null;
  createdAt: Date | null;
}

export interface IdCardTemplateInfo {
  id: string;
  name: string;
}

// Course History
export interface CourseHistory {
  summary: CourseSummary;
  courses: CourseRecord[];
}

export interface CourseSummary {
  totalCourses: number;
  completedCourses: number;
  enrolledCourses: number;
  droppedCourses: number;
  certificatesIssued: number;
  completionRate: number;
}

export interface CourseRecord {
  id: string;
  course: CourseInfo | null;
  admissionNo: string | null;
  registrationDate: Date | null;
  completionStatus: CourseCompletionStatus;
  completionDate: Date | null;
  grade: string | null;
  certificateIssued: boolean;
  certificateIssuedDate: Date | null;
  certificateNumber: string | null;
  feePaid: boolean;
  feePaidDate: Date | null;
  feeAmount: number;
  createdAt: Date | null;
}

export interface CourseInfo {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
}

export type CourseCompletionStatus = 'enrolled' | 'completed' | 'dropped' | 'failed';

// Graduation History
export interface GraduationHistory {
  summary: GraduationSummary;
  graduations: GraduationRecord[];
}

export interface GraduationSummary {
  totalGraduations: number;
  passed: number;
  failed: number;
  conditional: number;
}

export interface GraduationRecord {
  id: string;
  batch: GraduationBatchInfo | null;
  finalResultStatus: GraduationResultStatus | null;
  position: number | null;
  remarks: string | null;
  eligibilityJson: Record<string, unknown> | null;
  createdAt: Date | null;
}

export interface GraduationBatchInfo {
  id: string;
  name: string;
  graduationDate: Date | null;
  academicYear: string | null;
  class: string | null;
}

export type GraduationResultStatus = 'pass' | 'fail' | 'conditional';

// Filter types for UI
export interface StudentHistoryFilters {
  dateFrom?: Date;
  dateTo?: Date;
  section?: string;
  eventTypes?: HistoryEventType[];
}

// Export request types
export interface StudentHistoryExportRequest {
  reportType: 'pdf' | 'excel';
  brandingId?: string;
  calendarPreference?: 'gregorian' | 'jalali' | 'qamari';
  language?: 'en' | 'ps' | 'fa' | 'ar';
  sections?: string[];
}

