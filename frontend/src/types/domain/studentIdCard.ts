// Student ID Card Domain Types - UI-friendly structure (camelCase, Date objects, nested structures)

export interface StudentIdCard {
  id: string;
  organizationId: string;
  schoolId: string | null;
  studentId: string;
  studentAdmissionId: string;
  courseStudentId?: string | null;
  idCardTemplateId: string;
  academicYearId: string;
  classId: string | null;
  classAcademicYearId: string | null;
  cardNumber: string | null;
  cardFee: number | null;
  cardFeePaid: boolean;
  cardFeePaidDate: Date | null;
  incomeEntryId: string | null;
  isPrinted: boolean;
  printedAt: Date | null;
  printedBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  student?: {
    id: string;
    fullName: string;
    admissionNumber: string;
    studentCode?: string | null;
    cardNumber: string | null;
    fatherName: string | null;
    gender: string | null;
    picturePath?: string | null;
  };
  studentAdmission?: {
    id: string;
    enrollmentStatus: string;
    classId: string | null;
    classAcademicYearId: string | null;
  };
  courseStudent?: {
    id: string;
    courseId: string;
    admissionNo: string;
    fullName: string;
    fatherName?: string | null;
    picturePath?: string | null;
    course?: {
      id: string;
      name: string;
      code?: string | null;
    };
  };
  template?: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
  };
  academicYear?: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  };
  class?: {
    id: string;
    name: string;
    gradeLevel: number | null;
  };
  classAcademicYear?: {
    id: string;
    sectionName: string | null;
  };
  organization?: {
    id: string;
    name: string;
  };
  printedByUser?: {
    id: string;
    fullName: string | null;
  };
  incomeEntry?: {
    id: string;
    accountId: string;
    incomeCategoryId: string;
    amount: number;
    date: Date;
  };
}

export interface StudentIdCardInsert {
  studentId: string;
  studentAdmissionId: string;
  idCardTemplateId: string;
  academicYearId: string;
  organizationId?: string | null;
  classId?: string | null;
  classAcademicYearId?: string | null;
  cardNumber?: string | null;
  cardFee?: number | null;
  cardFeePaid?: boolean;
  cardFeePaidDate?: string | null;
  notes?: string | null;
}

export type StudentIdCardUpdate = Partial<Omit<StudentIdCardInsert, 'studentId' | 'studentAdmissionId' | 'academicYearId' | 'organizationId'>> & {
  idCardTemplateId?: string;
  classId?: string | null;
  classAcademicYearId?: string | null;
  cardNumber?: string | null;
  cardFee?: number | null;
  cardFeePaid?: boolean;
  cardFeePaidDate?: string | null;
  accountId?: string | null;
  incomeCategoryId?: string | null;
  isPrinted?: boolean;
  printedAt?: string | null;
  printedBy?: string | null;
  notes?: string | null;
};

export interface AssignIdCardRequest {
  academicYearId: string;
  idCardTemplateId: string;
  studentAdmissionIds?: string[];
  courseStudentIds?: string[];
  classId?: string | null;
  classAcademicYearId?: string | null;
  cardFee?: number | null;
  cardFeePaid?: boolean;
  cardFeePaidDate?: string | null;
  accountId?: string | null;
  incomeCategoryId?: string | null;
  cardNumber?: string | null;
  notes?: string | null;
}

export interface IdCardFilters {
  academicYearId?: string;
  schoolId?: string;
  classId?: string;
  classAcademicYearId?: string;
  courseId?: string;
  courseStudentId?: string;
  studentType?: 'regular' | 'course' | 'all';
  enrollmentStatus?: string;
  templateId?: string;
  isPrinted?: boolean;
  cardFeePaid?: boolean;
  search?: string;
  page?: number;
  perPage?: number;
}

export interface IdCardExportRequest {
  cardIds?: string[];
  filters?: IdCardFilters;
  format: 'zip' | 'pdf';
  sides: 'front' | 'back' | 'both';
  cardsPerPage?: number;
  quality?: 'standard' | 'high';
  includeUnprinted?: boolean;
  includeUnpaid?: boolean;
  fileNamingTemplate?: string;
}

export interface IdCardStatistics {
  total: number;
  printed: number;
  unprinted: number;
  feePaid: number;
  feeUnpaid: number;
  totalFeeCollected: number;
  totalFeePending: number;
}
