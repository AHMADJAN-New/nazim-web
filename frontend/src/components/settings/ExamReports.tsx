import { useEffect, useMemo, useState } from 'react';
import { useProfile } from '@/hooks/useProfiles';
import { useExams, useExamReport } from '@/hooks/useExams';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, BookOpen, Layers, Award, CalendarClock } from 'lucide-react';

export function ExamReports() {
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  const { data: exams, isLoading: examsLoading } = useExams(organizationId);
  const [selectedExamId, setSelectedExamId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (exams && exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0].id);
    }
  }, [exams, selectedExamId]);

  const { data: report, isLoading: reportLoading } = useExamReport(selectedExamId);

  const totals = useMemo(() => report?.totals || { classes: 0, subjects: 0, students: 0 }, [report]);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Exam insights</h1>
          <p className="text-sm text-muted-foreground">Generate summaries, planned schedules, and grade-ready cards.</p>
        </div>
        <div className="w-full md:w-64">
          <Select value={selectedExamId} onValueChange={setSelectedExamId} disabled={examsLoading || !exams?.length}>
            <SelectTrigger>
              <SelectValue placeholder="Select exam" />
            </SelectTrigger>
            <SelectContent>
              {(exams || []).map((exam) => (
                <SelectItem key={exam.id} value={exam.id}>
                  {exam.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                                {subject.scheduledAt ? new Date(subject.scheduledAt).toLocaleDateString() : '—'}
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
                          {subject.scheduledAt ? new Date(subject.scheduledAt).toLocaleDateString() : 'Pending'}
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
                        {subject.scheduledAt ? new Date(subject.scheduledAt).toLocaleDateString() : 'Awaiting schedule'}
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
              <CardDescription>Preview per-class grade cards and attendance placeholders.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {reportLoading && <Skeleton className="h-32 w-full" />}
              {!reportLoading && (!report || report.classes.length === 0) && (
                <p className="text-sm text-muted-foreground">Select an exam with assigned classes.</p>
              )}
              {!reportLoading && report && report.classes.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.classes.map((examClass) => (
                    <Card key={examClass.id} className="border-dashed">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{examClass.className}</CardTitle>
                        <CardDescription>{examClass.studentCount} students</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {examClass.subjects.length === 0 && (
                          <p className="text-sm text-muted-foreground">No subjects enrolled for this class.</p>
                        )}
                        {examClass.subjects.map((subject) => (
                          <div key={subject.id} className="rounded-md border px-3 py-2 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{subject.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Total {subject.totalMarks ?? '—'} • Passing {subject.passingMarks ?? '—'}
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              <Award className="h-3 w-3 mr-1" />
                              {subject.scheduledAt ? 'Ready for marks' : 'Awaiting schedule'}
                            </Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
