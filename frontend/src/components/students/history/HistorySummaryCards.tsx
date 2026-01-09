import { 
  Calendar, 
  GraduationCap, 
  CheckCircle, 
  TrendingUp, 
  DollarSign, 
  BookOpen 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import type { HistorySummary, CurrentClass } from '@/types/domain/studentHistory';

interface HistorySummaryCardsProps {
  summary: HistorySummary;
}

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  colorClass: string;
}

function SummaryCard({ title, value, subtitle, icon, colorClass }: SummaryCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-24 h-24 ${colorClass} rounded-full -mr-8 -mt-8 pointer-events-none opacity-20`} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
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
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <SummaryCard
        title={t('studentHistory.totalAcademicYears') || 'Academic Years'}
        value={summary.totalAcademicYears}
        subtitle={t('studentHistory.yearsEnrolled') || 'Years enrolled'}
        icon={<Calendar className="h-5 w-5 text-blue-600" />}
        colorClass="bg-blue-500"
      />
      
      <SummaryCard
        title={t('studentHistory.currentClass') || 'Current Class'}
        value={formatCurrentClass(summary.currentClass)}
        subtitle={summary.currentClass?.academicYear || '-'}
        icon={<GraduationCap className="h-5 w-5 text-purple-600" />}
        colorClass="bg-purple-500"
      />
      
      <SummaryCard
        title={t('studentHistory.attendanceRate') || 'Attendance Rate'}
        value={`${summary.attendanceRate}%`}
        subtitle={attendanceStatus.label}
        icon={<CheckCircle className={`h-5 w-5 ${attendanceStatus.color}`} />}
        colorClass={summary.attendanceRate >= 85 ? 'bg-green-500' : summary.attendanceRate >= 75 ? 'bg-yellow-500' : 'bg-red-500'}
      />
      
      <SummaryCard
        title={t('studentHistory.averageScore') || 'Average Score'}
        value={`${summary.averageExamScore}%`}
        subtitle={`${summary.totalExams} ${t('studentHistory.exams') || 'exams'}`}
        icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
        colorClass="bg-emerald-500"
      />
      
      <SummaryCard
        title={t('studentHistory.outstandingFees') || 'Outstanding Fees'}
        value={summary.outstandingFees > 0 ? summary.outstandingFees.toLocaleString() : '0'}
        subtitle={summary.outstandingFees > 0 ? (t('studentHistory.pending') || 'Pending') : (t('studentHistory.cleared') || 'Cleared')}
        icon={<DollarSign className={`h-5 w-5 ${summary.outstandingFees > 0 ? 'text-orange-600' : 'text-green-600'}`} />}
        colorClass={summary.outstandingFees > 0 ? 'bg-orange-500' : 'bg-green-500'}
      />
      
      <SummaryCard
        title={t('studentHistory.libraryBooks') || 'Library Books'}
        value={summary.currentLibraryBooks}
        subtitle={`${summary.totalLibraryLoans} ${t('studentHistory.totalLoans') || 'total loans'}`}
        icon={<BookOpen className="h-5 w-5 text-cyan-600" />}
        colorClass="bg-cyan-500"
      />
    </div>
  );
}

