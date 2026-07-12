import { Users, BookOpen, Layers, Award, CalendarClock, ArrowLeft, CheckCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExams, useExamReport, useLatestExamFromCurrentYear, useMarksProgress } from '@/hooks/useExams';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { formatDate } from '@/lib/utils';

export function ExamReports() {
  const { t, isRTL } = useLanguage();
  const { examId: examIdFromParams } = useParams<{ examId?: string }>();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  const [selectedExamId, setSelectedExamId] = useState<string | undefined>(undefined);
  const examId = examIdFromParams || selectedExamId || undefined;

  const { data: exams, isLoading: examsLoading } = useExams(organizationId);
  const latestExam = useLatestExamFromCurrentYear(organizationId);

  useEffect(() => {
    if (examIdFromParams) {
      setSelectedExamId(undefined);
    }
  }, [examIdFromParams]);

  useEffect(() => {
    if (!examIdFromParams && !selectedExamId) {
      if (latestExam) {
        setSelectedExamId(latestExam.id);
      } else if (exams && exams.length > 0) {
        setSelectedExamId(exams[0].id);
      }
    }
  }, [exams, latestExam, selectedExamId, examIdFromParams]);

  const { data: report, isLoading: reportLoading } = useExamReport(examId || undefined);
  const { data: marksProgress, isLoading: marksProgressLoading } = useMarksProgress(examId || undefined);

  const totals = useMemo(() => report?.totals || { classes: 0, subjects: 0, students: 0 }, [report]);

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

  const examName = useMemo(() => {
    if (!examId) return '';
    return exams?.find(e => e.id === examId)?.name || '';
  }, [examId, exams]);

  const getSubjectStatus = (
    isComplete: boolean,
    hasProgress: boolean,
    resultsCount: number,
    hasScheduled: boolean,
    percentage: number
  ) => {
    if (isComplete) {
      return { text: t('examReports.marksComplete'), variant: 'default' as const, icon: CheckCircle };
    }
    if (hasProgress && resultsCount > 0) {
      return {
        text: t('examReports.percentEntered', { percent: percentage.toFixed(0) }),
        variant: 'secondary' as const,
        icon: Award,
      };
    }
    if (hasScheduled) {
      return { text: t('examReports.readyForMarks'), variant: 'secondary' as const, icon: Award };
    }
    return { text: t('examReports.awaitingSchedule'), variant: 'outline' as const, icon: Award };
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {examIdFromParams && (
            <Button variant="outline" size="sm" onClick={() => navigate('/exams')}>
              <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('common.back')}
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">{t('nav.examInsights')}</h1>
            <p className="text-muted-foreground">
              {examName || t('exams.reportsDescription')}
            </p>
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
                  <SelectValue placeholder={t('examReports.selectExam')} />
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
            <Badge variant="outline">{exams?.find(e => e.id === examId)?.academicYear?.name || '—'}</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('examReports.overview')}</TabsTrigger>
          <TabsTrigger value="subjects">
            <span className="hidden sm:inline">{t('examReports.subjectsAndMarks')}</span>
            <span className="sm:hidden">{t('examReports.statsSubjects')}</span>
          </TabsTrigger>
          <TabsTrigger value="grades">
            <span className="hidden sm:inline">{t('examReports.gradeCards')}</span>
            <span className="sm:hidden">{t('examReports.gradeCards')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t('examReports.statsClasses')}</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {reportLoading ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-bold">{totals.classes}</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t('examReports.statsSubjects')}</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {reportLoading ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-bold">{totals.subjects}</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t('examReports.statsStudents')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {reportLoading ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold">{totals.students}</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t('examReports.statsScheduled')}</CardTitle>
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
              <CardTitle>{t('examReports.classSubjectEnrollment')}</CardTitle>
              <CardDescription>{t('examReports.classSubjectEnrollmentDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {reportLoading && <Skeleton className="h-32 w-full" />}
              {!reportLoading && (!report || report.classes.length === 0) && (
                <p className="text-sm text-muted-foreground">{t('examReports.selectExamWithAssignments')}</p>
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
                        <Badge variant="outline">
                          {t('examReports.studentsCount', { count: examClass.studentCount })}
                        </Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('examReports.subjectName')}</TableHead>
                            <TableHead className="text-right">{t('examReports.marksColumn')}</TableHead>
                            <TableHead className="text-right">{t('examReports.passingColumn')}</TableHead>
                            <TableHead className="text-right">{t('examReports.scheduledColumn')}</TableHead>
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
              <CardTitle>{t('examReports.subjectLineup')}</CardTitle>
              <CardDescription>{t('examReports.subjectLineupDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {reportLoading && <Skeleton className="h-40 w-full" />}
              {!reportLoading && topSubjects.length === 0 && (
                <p className="text-sm text-muted-foreground">{t('examReports.assignSubjectsToPopulate')}</p>
              )}
              {!reportLoading && topSubjects.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('examReports.subjectName')}</TableHead>
                      <TableHead>{t('examReports.className')}</TableHead>
                      <TableHead className="text-right">{t('examReports.totalShort')}</TableHead>
                      <TableHead className="text-right">{t('examReports.passingColumn')}</TableHead>
                      <TableHead className="text-right">{t('examReports.scheduleColumn')}</TableHead>
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
                          {subject.scheduledAt ? formatDate(subject.scheduledAt) : t('examReports.pendingSchedule')}
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
              <CardTitle>{t('examReports.topSubjectReadiness')}</CardTitle>
              <CardDescription>{t('examReports.topSubjectReadinessDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {topSubjects.slice(0, 3).map((subject) => (
                <Card key={subject.id} className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{subject.name}</CardTitle>
                    <CardDescription>{subject.className}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      {t('examReports.totalPassingDetail', {
                        total: subject.totalMarks ?? '—',
                        passing: subject.passingMarks ?? '—',
                      })}
                    </div>
                    <div className="mt-2">
                      <Badge variant="outline">
                        {subject.scheduledAt ? formatDate(subject.scheduledAt) : t('examReports.awaitingSchedule')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {topSubjects.length === 0 && (
                <p className="text-sm text-muted-foreground">{t('examReports.noSubjectsToDisplay')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('examReports.gradeCardDrafts')}</CardTitle>
              <CardDescription>{t('examReports.gradeCardDraftsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(reportLoading || marksProgressLoading) && <Skeleton className="h-32 w-full" />}
              {!reportLoading && !marksProgressLoading && (!report || report.classes.length === 0) && (
                <p className="text-sm text-muted-foreground">{t('examReports.selectExamWithAssignedClasses')}</p>
              )}
              {!reportLoading && !marksProgressLoading && report && report.classes.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.classes.map((examClass) => {
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
                            {t('examReports.studentsCount', { count: examClass.studentCount })} •{' '}
                            {t('examReports.subjectsCompleteCount', {
                              completed: completedCount,
                              total: totalSubjects,
                            })}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {examClass.subjects.length === 0 && (
                            <p className="text-sm text-muted-foreground">{t('examReports.noSubjectsEnrolledForClass')}</p>
                          )}
                          {examClass.subjects.map((subject) => {
                            const progress = subjectProgressMap.get(subject.id);
                            const isComplete = progress?.isComplete ?? false;
                            const hasScheduled = !!subject.scheduledAt;
                            const hasProgress = progress !== undefined;
                            const resultsCount = progress?.resultsCount ?? 0;
                            const enrolledCount = progress?.enrolledCount ?? 0;
                            const percentage = progress?.percentage ?? 0;

                            const status = getSubjectStatus(
                              isComplete,
                              hasProgress,
                              resultsCount,
                              hasScheduled,
                              percentage
                            );
                            const StatusIcon = status.icon;

                            return (
                              <div key={subject.id} className="rounded-md border px-3 py-2 flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{subject.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {t('examReports.totalPassingDetail', {
                                      total: subject.totalMarks ?? '—',
                                      passing: subject.passingMarks ?? '—',
                                    })}
                                    {hasProgress && (
                                      <span className={isRTL ? 'mr-2' : 'ml-2'}>
                                        • {t('examReports.enteredSlashTotal', {
                                          entered: resultsCount,
                                          total: enrolledCount,
                                        })}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <Badge variant={status.variant} className="text-xs flex items-center gap-1">
                                  <StatusIcon className="h-3 w-3" />
                                  {status.text}
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
