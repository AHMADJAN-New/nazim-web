import { useEffect, useMemo, useState } from 'react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useParams, useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfiles';
import { useExams, useExamReport, useLatestExamFromCurrentYear, useMarksProgress } from '@/hooks/useExams';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, BookOpen, Layers, Award, CalendarClock, ArrowLeft, CheckCircle } from 'lucide-react';

export function ExamReports() {
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
  const { data: exams, isLoading: examsLoading } = useExams(organizationId);
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
      } else if (exams && exams.length > 0) {
        // Fallback to first exam if no current year exam
        setSelectedExamId(exams[0].id);
      }
    }
  }, [exams, latestExam, selectedExamId, examIdFromParams]);

  const { data: report, isLoading: reportLoading } = useExamReport(examId || undefined);
  const { data: marksProgress, isLoading: marksProgressLoading } = useMarksProgress(examId || undefined);

  const totals = useMemo(() => report?.totals || { classes: 0, subjects: 0, students: 0 }, [report]);

  // Create a map of examSubjectId -> progress data for quick lookup
  const subjectProgressMap = useMemo(() => {
    if (!marksProgress?.subjectProgress) return new Map();
    const map = new Map();
    marksProgress.subjectProgress.forEach((sp) => {
      map.set(sp.examSubjectId, sp);
    });
    return map;
  }, [marksProgress]);
  const scheduledSubjects = useMemo(
    () =>
      report?.classes.flatMap((examClass) => examClass.subjects.filter((s) => !!s.scheduledAt))?.length || 0,
    [report?.classes]
  );

  const topSubjects = useMemo(() => {
    if (!report?.classes) return [];
    const flat = report.classes.flatMap((examClass) => examClass.subjects.map((subject) => ({
      ...subject,
      className: examClass.className,
    })));
    return flat.slice(0, 5);
  }, [report?.classes]);

  // Get exam name for display
  const examName = useMemo(() => {
    if (!examId) return '';
    return exams?.find(e => e.id === examId)?.name || '';
  }, [examId, exams]);

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
            <h1 className="text-2xl font-bold">{t('exams.reports') || 'Exam Insights'}</h1>
            <p className="text-muted-foreground">{examName || (t('exams.reportsDescription') || 'Generate summaries, planned schedules, and grade-ready cards.')}</p>
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
                  {(exams || []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} {e.academicYear ? `(${e.academicYear.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {examId && (
            <Badge variant="outline">{exams?.find(e => e.id === examId)?.academicYear?.name || 'N/A'}</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subjects">Subjects & marks</TabsTrigger>
          <TabsTrigger value="grades">Grade cards</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Classes</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {reportLoading ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-bold">{totals.classes}</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Subjects</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {reportLoading ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-bold">{totals.subjects}</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {reportLoading ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold">{totals.students}</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {reportLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{scheduledSubjects}</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Class & Subject Enrollment</CardTitle>
              <CardDescription>Overview of assigned classes and exam subjects with student counts.</CardDescription>
            </CardHeader>
            <CardContent>
              {reportLoading && <Skeleton className="h-32 w-full" />}
              {!reportLoading && (!report || report.classes.length === 0) && (
                <p className="text-sm text-muted-foreground">Select an exam with assignments to view its report.</p>
              )}

              {!reportLoading && report && report.classes.length > 0 && (
                <div className="space-y-6">
                  {report.classes.map((examClass) => (
                    <div key={examClass.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{examClass.className}</p>
                          <p className="text-sm text-muted-foreground">{examClass.academicYearName}</p>
                        </div>
                        <Badge variant="outline">{examClass.studentCount} students</Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead className="text-right">Marks</TableHead>
                            <TableHead className="text-right">Passing</TableHead>
                            <TableHead className="text-right">Scheduled</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {examClass.subjects.map((subject) => (
                            <TableRow key={subject.id}>
                              <TableCell className="font-medium">{subject.name}</TableCell>
                              <TableCell className="text-right">{subject.totalMarks ?? '—'}</TableCell>
                              <TableCell className="text-right">{subject.passingMarks ?? '—'}</TableCell>
                              <TableCell className="text-right">
                                {subject.scheduledAt ? formatDate(subject.scheduledAt) : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <Separator />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subject lineup</CardTitle>
              <CardDescription>See which classes have marks and attendance ready to capture.</CardDescription>
            </CardHeader>
            <CardContent>
              {reportLoading && <Skeleton className="h-40 w-full" />}
              {!reportLoading && topSubjects.length === 0 && (
                <p className="text-sm text-muted-foreground">Assign subjects to exams to populate this view.</p>
              )}
              {!reportLoading && topSubjects.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Passing</TableHead>
                      <TableHead className="text-right">Schedule</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topSubjects.map((subject) => (
                      <TableRow key={`${subject.id}-${subject.className}`}>
                        <TableCell className="font-medium">{subject.name}</TableCell>
                        <TableCell>{subject.className}</TableCell>
                        <TableCell className="text-right">{subject.totalMarks ?? '—'}</TableCell>
                        <TableCell className="text-right">{subject.passingMarks ?? '—'}</TableCell>
                        <TableCell className="text-right">
                          {subject.scheduledAt ? formatDate(subject.scheduledAt) : 'Pending'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top subject schedule readiness</CardTitle>
              <CardDescription>Spot subjects that are ready for mark entry and attendance tracking.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {topSubjects.slice(0, 3).map((subject) => (
                <Card key={subject.id} className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{subject.name}</CardTitle>
                    <CardDescription>{subject.className}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">Total: {subject.totalMarks ?? '—'}</div>
                    <div className="text-sm text-muted-foreground">Passing: {subject.passingMarks ?? '—'}</div>
                    <div className="mt-2">
                      <Badge variant="outline">
                        {subject.scheduledAt ? formatDate(subject.scheduledAt) : 'Awaiting schedule'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {topSubjects.length === 0 && <p className="text-sm text-muted-foreground">No subjects to display yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Grade card drafts</CardTitle>
              <CardDescription>Preview per-class grade cards with marks entry status and completion.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(reportLoading || marksProgressLoading) && <Skeleton className="h-32 w-full" />}
              {!reportLoading && !marksProgressLoading && (!report || report.classes.length === 0) && (
                <p className="text-sm text-muted-foreground">Select an exam with assigned classes.</p>
              )}
              {!reportLoading && !marksProgressLoading && report && report.classes.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.classes.map((examClass) => {
                    // Count completed subjects for this class
                    const completedCount = examClass.subjects.filter((subject) => {
                      const progress = subjectProgressMap.get(subject.id);
                      return progress?.isComplete ?? false;
                    }).length;
                    const totalSubjects = examClass.subjects.length;

                    return (
                      <Card key={examClass.id} className="border-dashed">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{examClass.className}</CardTitle>
                          <CardDescription>
                            {examClass.studentCount} students • {completedCount}/{totalSubjects} subjects complete
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {examClass.subjects.length === 0 && (
                            <p className="text-sm text-muted-foreground">No subjects enrolled for this class.</p>
                          )}
                          {examClass.subjects.map((subject) => {
                            const progress = subjectProgressMap.get(subject.id);
                            const isComplete = progress?.isComplete ?? false;
                            const hasScheduled = !!subject.scheduledAt;
                            const hasProgress = progress !== undefined;
                            const resultsCount = progress?.resultsCount ?? 0;
                            const enrolledCount = progress?.enrolledCount ?? 0;
                            const percentage = progress?.percentage ?? 0;

                            // Determine status badge
                            let statusText = 'Awaiting schedule';
                            let statusVariant: 'default' | 'secondary' | 'outline' | 'destructive' = 'outline';
                            let statusIcon = Award;

                            if (isComplete) {
                              statusText = 'Marks complete';
                              statusVariant = 'default';
                              statusIcon = CheckCircle;
                            } else if (hasProgress && resultsCount > 0) {
                              statusText = `${percentage.toFixed(0)}% entered`;
                              statusVariant = 'secondary';
                            } else if (hasScheduled) {
                              statusText = 'Ready for marks';
                              statusVariant = 'secondary';
                            }

                            return (
                              <div key={subject.id} className="rounded-md border px-3 py-2 flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{subject.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Total {subject.totalMarks ?? '—'} • Passing {subject.passingMarks ?? '—'}
                                    {hasProgress && (
                                      <span className="ml-2">
                                        • {resultsCount}/{enrolledCount} entered
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <Badge variant={statusVariant} className="text-xs flex items-center gap-1">
                                  {statusIcon === CheckCircle ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : (
                                    <Award className="h-3 w-3" />
                                  )}
                                  {statusText}
                                </Badge>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
