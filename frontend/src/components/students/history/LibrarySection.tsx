import { BookOpen, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import type { LibraryHistory, LibraryLoanStatus } from '@/types/domain/studentHistory';

interface LibrarySectionProps {
  library: LibraryHistory;
}

function getStatusBadgeVariant(status: LibraryLoanStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'returned':
      return 'default';
    case 'active':
      return 'secondary';
    case 'overdue':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getStatusIcon(status: LibraryLoanStatus) {
  switch (status) {
    case 'returned':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'active':
      return <Clock className="h-4 w-4 text-blue-600" />;
    case 'overdue':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600" />;
  }
}

export function LibrarySection({ library }: LibrarySectionProps) {
  const { t } = useLanguage();
  const { summary, loans } = library;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{summary.totalLoans}</p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.totalLoans') || 'Total Loans'}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{summary.returnedLoans}</p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.returned') || 'Returned'}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{summary.currentLoans}</p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.currentlyBorrowed') || 'Currently Borrowed'}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-2xl font-bold ${summary.overdueLoans > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {summary.overdueLoans}
                </p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.overdue') || 'Overdue'}</p>
              </div>
              <AlertCircle className={`h-8 w-8 ${summary.overdueLoans > 0 ? 'text-red-200' : 'text-green-200'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Return Rate */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-medium">{t('studentHistory.returnRate') || 'Return Rate'}</p>
              <p className="text-sm text-muted-foreground">
                {summary.returnedLoans} {t('studentHistory.of') || 'of'} {summary.totalLoans} {t('studentHistory.booksReturned') || 'books returned'}
              </p>
            </div>
            <Badge variant={summary.returnRate >= 90 ? 'default' : summary.returnRate >= 70 ? 'secondary' : 'destructive'}>
              {summary.returnRate}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Loan History */}
      {loans.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('studentHistory.loanHistory') || 'Loan History'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('studentHistory.book') || 'Book'}</TableHead>
                    <TableHead>{t('studentHistory.author') || 'Author'}</TableHead>
                    <TableHead>{t('studentHistory.loanDate') || 'Loan Date'}</TableHead>
                    <TableHead>{t('studentHistory.dueDate') || 'Due Date'}</TableHead>
                    <TableHead>{t('studentHistory.returnDate') || 'Return Date'}</TableHead>
                    <TableHead>{t('studentHistory.status') || 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{loan.book?.title || '-'}</p>
                          {loan.book?.isbn && (
                            <p className="text-xs text-muted-foreground">ISBN: {loan.book.isbn}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{loan.book?.author || '-'}</TableCell>
                      <TableCell>{loan.loanDate ? formatDate(loan.loanDate) : '-'}</TableCell>
                      <TableCell>{loan.dueDate ? formatDate(loan.dueDate) : '-'}</TableCell>
                      <TableCell>
                        {loan.returnedAt ? formatDate(loan.returnedAt) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(loan.status)}
                          <Badge variant={getStatusBadgeVariant(loan.status)}>
                            {loan.status}
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
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('studentHistory.noLibraryRecords') || 'No library records found'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

