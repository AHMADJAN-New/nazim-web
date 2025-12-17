import type * as FeeApi from '@/types/api/fees';
import type { FeeAssignment, FeeException, FeePayment, FeeStructure } from '@/types/domain/fees';

const parseDate = (value: string | null | undefined): Date | null => (value ? new Date(value) : null);

// =========================
// Fee Structures
// =========================
export const mapFeeStructureApiToDomain = (api: FeeApi.FeeStructure): FeeStructure => ({
  id: api.id,
  organizationId: api.organization_id,
  schoolId: api.school_id,
  academicYearId: api.academic_year_id,
  classId: api.class_id,
  classAcademicYearId: api.class_academic_year_id,
  name: api.name,
  code: api.code,
  description: api.description,
  feeType: api.fee_type,
  amount: Number(api.amount),
  currencyId: api.currency_id,
  dueDate: parseDate(api.due_date),
  startDate: parseDate(api.start_date),
  endDate: parseDate(api.end_date),
  isActive: api.is_active,
  isRequired: api.is_required,
  displayOrder: api.display_order,
  createdAt: new Date(api.created_at),
  updatedAt: new Date(api.updated_at),
  deletedAt: parseDate(api.deleted_at),
});

export const mapFeeStructureDomainToInsert = (domain: Partial<FeeStructure>): FeeApi.FeeStructureInsert => ({
  organization_id: domain.organizationId,
  school_id: domain.schoolId,
  academic_year_id: domain.academicYearId ?? '',
  class_id: domain.classId,
  class_academic_year_id: domain.classAcademicYearId,
  name: domain.name ?? '',
  code: domain.code ?? null,
  description: domain.description ?? null,
  fee_type: domain.feeType ?? 'one_time',
  amount: domain.amount ?? 0,
  currency_id: domain.currencyId ?? null,
  due_date: domain.dueDate ? domain.dueDate.toISOString().slice(0, 10) : null,
  start_date: domain.startDate ? domain.startDate.toISOString().slice(0, 10) : null,
  end_date: domain.endDate ? domain.endDate.toISOString().slice(0, 10) : null,
  is_active: domain.isActive,
  is_required: domain.isRequired,
  display_order: domain.displayOrder,
});

export const mapFeeStructureDomainToUpdate = (domain: Partial<FeeStructure>): FeeApi.FeeStructureUpdate => ({
  school_id: domain.schoolId,
  academic_year_id: domain.academicYearId,
  class_id: domain.classId,
  class_academic_year_id: domain.classAcademicYearId,
  name: domain.name,
  code: domain.code,
  description: domain.description,
  fee_type: domain.feeType,
  amount: domain.amount,
  currency_id: domain.currencyId,
  due_date: domain.dueDate ? domain.dueDate.toISOString().slice(0, 10) : null,
  start_date: domain.startDate ? domain.startDate.toISOString().slice(0, 10) : null,
  end_date: domain.endDate ? domain.endDate.toISOString().slice(0, 10) : null,
  is_active: domain.isActive,
  is_required: domain.isRequired,
  display_order: domain.displayOrder,
});

// =========================
// Fee Assignments
// =========================
export const mapFeeAssignmentApiToDomain = (api: FeeApi.FeeAssignment): FeeAssignment => ({
  id: api.id,
  organizationId: api.organization_id,
  schoolId: api.school_id,
  studentId: api.student_id,
  studentAdmissionId: api.student_admission_id,
  feeStructureId: api.fee_structure_id,
  academicYearId: api.academic_year_id,
  classAcademicYearId: api.class_academic_year_id,
  originalAmount: Number(api.original_amount),
  assignedAmount: Number(api.assigned_amount),
  currencyId: api.currency_id,
  exceptionType: api.exception_type,
  exceptionAmount: Number(api.exception_amount),
  exceptionReason: api.exception_reason,
  exceptionApprovedBy: api.exception_approved_by,
  exceptionApprovedAt: parseDate(api.exception_approved_at),
  paymentPeriodStart: parseDate(api.payment_period_start),
  paymentPeriodEnd: parseDate(api.payment_period_end),
  dueDate: new Date(api.due_date),
  status: api.status,
  paidAmount: Number(api.paid_amount),
  remainingAmount: Number(api.remaining_amount),
  notes: api.notes,
  createdAt: new Date(api.created_at),
  updatedAt: new Date(api.updated_at),
  deletedAt: parseDate(api.deleted_at),
});

export const mapFeeAssignmentDomainToInsert = (domain: Partial<FeeAssignment>): FeeApi.FeeAssignmentInsert => ({
  organization_id: domain.organizationId,
  school_id: domain.schoolId,
  student_id: domain.studentId ?? '',
  student_admission_id: domain.studentAdmissionId ?? '',
  fee_structure_id: domain.feeStructureId ?? '',
  academic_year_id: domain.academicYearId ?? '',
  class_academic_year_id: domain.classAcademicYearId,
  original_amount: domain.originalAmount,
  assigned_amount: domain.assignedAmount,
  currency_id: domain.currencyId,
  exception_type: domain.exceptionType,
  exception_amount: domain.exceptionAmount,
  exception_reason: domain.exceptionReason,
  exception_approved_by: domain.exceptionApprovedBy,
  exception_approved_at: domain.exceptionApprovedAt ? domain.exceptionApprovedAt.toISOString() : null,
  payment_period_start: domain.paymentPeriodStart ? domain.paymentPeriodStart.toISOString().slice(0, 10) : null,
  payment_period_end: domain.paymentPeriodEnd ? domain.paymentPeriodEnd.toISOString().slice(0, 10) : null,
  due_date: domain.dueDate ? domain.dueDate.toISOString().slice(0, 10) : '',
  status: domain.status,
  paid_amount: domain.paidAmount,
  remaining_amount: domain.remainingAmount,
  notes: domain.notes,
});

export const mapFeeAssignmentDomainToUpdate = (domain: Partial<FeeAssignment>): FeeApi.FeeAssignmentUpdate => ({
  school_id: domain.schoolId,
  student_id: domain.studentId,
  student_admission_id: domain.studentAdmissionId,
  fee_structure_id: domain.feeStructureId,
  academic_year_id: domain.academicYearId,
  class_academic_year_id: domain.classAcademicYearId,
  original_amount: domain.originalAmount,
  assigned_amount: domain.assignedAmount,
  currency_id: domain.currencyId,
  exception_type: domain.exceptionType,
  exception_amount: domain.exceptionAmount,
  exception_reason: domain.exceptionReason,
  exception_approved_by: domain.exceptionApprovedBy,
  exception_approved_at: domain.exceptionApprovedAt ? domain.exceptionApprovedAt.toISOString() : null,
  payment_period_start: domain.paymentPeriodStart ? domain.paymentPeriodStart.toISOString().slice(0, 10) : null,
  payment_period_end: domain.paymentPeriodEnd ? domain.paymentPeriodEnd.toISOString().slice(0, 10) : null,
  due_date: domain.dueDate ? domain.dueDate.toISOString().slice(0, 10) : undefined,
  status: domain.status,
  paid_amount: domain.paidAmount,
  remaining_amount: domain.remainingAmount,
  notes: domain.notes,
});

// =========================
// Fee Payments
// =========================
export const mapFeePaymentApiToDomain = (api: FeeApi.FeePayment): FeePayment => ({
  id: api.id,
  organizationId: api.organization_id,
  schoolId: api.school_id,
  feeAssignmentId: api.fee_assignment_id,
  studentId: api.student_id,
  studentAdmissionId: api.student_admission_id,
  amount: Number(api.amount),
  currencyId: api.currency_id,
  paymentDate: new Date(api.payment_date),
  paymentMethod: api.payment_method,
  referenceNo: api.reference_no,
  accountId: api.account_id,
  incomeEntryId: api.income_entry_id,
  receivedByUserId: api.received_by_user_id,
  notes: api.notes,
  createdAt: new Date(api.created_at),
  updatedAt: new Date(api.updated_at),
  deletedAt: parseDate(api.deleted_at),
});

export const mapFeePaymentDomainToInsert = (domain: Partial<FeePayment>): FeeApi.FeePaymentInsert => ({
  organization_id: domain.organizationId,
  school_id: domain.schoolId,
  fee_assignment_id: domain.feeAssignmentId ?? '',
  student_id: domain.studentId ?? '',
  student_admission_id: domain.studentAdmissionId ?? '',
  amount: domain.amount ?? 0,
  currency_id: domain.currencyId,
  payment_date: domain.paymentDate ? domain.paymentDate.toISOString().slice(0, 10) : '',
  payment_method: domain.paymentMethod ?? 'cash',
  reference_no: domain.referenceNo ?? null,
  account_id: domain.accountId ?? '',
  received_by_user_id: domain.receivedByUserId ?? null,
  notes: domain.notes ?? null,
});

export const mapFeePaymentDomainToUpdate = (domain: Partial<FeePayment>): FeeApi.FeePaymentUpdate => ({
  school_id: domain.schoolId,
  fee_assignment_id: domain.feeAssignmentId,
  student_id: domain.studentId,
  student_admission_id: domain.studentAdmissionId,
  amount: domain.amount,
  currency_id: domain.currencyId,
  payment_date: domain.paymentDate ? domain.paymentDate.toISOString().slice(0, 10) : undefined,
  payment_method: domain.paymentMethod,
  reference_no: domain.referenceNo,
  account_id: domain.accountId,
  received_by_user_id: domain.receivedByUserId,
  notes: domain.notes,
});

// =========================
// Fee Exceptions
// =========================
export const mapFeeExceptionApiToDomain = (api: FeeApi.FeeException): FeeException => ({
  id: api.id,
  organizationId: api.organization_id,
  feeAssignmentId: api.fee_assignment_id,
  studentId: api.student_id,
  exceptionType: api.exception_type,
  exceptionAmount: Number(api.exception_amount),
  exceptionReason: api.exception_reason,
  approvedByUserId: api.approved_by_user_id,
  approvedAt: new Date(api.approved_at),
  validFrom: new Date(api.valid_from),
  validTo: parseDate(api.valid_to),
  isActive: api.is_active,
  notes: api.notes,
  createdAt: new Date(api.created_at),
  updatedAt: new Date(api.updated_at),
  deletedAt: parseDate(api.deleted_at),
});

export const mapFeeExceptionDomainToInsert = (domain: Partial<FeeException>): FeeApi.FeeExceptionInsert => ({
  organization_id: domain.organizationId,
  fee_assignment_id: domain.feeAssignmentId ?? '',
  student_id: domain.studentId ?? '',
  exception_type: domain.exceptionType ?? 'discount_fixed',
  exception_amount: domain.exceptionAmount ?? 0,
  exception_reason: domain.exceptionReason ?? '',
  approved_by_user_id: domain.approvedByUserId ?? '',
  approved_at: domain.approvedAt ? domain.approvedAt.toISOString() : null,
  valid_from: domain.validFrom ? domain.validFrom.toISOString().slice(0, 10) : '',
  valid_to: domain.validTo ? domain.validTo.toISOString().slice(0, 10) : null,
  is_active: domain.isActive,
  notes: domain.notes ?? null,
});

export const mapFeeExceptionDomainToUpdate = (domain: Partial<FeeException>): FeeApi.FeeExceptionUpdate => ({
  fee_assignment_id: domain.feeAssignmentId,
  student_id: domain.studentId,
  exception_type: domain.exceptionType,
  exception_amount: domain.exceptionAmount,
  exception_reason: domain.exceptionReason,
  approved_by_user_id: domain.approvedByUserId,
  approved_at: domain.approvedAt ? domain.approvedAt.toISOString() : null,
  valid_from: domain.validFrom ? domain.validFrom.toISOString().slice(0, 10) : undefined,
  valid_to: domain.validTo ? domain.validTo.toISOString().slice(0, 10) : null,
  is_active: domain.isActive,
  notes: domain.notes,
});

