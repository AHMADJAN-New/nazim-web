import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useExam,
  useExams,
  useExamClasses,
  useExamSummaryReport,
  useExamClassReport,
  useExamStudentReport,
  useEnrollmentStats,
  useMarksProgress,
  useLatestExamFromCurrentYear,
} from '@/hooks/useExams';
import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, BarChart3, Users, CheckCircle, XCircle,
  GraduationCap, Search, FileText, BookOpen, AlertCircle
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export function ExamReportsPage() {
  const { t, isRTL } = useLanguage();
  const { examId: examIdFromParams } = useParams<{ examId?: string }>();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  // State for exam selection (when accessed individually)
  const [selectedExamId, setSelectedExamId] = useState<string | undefined>(undefined);

  // Determine which exam ID to use: from params (when accessed from exam page) or selected (when accessed individually)
  const examId = examIdFromParams || selectedExamId || undefined;

  // Fetch all exams for selector (only when accessed individually)
  const { data: allExams, isLoading: examsLoading } = useExams(organizationId);
  const latestExam = useLatestExamFromCurrentYear(organizationId);


  // Set exam from URL params (when accessed from exams page)
  useEffect(() => {
    if (examIdFromParams) {
      // Clear selectedExamId when URL has examId (use URL examId instead)
      setSelectedExamId(undefined);
    }
  }, [examIdFromParams]);

  // Auto-select latest exam from current academic year (only when accessed individually, no URL examId)
  useEffect(() => {
    if (!examIdFromParams && !selectedExamId) {
      if (latestExam) {
        setSelectedExamId(latestExam.id);
      } else if (allExams && allExams.length > 0) {
        // Fallback to first exam if no current year exam
        setSelectedExamId(allExams[0].id);
      }
    }
  }, [allExams, latestExam, selectedExamId, examIdFromParams]);

  // Data hooks
  const { data: exam, isLoading: examLoading } = useExam(examId || undefined);
  const { data: examClasses } = useExamClasses(examId || undefined);
  const { data: summaryReport, isLoading: summaryLoading, error: summaryError } = useExamSummaryReport(examId || undefined);
  const { data: enrollmentStats } = useEnrollmentStats(examId || undefined);
  const { data: marksProgress } = useMarksProgress(examId || undefined);
  const { data: studentAdmissions } = useStudentAdmissions(organizationId);

  // Permissions
  const hasViewReports = useHasPermission('exams.view_reports');

  // Removed unused state for class report and student report

  const isLoading = (examIdFromParams ? examLoading : examsLoading) || summaryLoading;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  // Not found state
  if (!exam) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">{t('exams.notFound') || 'Exam not found'}</h2>
        <Button variant="outline" onClick={() => navigate('/exams')} className="mt-4">
          <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {t('exams.backToList') || 'Back to Exams'}
        </Button>
      </div>
    );
  }

  if (!hasViewReports) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">{t('common.noPermission') || 'You do not have permission to view reports'}</h2>
        <Button variant="outline" onClick={() => navigate('/exams')} className="mt-4">
          <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {t('exams.backToList') || 'Back to Exams'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {examIdFromParams && (
            <Button variant="outline" size="sm" onClick={() => navigate('/exams')}>
              <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">{t('exams.reports') || 'Exam Reports'}</h1>
            <p className="text-muted-foreground">{exam.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!examIdFromParams && (
            <div className="w-64">
              <Select
                value={selectedExamId || undefined}
                onValueChange={(value) => setSelectedExamId(value === 'all' ? undefined : value)}
                disabled={examsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('exams.selectExam') || 'Select exam'} />
                </SelectTrigger>
                <SelectContent>
                  {(allExams || []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} {e.academicYear ? `(${e.academicYear.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Badge variant="outline">{exam.academicYear?.name || 'N/A'}</Badge>
        </div>
      </div>

      {/* Summary Cards */}
      {summaryError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{t('exams.reports.errorLoading') || 'Error loading summary report. Please try again.'}</p>
            </div>
          </CardContent>
        </Card>
      )}
      {summaryLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('exams.totalClasses') || 'Total Classes'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{summaryReport?.totals?.classes ?? 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('exams.totalSubjects') || 'Total Subjects'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{summaryReport?.totals?.subjects ?? 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('exams.enrolledStudents') || 'Enrolled Students'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{summaryReport?.totals?.enrolledStudents ?? 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('exams.resultsEntered') || 'Results Entered'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{summaryReport?.totals?.resultsEntered ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="enrollment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="enrollment" className="gap-2">
            <Users className="h-4 w-4" />
            {t('exams.enrollmentStatus') || 'Enrollment Status'}
          </TabsTrigger>
          <TabsTrigger value="marksProgress" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('exams.marksEntryProgress') || 'Marks Entry Progress'}
          </TabsTrigger>
        </TabsList>

        {/* Enrollment Status Tab */}
        <TabsContent value="enrollment" className="space-y-4">
          {!enrollmentStats ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <Skeleton className="h-64 w-full" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t('exams.enrollmentStatus') || 'Enrollment Status'}</CardTitle>
                <CardDescription>
                  {t('exams.enrollmentStatusDescription') || 'Student enrollment by class'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{t('exams.overallEnrollment') || 'Overall Enrollment'}</span>
                    <span className="font-medium">{enrollmentStats.totalEnrolled} / {enrollmentStats.totalAvailable}</span>
                  </div>
                  <Progress value={enrollmentStats.overallPercentage} />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('exams.class') || 'Class'}</TableHead>
                      <TableHead className="text-right">{t('exams.enrolled') || 'Enrolled'}</TableHead>
                      <TableHead className="text-right">{t('exams.available') || 'Available'}</TableHead>
                      <TableHead className="text-right">{t('exams.percentage') || 'Percentage'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollmentStats.classStats && enrollmentStats.classStats.length > 0 ? (
                      enrollmentStats.classStats.map((cs) => (
                        <TableRow key={cs.examClassId}>
                          <TableCell className="font-medium">
                            {cs.className}{cs.sectionName ? ` - ${cs.sectionName}` : ''}
                          </TableCell>
                          <TableCell className="text-right">{cs.enrolledCount}</TableCell>
                          <TableCell className="text-right">{cs.availableCount}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={cs.enrollmentPercentage === 100 ? 'default' : 'secondary'}>
                              {cs.enrollmentPercentage.toFixed(0)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          {t('exams.noEnrollmentData') || 'No enrollment data available'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Marks Entry Progress Tab */}
        <TabsContent value="marksProgress" className="space-y-4">
          {!marksProgress ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <Skeleton className="h-64 w-full" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t('exams.marksEntryProgress') || 'Marks Entry Progress'}</CardTitle>
                <CardDescription>
                  {t('exams.marksEntryProgressDescription') || 'Progress of marks entry by subject'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{t('exams.overallProgress') || 'Overall Progress'}</span>
                    <span className="font-medium">{marksProgress.totalEntered} / {marksProgress.totalExpected}</span>
                  </div>
                  <Progress value={marksProgress.overallPercentage} />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('exams.subject') || 'Subject'}</TableHead>
                      <TableHead>{t('exams.class') || 'Class'}</TableHead>
                      <TableHead className="text-right">{t('exams.entered') || 'Entered'}</TableHead>
                      <TableHead className="text-right">{t('exams.total') || 'Total'}</TableHead>
                      <TableHead className="text-right">{t('exams.status') || 'Status'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marksProgress.subjectProgress && marksProgress.subjectProgress.length > 0 ? (
                      marksProgress.subjectProgress.map((sp) => (
                        <TableRow key={sp.examSubjectId}>
                          <TableCell className="font-medium">{sp.subjectName}</TableCell>
                          <TableCell>{sp.className}</TableCell>
                          <TableCell className="text-right">{sp.resultsCount}</TableCell>
                          <TableCell className="text-right">{sp.enrolledCount}</TableCell>
                          <TableCell className="text-right">
                            {sp.isComplete ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                {t('exams.complete') || 'Complete'}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                {sp.percentage.toFixed(0)}%
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {t('exams.noMarksData') || 'No marks entry data available'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
