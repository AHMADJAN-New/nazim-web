import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Heart,
  Calendar,
} from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import type { SessionReportItem } from '@/hooks/useCourseAttendance';
import { useLanguage } from '@/hooks/useLanguage';

interface SessionReportTableProps {
  data: SessionReportItem[];
  isLoading?: boolean;
}

export function SessionReportTable({ data, isLoading }: SessionReportTableProps) {
  const { t } = useLanguage();

  const attendanceOptions = [
    { value: 'present', label: t('courses.attendance.present'), icon: CheckCircle2, color: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400' },
    { value: 'absent', label: t('courses.attendance.absent'), icon: XCircle, color: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400' },
    { value: 'late', label: t('courses.attendance.late'), icon: Clock, color: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-400' },
    { value: 'excused', label: t('courses.attendance.excused'), icon: AlertCircle, color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400' },
    { value: 'sick', label: t('courses.attendance.sick'), icon: Heart, color: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-400' },
    { value: 'leave', label: t('courses.attendance.leave'), icon: Calendar, color: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400' },
  ];

  const getStatusBadge = (status: SessionReportItem['status']) => {
    const option = attendanceOptions.find(opt => opt.value === status);
    if (!option) return <Badge variant="outline">{status}</Badge>;
    const Icon = option.icon;
    return (
      <Badge variant="outline" className={`${option.color} flex items-center gap-1.5 font-medium w-fit`}>
        <Icon className="h-3.5 w-3.5" />
        {option.label}
      </Badge>
    );
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
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('courses.attendance.student')}</TableHead>
            <TableHead>{t('courses.attendance.cardNumber')}</TableHead>
            <TableHead>{t('courses.attendance.status')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('courses.attendance.note') || 'Note'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.course_student_id}>
              <TableCell>
                <div>
                  <p className="font-medium">{item.student_name}</p>
                  {item.father_name && (
                    <p className="text-sm text-muted-foreground">{item.father_name}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {item.card_number || item.admission_no || '-'}
              </TableCell>
              <TableCell>
                {getStatusBadge(item.status)}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {item.note || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

