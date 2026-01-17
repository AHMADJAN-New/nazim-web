import { 
  Calendar, 
  GraduationCap, 
  CheckCircle, 
  TrendingUp, 
  DollarSign, 
  BookOpen 
} from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { useLanguage } from '@/hooks/useLanguage';
import type { HistorySummary, CurrentClass } from '@/types/domain/studentHistory';

interface HistorySummaryCardsProps {
  summary: HistorySummary;
}

function formatCurrentClass(currentClass: CurrentClass | null): string {
  if (!currentClass) return '-';
  const parts = [currentClass.name];
  if (currentClass.section) parts.push(`(${currentClass.section})`);
  return parts.join(' ');
}

function getAttendanceStatus(rate: number): { label: string; color: string } {
  if (rate >= 95) return { label: 'Excellent', color: 'text-green-600' };
  if (rate >= 85) return { label: 'Good', color: 'text-blue-600' };
  if (rate >= 75) return { label: 'Fair', color: 'text-yellow-600' };
  return { label: 'Poor', color: 'text-red-600' };
}

export function HistorySummaryCards({ summary }: HistorySummaryCardsProps) {
  const { t, isRTL } = useLanguage();
  const attendanceStatus = getAttendanceStatus(summary.attendanceRate);

  return (
    <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatsCard
        title={t('studentHistory.totalAcademicYears') || 'Academic Years'}
        value={summary.totalAcademicYears}
        icon={Calendar}
        description={t('studentHistory.yearsEnrolled') || 'Years enrolled'}
        color="blue"
      />
      
      <StatsCard
        title={t('studentHistory.currentClass') || 'Current Class'}
        value={formatCurrentClass(summary.currentClass)}
        icon={GraduationCap}
        description={summary.currentClass?.academicYear || '-'}
        color="purple"
      />
      
      <StatsCard
        title={t('studentHistory.attendanceRate') || 'Attendance Rate'}
        value={`${summary.attendanceRate}%`}
        icon={CheckCircle}
        description={attendanceStatus.label}
        color={summary.attendanceRate >= 85 ? 'green' : summary.attendanceRate >= 75 ? 'yellow' : 'red'}
      />
      
      <StatsCard
        title={t('studentHistory.averageScore') || 'Average Score'}
        value={`${summary.averageExamScore}%`}
        icon={TrendingUp}
        description={`${summary.totalExams} ${t('studentHistory.exams') || 'exams'}`}
        color="emerald"
      />
      
      <StatsCard
        title={t('studentHistory.outstandingFees') || 'Outstanding Fees'}
        value={summary.outstandingFees > 0 ? summary.outstandingFees.toLocaleString() : '0'}
        icon={DollarSign}
        description={summary.outstandingFees > 0 ? (t('studentHistory.pending') || 'Pending') : (t('studentHistory.cleared') || 'Cleared')}
        color={summary.outstandingFees > 0 ? 'orange' : 'green'}
      />
      
      <StatsCard
        title={t('studentHistory.libraryBooks') || 'Library Books'}
        value={summary.currentLibraryBooks}
        icon={BookOpen}
        description={`${summary.totalLibraryLoans} ${t('studentHistory.totalLoans') || 'total loans'}`}
        color="cyan"
      />
    </div>
  );
}

