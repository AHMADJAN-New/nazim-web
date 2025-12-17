import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FeePaymentForm } from '@/components/fees/FeePaymentForm';
import { useCreateFeePayment, useFeeAssignments, useFeePayments, useFeeStructures } from '@/hooks/useFees';
import { useFinanceAccounts } from '@/hooks/useFinance';
import { useLanguage } from '@/hooks/useLanguage';
import type { FeePaymentFormData } from '@/lib/validations/fees';
import { format } from 'date-fns';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect } from 'react';

export default function FeePaymentsPage() {
  const { t } = useLanguage();
  const [filterAcademicYear, setFilterAcademicYear] = useState<string | undefined>(undefined);
  const [filterClassAy, setFilterClassAy] = useState<string | undefined>(undefined);

  const { data: academicYears = [] } = useAcademicYears();
  const { data: classAcademicYears = [] } = useClassAcademicYears(filterAcademicYear);
  const { data: assignments = [] } = useFeeAssignments({
    academicYearId: filterAcademicYear,
    classAcademicYearId: filterClassAy,
  });
  const { data: structures = [] } = useFeeStructures({
    academicYearId: filterAcademicYear,
    classAcademicYearId: filterClassAy,
  });
  const { data: payments = [], isLoading } = useFeePayments();
  const { data: accounts = [] } = useFinanceAccounts();
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

  const filteredPayments = useMemo(() => {
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
        return {
          value: assignment.id,
          label: `${structureName} - ${className ?? t('common.notAvailable')}`,
          studentId: assignment.studentId,
          studentAdmissionId: assignment.studentAdmissionId,
        };
      }),
    [assignments, classAyById, structuresById, t],
  );

  useEffect(() => {
    if (!filterAcademicYear && academicYears.length > 0) {
      const firstAy = academicYears[0];
      setFilterAcademicYear(firstAy.id);
    }
  }, [academicYears, filterAcademicYear]);

  const handleSubmit = async (values: FeePaymentFormData) => {
    await createPayment.mutateAsync(values);
    setOpen(false);
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>{t('fees.recordPayment')}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('fees.recordPayment')}</DialogTitle>
              <DialogDescription className="sr-only">{t('fees.recordPayment')}</DialogDescription>
            </DialogHeader>
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
            <Select value={filterClassAy || ''} onValueChange={(val) => setFilterClassAy(val || undefined)}>
              <SelectTrigger>
                <SelectValue placeholder={t('fees.selectClass')} />
              </SelectTrigger>
              <SelectContent>
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
                  return (
                    <TableRow key={payment.id}>
                      <TableCell>{className ?? t('common.notAvailable')}</TableCell>
                      <TableCell>{structureName}</TableCell>
                      <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell>{payment.amount.toFixed(2)}</TableCell>
                      <TableCell className="capitalize">{payment.paymentMethod}</TableCell>
                      <TableCell>{payment.referenceNo || '-'}</TableCell>
                      <TableCell>{payment.accountId}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

