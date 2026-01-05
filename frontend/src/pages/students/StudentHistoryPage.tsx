import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  History, 
  LayoutGrid, 
  FileDown, 
  FileSpreadsheet,
  User,
  Calendar,
  Phone,
  Building2,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { LoadingSpinner } from '@/components/ui/loading';
import { PageHeader } from '@/components/layout/PageHeader';
import { useLanguage } from '@/hooks/useLanguage';
import { useStudentHistory, useExportStudentHistoryPdf, useExportStudentHistoryExcel } from '@/hooks/useStudentHistory';
import { 
  HistorySummaryCards, 
  StudentHistoryTimeline, 
  StudentHistoryTabs,
  HistoryCharts,
  StudentFullDetailsSection
} from '@/components/students/history';
import { formatDate } from '@/lib/utils';

type ViewMode = 'timeline' | 'tabs' | 'charts';

export default function StudentHistoryPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<ViewMode>('tabs');

  const { data: history, isLoading, error } = useStudentHistory(studentId);
  const exportPdf = useExportStudentHistoryPdf();
  const exportExcel = useExportStudentHistoryExcel();

  const handleExportPdf = () => {
    if (studentId && !exportPdf.isPending && !exportPdf.isPolling) {
      exportPdf.mutate({ studentId });
    }
  };

  const handleExportExcel = () => {
    if (studentId) {
      exportExcel.mutate({ studentId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !history) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
            <Button variant="ghost" onClick={() => navigate('/students/history')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('common.back') || 'Back'}
            </Button>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {error?.message || t('studentHistory.loadError') || 'Failed to load student history'}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { student, summary, timeline, sections, metadata } = history;

  const getStatusBadgeVariant = (status: string | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (!status) return 'secondary';
    const lowerStatus = status.toLowerCase();
    if (['active', 'admitted'].includes(lowerStatus)) return 'default';
    if (['pending'].includes(lowerStatus)) return 'secondary';
    if (['withdrawn', 'suspended', 'inactive'].includes(lowerStatus)) return 'destructive';
    return 'outline';
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => navigate('/students/history')} className="gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.backToStudents') || 'Back to History'}</span>
            <span className="sm:hidden">{t('common.back') || 'Back'}</span>
          </Button>

      {/* Page Header */}
      <PageHeader
        title={t('studentHistory.lifetimeHistory') || 'Student Lifetime History'}
        description={t('studentHistory.description') || 'Complete academic and administrative history'}
        icon={<History className="h-5 w-5" />}
      />

      {/* Student Header Card */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            {/* Avatar */}
            <Avatar className="h-20 w-20 md:h-24 md:w-24 mx-auto md:mx-0">
              <AvatarImage src={student.picturePath || undefined} alt={student.fullName} />
              <AvatarFallback className="text-2xl">
                {student.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Student Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2">
                <h2 className="text-xl md:text-2xl font-bold">{student.fullName}</h2>
                <Badge variant={getStatusBadgeVariant(student.currentEnrollmentStatus || student.status)}>
                  {student.currentEnrollmentStatus || student.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('studentHistory.admissionNo') || 'Admission #'}:</span>
                  <span className="font-medium">{student.admissionNumber}</span>
                </div>
                
                {student.currentClass && (
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('studentHistory.class') || 'Class'}:</span>
                    <span className="font-medium">
                      {student.currentClass.name}
                      {student.currentClass.section && ` (${student.currentClass.section})`}
                    </span>
                  </div>
                )}
                
                {student.dateOfBirth && (
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('studentHistory.dob') || 'DOB'}:</span>
                    <span className="font-medium">{formatDate(student.dateOfBirth)}</span>
                  </div>
                )}
                
                {student.phone && (
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('studentHistory.phone') || 'Phone'}:</span>
                    <span className="font-medium">{student.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex flex-row md:flex-col gap-2 justify-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportPdf}
                      disabled={exportPdf.isPending || exportPdf.isPolling}
                      className="gap-2"
                    >
                      <FileDown className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {exportPdf.isPolling 
                          ? (t('common.generating') || 'Generating...') 
                          : (t('common.exportPdf') || 'Export PDF')}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="sm:hidden">
                    <p>{t('common.exportPdf') || 'Export PDF'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportExcel}
                      disabled={exportExcel.isPending}
                      className="gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('common.exportExcel') || 'Export Excel'}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="sm:hidden">
                    <p>{t('common.exportExcel') || 'Export Excel'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full Student Details - Expandable Section */}
      <StudentFullDetailsSection student={student} />

      {/* Summary Cards */}
      <HistorySummaryCards summary={summary} />

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t('studentHistory.generatedAt') || 'Generated at'}: {formatDate(metadata.generatedAt)}
          <span className="ml-2">
            ({metadata.totalRecords} {t('studentHistory.records') || 'records'})
          </span>
        </div>
        
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="tabs" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">{t('studentHistory.sections') || 'Sections'}</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">{t('studentHistory.timeline') || 'Timeline'}</span>
            </TabsTrigger>
            <TabsTrigger value="charts" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('studentHistory.charts') || 'Charts'}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'tabs' && (
        <StudentHistoryTabs sections={sections} />
      )}

      {viewMode === 'timeline' && (
        <StudentHistoryTimeline events={timeline} />
      )}

      {viewMode === 'charts' && (
        <HistoryCharts 
          attendance={sections.attendance}
          exams={sections.exams}
          fees={sections.fees}
        />
      )}
    </div>
  );
}

