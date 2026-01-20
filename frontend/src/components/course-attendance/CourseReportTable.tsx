import React from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import type { CourseReportItem } from '@/hooks/useCourseAttendance';
import { useLanguage } from '@/hooks/useLanguage';

interface CourseReportTableProps {
  data: CourseReportItem[];
  isLoading?: boolean;
  completionStatus?: 'enrolled' | 'completed' | 'dropped' | 'failed' | 'all';
  onStatusChange?: (status: 'enrolled' | 'completed' | 'dropped' | 'failed' | 'all') => void;
}

export function CourseReportTable({
  data,
  isLoading,
  completionStatus = 'all',
  onStatusChange,
}: CourseReportTableProps) {
  const { t } = useLanguage();

  const getCompletionStatusBadge = (status: CourseReportItem['completion_status']) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      enrolled: {
        label: t('courses.enrolled') || 'Enrolled',
        className: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400',
      },
      completed: {
        label: t('courses.completed') || 'Completed',
        className: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400',
      },
      dropped: {
        label: t('courses.dropped') || 'Dropped',
        className: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400',
      },
      failed: {
        label: t('courses.failed') || 'Failed',
        className: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400',
      },
    };

    const statusInfo = statusMap[status] || statusMap.enrolled;
    return (
      <Badge variant="outline" className={`${statusInfo.className} font-medium`}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 dark:text-green-400';
    if (rate >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{t('courses.attendance.noStudentsFound') || 'No students found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onStatusChange && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium whitespace-nowrap">
            {t('courses.attendance.filterByStatus') || 'Filter by Status:'}
          </label>
          <Select
            value={completionStatus}
            onValueChange={(value) => onStatusChange(value as typeof completionStatus)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('courses.attendance.allStatuses') || 'All Statuses'}</SelectItem>
              <SelectItem value="enrolled">{t('courses.enrolled') || 'Enrolled'}</SelectItem>
              <SelectItem value="completed">{t('courses.completed') || 'Completed'}</SelectItem>
              <SelectItem value="dropped">{t('courses.dropped') || 'Dropped'}</SelectItem>
              <SelectItem value="failed">{t('courses.failed') || 'Failed'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('courses.attendance.student')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('courses.attendance.cardNumber')}</TableHead>
              <TableHead className="hidden lg:table-cell">{t('common.status') || 'Status'}</TableHead>
              <TableHead className="text-center">{t('courses.attendance.totalSessions') || 'Total'}</TableHead>
              <TableHead className="text-center hidden lg:table-cell">{t('courses.attendance.present')}</TableHead>
              <TableHead className="text-center hidden lg:table-cell">{t('courses.attendance.late')}</TableHead>
              <TableHead className="text-center hidden lg:table-cell">{t('courses.attendance.absent')}</TableHead>
              <TableHead className="text-center">{t('courses.attendance.attendanceRate') || 'Rate %'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.course_student_id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.student_name}</p>
                    {item.father_name && (
                      <p className="text-sm text-muted-foreground hidden md:block">{item.father_name}</p>
                    )}
                    <p className="text-sm text-muted-foreground md:hidden">
                      {item.card_number || item.admission_no || '-'}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {item.card_number || item.admission_no || '-'}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {getCompletionStatusBadge(item.completion_status)}
                </TableCell>
                <TableCell className="text-center">
                  {item.total_sessions}
                </TableCell>
                <TableCell className="text-center hidden lg:table-cell">
                  {item.present}
                </TableCell>
                <TableCell className="text-center hidden lg:table-cell">
                  {item.late}
                </TableCell>
                <TableCell className="text-center hidden lg:table-cell">
                  {item.absent}
                </TableCell>
                <TableCell className="text-center">
                  <span className={`font-semibold ${getAttendanceRateColor(item.attendance_rate)}`}>
                    {item.attendance_rate.toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

