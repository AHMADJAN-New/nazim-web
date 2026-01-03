import { format } from 'date-fns';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/useLanguage';
import type { FeeAssignment } from '@/types/domain/fees';

interface FeeAssignmentTableProps {
  assignments: FeeAssignment[];
}

export function FeeAssignmentTable({ assignments }: FeeAssignmentTableProps) {
  const { t } = useLanguage();

  const formatDate = (value: Date | null) => (value ? format(value, 'yyyy-MM-dd') : t('common.notAvailable'));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('fees.structure')}</TableHead>
          <TableHead>{t('fees.amountAssigned')}</TableHead>
          <TableHead>{t('fees.paid')}</TableHead>
          <TableHead>{t('fees.remaining')}</TableHead>
          <TableHead>{t('fees.status')}</TableHead>
          <TableHead>{t('fees.dueDate')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((assignment) => (
          <TableRow key={assignment.id}>
            <TableCell>{assignment.feeStructureId}</TableCell>
            <TableCell>{assignment.assignedAmount.toFixed(2)}</TableCell>
            <TableCell>{assignment.paidAmount.toFixed(2)}</TableCell>
            <TableCell>{assignment.remainingAmount.toFixed(2)}</TableCell>
            <TableCell className="capitalize">{assignment.status}</TableCell>
            <TableCell>{formatDate(assignment.dueDate)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

