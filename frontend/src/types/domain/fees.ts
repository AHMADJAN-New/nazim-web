import type { FeeAssignmentStatus, FeeExceptionType, FeeType, PaymentMethod } from '@/types/api/fees';

export interface FeeStructure {
  id: string;
  organizationId: string;
  schoolId: string | null;
  academicYearId: string;
  classId: string | null;
  classAcademicYearId: string | null;
  name: string;
  code: string | null;
  description: string | null;
  feeType: FeeType;
  amount: number;
  currencyId: string | null;
  dueDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
  isRequired: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FeeAssignment {
  id: string;
  organizationId: string;
  schoolId: string | null;
  studentId: string;
  studentAdmissionId: string;
  feeStructureId: string;
  academicYearId: string;
  classAcademicYearId: string | null;
  originalAmount: number;
  assignedAmount: number;
  currencyId: string | null;
  exceptionType: FeeExceptionType;
  exceptionAmount: number;
  exceptionReason: string | null;
  exceptionApprovedBy: string | null;
  exceptionApprovedAt: Date | null;
  paymentPeriodStart: Date | null;
  paymentPeriodEnd: Date | null;
  dueDate: Date;
  status: FeeAssignmentStatus;
  paidAmount: number;
  remainingAmount: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FeePayment {
  id: string;
  organizationId: string;
  schoolId: string | null;
  feeAssignmentId: string;
  studentId: string;
  studentAdmissionId: string;
  amount: number;
  currencyId: string | null;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  referenceNo: string | null;
  accountId: string;
  incomeEntryId: string | null;
  receivedByUserId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FeeException {
  id: string;
  organizationId: string;
  feeAssignmentId: string;
  studentId: string;
  exceptionType: FeeExceptionType;
  exceptionAmount: number;
  exceptionReason: string;
  approvedByUserId: string;
  approvedAt: Date | null;
  validFrom: Date;
  validTo: Date | null;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

