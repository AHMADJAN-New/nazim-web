import { DollarSign, CreditCard, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';
import type { FeeHistory, FeeStatus } from '@/types/domain/studentHistory';

interface FeesSectionProps {
  fees: FeeHistory;
}

function getStatusBadgeVariant(status: FeeStatus | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!status) return 'secondary';
  switch (status) {
    case 'paid':
      return 'default';
    case 'partial':
      return 'secondary';
    case 'overdue':
      return 'destructive';
    case 'pending':
    case 'cancelled':
    default:
      return 'outline';
  }
}

function getStatusIcon(status: FeeStatus | null) {
  switch (status) {
    case 'paid':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'partial':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'overdue':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600" />;
  }
}

export function FeesSection({ fees }: FeesSectionProps) {
  const { t } = useLanguage();
  const { summary, assignments, payments } = fees;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{summary.totalAssigned.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.totalAssigned') || 'Total Assigned'}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{summary.totalPaid.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.totalPaid') || 'Total Paid'}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-2xl font-bold ${summary.totalRemaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {summary.totalRemaining.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.outstanding') || 'Outstanding'}</p>
              </div>
              <AlertCircle className={`h-8 w-8 ${summary.totalRemaining > 0 ? 'text-orange-200' : 'text-green-200'}`} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">{summary.totalDiscount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.totalDiscount') || 'Total Discount'}</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Progress */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('studentHistory.paymentProgress') || 'Payment Progress'}</span>
              <span className="font-medium">{summary.paymentProgress}%</span>
            </div>
            <Progress value={summary.paymentProgress} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('studentHistory.paid') || 'Paid'}: {summary.totalPaid.toLocaleString()}</span>
              <span>{t('studentHistory.remaining') || 'Remaining'}: {summary.totalRemaining.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee Assignments */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('studentHistory.feeAssignments') || 'Fee Assignments'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('studentHistory.feeStructure') || 'Fee Structure'}</TableHead>
                    <TableHead>{t('studentHistory.academicYear') || 'Academic Year'}</TableHead>
                    <TableHead className="text-right">{t('studentHistory.assigned') || 'Assigned'}</TableHead>
                    <TableHead className="text-right">{t('studentHistory.paid') || 'Paid'}</TableHead>
                    <TableHead className="text-right">{t('studentHistory.remaining') || 'Remaining'}</TableHead>
                    <TableHead>{t('studentHistory.dueDate') || 'Due Date'}</TableHead>
                    <TableHead>{t('studentHistory.status') || 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.feeStructure?.name || '-'}
                      </TableCell>
                      <TableCell>{assignment.academicYear?.name || '-'}</TableCell>
                      <TableCell className="text-right">{assignment.assignedAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-600">{assignment.paidAmount.toLocaleString()}</TableCell>
                      <TableCell className={`text-right ${assignment.remainingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {assignment.remainingAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>{assignment.dueDate ? formatDate(assignment.dueDate) : '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(assignment.status)}
                          <Badge variant={getStatusBadgeVariant(assignment.status)}>
                            {assignment.status || 'pending'}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('studentHistory.paymentHistory') || 'Payment History'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('studentHistory.date') || 'Date'}</TableHead>
                    <TableHead>{t('studentHistory.feeType') || 'Fee Type'}</TableHead>
                    <TableHead className="text-right">{t('studentHistory.amount') || 'Amount'}</TableHead>
                    <TableHead>{t('studentHistory.method') || 'Method'}</TableHead>
                    <TableHead>{t('studentHistory.reference') || 'Reference'}</TableHead>
                    <TableHead>{t('studentHistory.receivedBy') || 'Received By'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.paymentDate ? formatDate(payment.paymentDate) : '-'}</TableCell>
                      <TableCell className="font-medium">{payment.feeStructureName || '-'}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {payment.amount.toLocaleString()} {payment.currency || ''}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.paymentMethod || '-'}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{payment.referenceNo || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{payment.receivedBy || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {assignments.length === 0 && payments.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('studentHistory.noFeeRecords') || 'No fee records found'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

