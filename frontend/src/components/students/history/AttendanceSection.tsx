import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/StatsCard';
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
import type { AttendanceHistory, AttendanceStatus } from '@/types/domain/studentHistory';

interface AttendanceSectionProps {
  attendance: AttendanceHistory;
}

function getStatusIcon(status: AttendanceStatus) {
  switch (status) {
    case 'present':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'absent':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'late':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'excused':
    case 'sick':
    case 'leave':
      return <AlertCircle className="h-4 w-4 text-blue-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-600" />;
  }
}

function getStatusBadgeVariant(status: AttendanceStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'present':
      return 'default';
    case 'absent':
      return 'destructive';
    case 'late':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function AttendanceSection({ attendance }: AttendanceSectionProps) {
  const { t } = useLanguage();
  const { summary, monthlyBreakdown, recentRecords } = attendance;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{summary.attendanceRate}%</p>
              <p className="text-sm text-muted-foreground">{t('studentHistory.attendanceRate') || 'Attendance Rate'}</p>
              <Progress value={summary.attendanceRate} className="mt-2 h-2" />
            </div>
          </CardContent>
        </Card>
        
        <StatsCard
          title={t('studentHistory.present') || 'Present'}
          value={summary.presentCount}
          icon={CheckCircle}
          color="green"
        />
        
        <StatsCard
          title={t('studentHistory.absent') || 'Absent'}
          value={summary.absentCount}
          icon={XCircle}
          color="red"
        />
        
        <StatsCard
          title={t('studentHistory.late') || 'Late'}
          value={summary.lateCount}
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Monthly Breakdown */}
      {monthlyBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('studentHistory.monthlyBreakdown') || 'Monthly Breakdown'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('studentHistory.month') || 'Month'}</TableHead>
                    <TableHead className="text-right">{t('studentHistory.total') || 'Total'}</TableHead>
                    <TableHead className="text-right">{t('studentHistory.present') || 'Present'}</TableHead>
                    <TableHead className="text-right">{t('studentHistory.absent') || 'Absent'}</TableHead>
                    <TableHead className="text-right">{t('studentHistory.late') || 'Late'}</TableHead>
                    <TableHead className="text-right">{t('studentHistory.rate') || 'Rate'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyBreakdown.slice(0, 12).map((month) => (
                    <TableRow key={month.month}>
                      <TableCell className="font-medium">{month.month}</TableCell>
                      <TableCell className="text-right">{month.total}</TableCell>
                      <TableCell className="text-right text-green-600">{month.present}</TableCell>
                      <TableCell className="text-right text-red-600">{month.absent}</TableCell>
                      <TableCell className="text-right text-yellow-600">{month.late}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={month.rate >= 85 ? 'default' : month.rate >= 75 ? 'secondary' : 'destructive'}>
                          {month.rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Records */}
      {recentRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('studentHistory.recentRecords') || 'Recent Records'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('studentHistory.date') || 'Date'}</TableHead>
                    <TableHead>{t('studentHistory.status') || 'Status'}</TableHead>
                    <TableHead>{t('studentHistory.note') || 'Note'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          <Badge variant={getStatusBadgeVariant(record.status)}>
                            {record.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{record.note || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {summary.totalRecords === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('studentHistory.noAttendanceRecords') || 'No attendance records found'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

