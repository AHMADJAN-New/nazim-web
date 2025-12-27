import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { FeePaymentForm } from '@/components/fees/FeePaymentForm';
import { useCreateFeePayment, useFeeAssignments, useFeePayments, useFeeStructures, useFeeExceptions } from '@/hooks/useFees';
import { useFinanceAccounts } from '@/hooks/useFinance';
import { useLanguage } from '@/hooks/useLanguage';
import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import type { Student } from '@/types/domain/student';
import { useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useProfile } from '@/hooks/useProfiles';
import { showToast } from '@/lib/toast';
import type { FeePaymentFormData } from '@/lib/validations/fees';
import type { FeePayment } from '@/types/domain/fees';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, FileText } from 'lucide-react';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';

export default function FeePaymentsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const [filterAcademicYear, setFilterAcademicYear] = useState<string | undefined>(undefined);
  const [filterClassAy, setFilterClassAy] = useState<string | undefined>(undefined);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingPayment, setViewingPayment] = useState<FeePayment | null>(null);

  const { data: academicYears = [] } = useAcademicYears();
  const { data: currentAcademicYear } = useCurrentAcademicYear();
  const { data: classAcademicYears = [] } = useClassAcademicYears(filterAcademicYear);
  const { data: assignments = [] } = useFeeAssignments({
    academicYearId: filterAcademicYear,
    classAcademicYearId: filterClassAy,
  });
  const { data: structures = [] } = useFeeStructures({
    academicYearId: filterAcademicYear,
    classAcademicYearId: filterClassAy,
  });
  const {
    data: payments = [],
    isLoading,
    pagination,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useFeePayments(undefined, true);
  const { data: accounts = [] } = useFinanceAccounts();
  const { data: studentAdmissions } = useStudentAdmissions(profile?.organization_id, false, {
    enrollment_status: 'active',
  });
  // Extract students from admissions
  const students: Student[] = useMemo(() => {
    if (!studentAdmissions || !Array.isArray(studentAdmissions)) return [];
    return studentAdmissions
      .map(admission => admission.student)
      .filter((student): student is Student => student !== null && student !== undefined);
  }, [studentAdmissions]);
  const { data: feeExceptions = [] } = useFeeExceptions({
    academicYearId: filterAcademicYear,
    classAcademicYearId: filterClassAy,
  });
  const createPayment = useCreateFeePayment();
  const [open, setOpen] = useState(false);

  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        value: account.id,
        label: account.name,
      })),
    [accounts]
  );

  const assignmentsById = useMemo(
    () => Object.fromEntries(assignments.map((a) => [a.id, a])),
    [assignments],
  );

  const structuresById = useMemo(
    () => Object.fromEntries(structures.map((s) => [s.id, s])),
    [structures],
  );

  const classAyById = useMemo(
    () => Object.fromEntries(classAcademicYears.map((cay) => [cay.id, cay])),
    [classAcademicYears],
  );

  const accountsById = useMemo(
    () => Object.fromEntries(accounts.map((acc) => [acc.id, acc])),
    [accounts],
  );

  const studentsById = useMemo(
    () => Object.fromEntries(students.map((student) => [student.id, student])),
    [students],
  );

  // Payment method badge colors
  const getPaymentMethodBadgeColor = (method: string) => {
    const colors: Record<string, string> = {
      cash: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-100',
      bank_transfer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100',
      cheque: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-100',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-100',
    };
    return colors[method] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-100';
  };

  // With pagination, filtering is done on the backend
  // But we still need to filter client-side for display if filters are applied
  const filteredPayments = useMemo(() => {
    // If using pagination, the backend already filters, so just return payments
    // Client-side filtering is only needed for non-paginated mode or additional filtering
    if (!filterAcademicYear && !filterClassAy) return payments;
    const allowedAssignmentIds = new Set(assignments.map((a) => a.id));
    return payments.filter((p) => allowedAssignmentIds.has(p.feeAssignmentId));
  }, [payments, assignments, filterAcademicYear, filterClassAy]);

  const assignmentOptions = useMemo(
    () =>
      assignments.map((assignment) => {
        const className =
          assignment.classAcademicYearId &&
          (classAyById[assignment.classAcademicYearId]?.class?.name ?? assignment.classAcademicYearId);
        const structureName =
          structuresById[assignment.feeStructureId]?.name ?? assignment.feeStructureId;
        const student = studentsById[assignment.studentId];
        const studentName = student ? student.fullName : assignment.studentId;
        const remaining = assignment.remainingAmount.toFixed(2);
        const status = assignment.status;
        
        return {
          value: assignment.id,
          label: `${structureName} - ${className ?? t('common.notAvailable')} - ${studentName} (${t('fees.remaining')}: ${remaining})`,
          studentId: assignment.studentId,
          studentAdmissionId: assignment.studentAdmissionId,
          assignment: assignment, // Include full assignment for form use
        };
      }),
    [assignments, classAyById, structuresById, studentsById, t],
  );

  // Auto-select current academic year for filters
  useEffect(() => {
    if (!filterAcademicYear) {
      if (currentAcademicYear) {
        setFilterAcademicYear(currentAcademicYear.id);
      } else if (academicYears.length > 0) {
        // Fallback to first academic year if no current year
        setFilterAcademicYear(academicYears[0].id);
      }
    }
  }, [academicYears, currentAcademicYear, filterAcademicYear]);

  const handleSubmit = async (values: FeePaymentFormData) => {
    // Validate required fields
    if (!values.fee_assignment_id || values.fee_assignment_id === '') {
      showToast.error(t('fees.assignmentRequired') || 'Fee assignment is required');
      return;
    }
    if (!values.account_id || values.account_id === '') {
      showToast.error(t('fees.accountRequired') || 'Account is required');
      return;
    }
    if (!values.payment_date || values.payment_date === '') {
      showToast.error(t('fees.paymentDateRequired') || 'Payment date is required');
      return;
    }
    if (!values.amount || values.amount <= 0) {
      showToast.error(t('fees.amountRequired') || 'Amount must be greater than 0');
      return;
    }

    // Convert form data (snake_case) to domain format (camelCase)
    // Convert empty strings to null for optional fields
    const domainPayload: Partial<FeePayment> = {
      feeAssignmentId: values.fee_assignment_id,
      studentId: values.student_id && values.student_id !== '' ? values.student_id : '',
      studentAdmissionId: values.student_admission_id && values.student_admission_id !== '' ? values.student_admission_id : '',
      amount: typeof values.amount === 'number' ? values.amount : parseFloat(String(values.amount)),
      currencyId: values.currency_id && values.currency_id !== '' ? values.currency_id : null,
      paymentDate: new Date(values.payment_date),
      paymentMethod: values.payment_method as FeePayment['paymentMethod'],
      referenceNo: values.reference_no && values.reference_no !== '' ? values.reference_no : null,
      accountId: values.account_id,
      receivedByUserId: values.received_by_user_id && values.received_by_user_id !== '' ? values.received_by_user_id : null,
      notes: values.notes && values.notes !== '' ? values.notes : null,
      schoolId: values.school_id && values.school_id !== '' ? values.school_id : null,
    };

    try {
      await createPayment.mutateAsync(domainPayload);
      setOpen(false);
    } catch (error) {
      // Error is handled by the mutation's onError
      if (import.meta.env.DEV) {
        console.error('[FeePaymentsPage] Submit failed:', error);
      }
    }
  };

  const formatDate = (value: Date | string | undefined) => {
    if (!value) return t('common.notAvailable');
    const date = typeof value === 'string' ? new Date(value) : value;
    return format(date, 'yyyy-MM-dd');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('fees.payments')}</h1>
        <div className="flex items-center gap-2">
          <ReportExportButtons
            data={filteredPayments}
            columns={[
              { key: 'studentName', label: t('fees.student'), align: 'left' },
              { key: 'className', label: t('fees.class'), align: 'left' },
              { key: 'structureName', label: t('fees.structure'), align: 'left' },
              { key: 'paymentDate', label: t('fees.paymentDate'), align: 'left' },
              { key: 'amount', label: t('fees.amount'), align: 'right' },
              { key: 'paymentMethod', label: t('fees.method'), align: 'left' },
              { key: 'referenceNo', label: t('fees.reference'), align: 'left' },
              { key: 'accountName', label: t('fees.account'), align: 'left' },
            ]}
            reportKey="fee_payments"
            title={t('fees.payments') || 'Fee Payments'}
            transformData={(data) =>
              data.map((payment) => {
                const assignment = assignmentsById[payment.feeAssignmentId];
                const className =
                  assignment?.classAcademicYearId &&
                  (classAyById[assignment.classAcademicYearId]?.class?.name ??
                    assignment.classAcademicYearId);
                const structureName = assignment
                  ? structuresById[assignment.feeStructureId]?.name ?? assignment.feeStructureId
                  : payment.feeAssignmentId;
                const account = accountsById[payment.accountId];
                const student = studentsById[payment.studentId];
                return {
                  studentName: student?.fullName || payment.studentId || '-',
                  className: className || '-',
                  structureName: structureName || '-',
                  paymentDate: formatDate(payment.paymentDate),
                  amount: formatCurrency(payment.amount),
                  paymentMethod: payment.paymentMethod.replace('_', ' ').toUpperCase(),
                  referenceNo: payment.referenceNo || '-',
                  accountName: account?.name || '-',
                };
              })
            }
            buildFiltersSummary={() => {
              const parts: string[] = [];
              const ay = academicYears.find((a) => a.id === filterAcademicYear);
              if (ay) parts.push(`${t('fees.academicYear')}: ${ay.name}`);
              if (filterClassAy) {
                const cay = classAcademicYears.find((c) => c.id === filterClassAy);
                if (cay) parts.push(`${t('fees.class')}: ${cay.class?.name || filterClassAy}`);
              }
              return parts.join(' | ');
            }}
            templateType="fee_payments"
            disabled={isLoading || filteredPayments.length === 0}
          />
          <Button
            variant="outline"
            onClick={() => navigate('/finance/fees/assignments')}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            {t('fees.assignments') || 'Fee Assignments'}
          </Button>
          <Dialog 
          open={open} 
          onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              // Reset filters when dialog closes
              if (currentAcademicYear) {
                setFilterAcademicYear(currentAcademicYear.id);
              }
              setFilterClassAy(undefined);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>{t('fees.recordPayment')}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('fees.recordPayment')}</DialogTitle>
              <DialogDescription>
                {t('fees.recordPaymentDescription') || 'Record a fee payment for a student assignment'}
              </DialogDescription>
            </DialogHeader>
            
            {/* Academic Year and Class Filters in Dialog */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <label className="text-sm font-medium mb-2 block">{t('fees.academicYear')}</label>
                <Select
                  value={filterAcademicYear || ''}
                  onValueChange={(val) => {
                    setFilterAcademicYear(val || undefined);
                    setFilterClassAy(undefined); // Reset class when academic year changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('fees.selectAcademicYear')} />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((ay) => (
                      <SelectItem key={ay.id} value={ay.id}>
                        {ay.name} {ay.isCurrent && `(${t('academic.academicYears.current')})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{t('fees.class')}</label>
                <Select 
                  value={filterClassAy || 'all'} 
                  onValueChange={(val) => setFilterClassAy(val === 'all' ? undefined : val)}
                  disabled={!filterAcademicYear}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={filterAcademicYear ? t('fees.selectClass') : t('fees.selectAcademicYearFirst') || 'Select academic year first'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('fees.allClasses') || 'All Classes'}</SelectItem>
                    {classAcademicYears.map((cay) => (
                      <SelectItem key={cay.id} value={cay.id}>
                        {cay.class?.name ?? cay.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <FeePaymentForm
              assignments={assignmentOptions}
              accounts={accountOptions}
              onSubmit={handleSubmit}
              isSubmitting={createPayment.isPending}
              onCancel={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('fees.filters')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm font-medium">{t('fees.academicYear')}</span>
            <Select
              value={filterAcademicYear || ''}
              onValueChange={(val) => {
                setFilterAcademicYear(val || undefined);
                setFilterClassAy(undefined);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('fees.selectAcademicYear')} />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((ay) => (
                  <SelectItem key={ay.id} value={ay.id}>
                    {ay.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="text-sm font-medium">{t('fees.class')}</span>
            <Select value={filterClassAy || 'all'} onValueChange={(val) => setFilterClassAy(val === 'all' ? undefined : val)}>
              <SelectTrigger>
                <SelectValue placeholder={t('fees.selectClass')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('fees.allClasses') || 'All Classes'}</SelectItem>
                {classAcademicYears.map((cay) => (
                  <SelectItem key={cay.id} value={cay.id}>
                    {cay.class?.name ?? cay.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('fees.payments')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>{t('common.loading')}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('fees.class')}</TableHead>
                    <TableHead>{t('fees.structure')}</TableHead>
                    <TableHead>{t('fees.paymentDate')}</TableHead>
                    <TableHead>{t('fees.amount')}</TableHead>
                    <TableHead>{t('fees.method')}</TableHead>
                    <TableHead>{t('fees.reference')}</TableHead>
                    <TableHead>{t('fees.account')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => {
                    const assignment = assignmentsById[payment.feeAssignmentId];
                    const className =
                      assignment?.classAcademicYearId &&
                      (classAyById[assignment.classAcademicYearId]?.class?.name ??
                        assignment.classAcademicYearId);
                    const structureName = assignment
                      ? structuresById[assignment.feeStructureId]?.name ?? assignment.feeStructureId
                      : payment.feeAssignmentId;
                    const account = accountsById[payment.accountId];
                    const student = studentsById[payment.studentId];

                    return (
                      <TableRow
                        key={payment.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setViewingPayment(payment);
                          setViewOpen(true);
                        }}
                      >
                        <TableCell>
                          {className ? (
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300">
                              {className}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">{t('common.notAvailable')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                            {structureName}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                        <TableCell className="font-medium">{payment.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={getPaymentMethodBadgeColor(payment.paymentMethod)}>
                            {payment.paymentMethod.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{payment.referenceNo || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>
                          {account ? (
                            <Badge variant="outline" className="bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300">
                              {account.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  setViewingPayment(payment);
                                  setViewOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {t('common.view')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {pagination && (
                <DataTablePagination
                  table={{
                    getState: () => ({
                      pagination: { pageIndex: page - 1, pageSize },
                    }),
                    setPageIndex: (index: number) => {
                      setPage(index + 1);
                    },
                    setPageSize: (size: number) => {
                      setPageSize(size);
                      setPage(1);
                    },
                    getPageCount: () => pagination.last_page,
                    getRowCount: () => pagination.total,
                    getRowModel: () => ({ rows: [] }),
                    options: { data: payments },
                  } as any}
                  paginationMeta={pagination}
                  onPageChange={setPage}
                  onPageSizeChange={(newPageSize) => {
                    setPageSize(newPageSize);
                    setPage(1);
                  }}
                  showPageSizeSelector={true}
                  showTotalCount={true}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Side Panel for Viewing Details */}
      <Sheet open={viewOpen} onOpenChange={setViewOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {viewingPayment && (
            <>
              <SheetHeader>
                <SheetTitle>{t('fees.paymentDetails')}</SheetTitle>
                <SheetDescription>{t('fees.paymentDetailsDescription')}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Payment Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t('fees.paymentInformation')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('fees.amount')}</p>
                      <p className="text-lg font-semibold">{viewingPayment.amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('fees.paymentDate')}</p>
                      <p className="text-sm font-medium">{formatDate(viewingPayment.paymentDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('fees.method')}</p>
                      <Badge className={getPaymentMethodBadgeColor(viewingPayment.paymentMethod)}>
                        {viewingPayment.paymentMethod.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    {viewingPayment.referenceNo && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('fees.reference')}</p>
                        <p className="text-sm font-medium">{viewingPayment.referenceNo}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Student Information */}
                {viewingPayment.studentId && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">{t('students.student')}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {studentsById[viewingPayment.studentId] ? (
                          <>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">{t('students.fullName')}</p>
                              <p className="text-sm font-medium">{studentsById[viewingPayment.studentId].fullName}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">{t('students.admissionNumber')}</p>
                              <p className="text-sm font-medium">{studentsById[viewingPayment.studentId].admissionNumber}</p>
                            </div>
                          </>
                        ) : (
                          <div>
                            <p className="text-sm text-muted-foreground">{t('common.notAvailable')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Fee Assignment Information */}
                {assignmentsById[viewingPayment.feeAssignmentId] && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">{t('fees.assignmentInformation')}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {assignmentsById[viewingPayment.feeAssignmentId].classAcademicYearId && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{t('fees.class')}</p>
                            {classAyById[assignmentsById[viewingPayment.feeAssignmentId].classAcademicYearId] ? (
                              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300">
                                {classAyById[assignmentsById[viewingPayment.feeAssignmentId].classAcademicYearId]?.class?.name}
                              </Badge>
                            ) : (
                              <p className="text-sm text-muted-foreground">—</p>
                            )}
                          </div>
                        )}
                        {assignmentsById[viewingPayment.feeAssignmentId].feeStructureId && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{t('fees.structure')}</p>
                            {structuresById[assignmentsById[viewingPayment.feeAssignmentId].feeStructureId] ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                                {structuresById[assignmentsById[viewingPayment.feeAssignmentId].feeStructureId]?.name}
                              </Badge>
                            ) : (
                              <p className="text-sm text-muted-foreground">—</p>
                            )}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{t('fees.assignedAmount')}</p>
                          <p className="text-sm font-medium">
                            {assignmentsById[viewingPayment.feeAssignmentId].assignedAmount.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{t('fees.paidAmount')}</p>
                          <p className="text-sm font-medium">
                            {assignmentsById[viewingPayment.feeAssignmentId].paidAmount.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{t('fees.remaining')}</p>
                          <p className="text-sm font-medium">
                            {assignmentsById[viewingPayment.feeAssignmentId].remainingAmount.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{t('fees.status')}</p>
                          <Badge variant="outline" className="capitalize">
                            {assignmentsById[viewingPayment.feeAssignmentId].status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Fee Exceptions */}
                {(() => {
                  const assignmentExceptions = feeExceptions.filter(
                    (exception) => exception.feeAssignmentId === viewingPayment.feeAssignmentId
                  );
                  
                  if (assignmentExceptions.length === 0) return null;
                  
                  return (
                    <>
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">{t('fees.exceptions')}</h3>
                        <div className="space-y-3">
                          {assignmentExceptions.map((exception) => (
                            <div key={exception.id} className="border rounded-lg p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      exception.exceptionType === 'waiver'
                                        ? 'destructive'
                                        : exception.exceptionType === 'discount_percentage'
                                        ? 'default'
                                        : 'secondary'
                                    }
                                  >
                                    {exception.exceptionType.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                  </Badge>
                                  {exception.isActive ? (
                                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">Inactive</Badge>
                                  )}
                                </div>
                                <p className="text-sm font-semibold">{formatCurrency(exception.exceptionAmount)}</p>
                              </div>
                              <p className="text-sm text-muted-foreground">{exception.exceptionReason}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {exception.validFrom && (
                                  <span>
                                    {t('fees.validFrom')}: {format(exception.validFrom, 'PPP')}
                                  </span>
                                )}
                                {exception.validTo && (
                                  <span>
                                    {t('fees.validTo')}: {format(exception.validTo, 'PPP')}
                                  </span>
                                )}
                              </div>
                              {exception.notes && (
                                <p className="text-xs text-muted-foreground mt-1">{exception.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <Separator />
                    </>
                  );
                })()}

                {/* Account Information */}
                {viewingPayment.accountId && accountsById[viewingPayment.accountId] && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">{t('finance.account')}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{t('finance.accountName')}</p>
                          <Badge variant="outline" className="bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300">
                            {accountsById[viewingPayment.accountId].name}
                          </Badge>
                        </div>
                        {accountsById[viewingPayment.accountId].accountType && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{t('finance.accountType')}</p>
                            <p className="text-sm">{accountsById[viewingPayment.accountId].accountType}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Notes */}
                {viewingPayment.notes && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">{t('common.notes')}</h3>
                      <p className="text-sm">{viewingPayment.notes}</p>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Metadata */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t('common.metadata')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingPayment.createdAt && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('common.createdAt')}</p>
                        <p className="text-sm">{format(viewingPayment.createdAt, 'PPP p')}</p>
                      </div>
                    )}
                    {viewingPayment.updatedAt && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('common.updatedAt')}</p>
                        <p className="text-sm">{format(viewingPayment.updatedAt, 'PPP p')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

