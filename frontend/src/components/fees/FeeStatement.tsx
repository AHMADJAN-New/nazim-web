import { format } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/useLanguage';
import type { FeeAssignment, FeePayment } from '@/types/domain/fees';

interface FeeStatementProps {
  assignments: FeeAssignment[];
  payments: FeePayment[];
  structureNames?: Record<string, string>;
}

const formatDate = (value: Date | null, fallback: string) =>
  value ? format(value, 'yyyy-MM-dd') : fallback;

export function FeeStatement({ assignments, payments, structureNames }: FeeStatementProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('fees.assignments')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('fees.structure')}</TableHead>
                <TableHead>{t('fees.amountAssigned')}</TableHead>
                <TableHead>{t('fees.paid')}</TableHead>
                <TableHead>{t('fees.remaining')}</TableHead>
                <TableHead>{t('events.status')}</TableHead>
                <TableHead>{t('fees.dueDate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>{structureNames?.[assignment.feeStructureId] ?? assignment.feeStructureId}</TableCell>
                  <TableCell>{assignment.assignedAmount.toFixed(2)}</TableCell>
                  <TableCell>{assignment.paidAmount.toFixed(2)}</TableCell>
                  <TableCell>{assignment.remainingAmount.toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{assignment.status}</TableCell>
                  <TableCell>{formatDate(assignment.dueDate, t('events.notAvailable'))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('fees.payments')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('fees.paymentDate')}</TableHead>
                <TableHead>{t('fees.amount')}</TableHead>
                <TableHead>{t('fees.method')}</TableHead>
                <TableHead>{t('fees.reference')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(payment.paymentDate, t('events.notAvailable'))}</TableCell>
                  <TableCell>{payment.amount.toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{payment.paymentMethod}</TableCell>
                  <TableCell>{payment.referenceNo || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

