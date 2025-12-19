import { useEffect, useMemo, useState } from 'react';
import {
  useExams,
  useCreateExam,
  useUpdateExam,
  useDeleteExam,
  useExamClasses,
  useAssignClassToExam,
  useRemoveClassFromExam,
  useExamSubjects,
  useEnrollSubjectToExam,
  useRemoveExamSubject,
  useUpdateExamSubject,
  useMarksProgress,
} from '@/hooks/useExams';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useExamTypes } from '@/hooks/useExamTypes';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useClassSubjects } from '@/hooks/useSubjects';
import type { Exam, ExamClass, ExamSubject } from '@/types/domain/exam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, CheckCircle, CalendarDays, NotebookPen, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ExamClassCardProps {
  examClass: ExamClass;
  examSubjects: ExamSubject[];
  organizationId?: string | null;
  selectedExamId?: string;
  hasAssign: boolean;
  enrollSubject: ReturnType<typeof useEnrollSubjectToExam>;
  removeSubject: ReturnType<typeof useRemoveExamSubject>;
  removeClass: ReturnType<typeof useRemoveClassFromExam>;
  updateSubject: ReturnType<typeof useUpdateExamSubject>;
  subjectDrafts: Record<string, { totalMarks: string; passingMarks: string; scheduledAt: string }>;
  onDraftChange: (id: string, draft: { totalMarks: string; passingMarks: string; scheduledAt: string }) => void;
}

function ExamClassCard({
  examClass,
  examSubjects,
  organizationId,
  selectedExamId,
  hasAssign,
  enrollSubject,
  removeSubject,
  removeClass,
  updateSubject,
  subjectDrafts,
  onDraftChange,
}: ExamClassCardProps) {
  const { data: classSubjects } = useClassSubjects(examClass.classAcademicYearId, organizationId || undefined);
  const [selectedClassSubjectId, setSelectedClassSubjectId] = useState<string>('');

  const linkedSubjects = useMemo(() => examSubjects.filter((s) => s.examClassId === examClass.id), [examSubjects, examClass.id]);
  const availableSubjectOptions = useMemo(() => {
    if (!classSubjects) return [];
    const assigned = new Set(linkedSubjects.map((s) => s.classSubjectId));
    return classSubjects.filter((cs) => !assigned.has(cs.id));
  }, [classSubjects, linkedSubjects]);

  const handleEnroll = () => {
    if (!selectedExamId || !selectedClassSubjectId) return;
    enrollSubject.mutate({
      exam_id: selectedExamId,
      exam_class_id: examClass.id,
      class_subject_id: selectedClassSubjectId,
    });
    setSelectedClassSubjectId('');
  };

  const classLabel = `${examClass.classAcademicYear?.class?.name || 'Class'}${examClass.classAcademicYear?.sectionName ? ` - ${examClass.classAcademicYear.sectionName}` : ''}`;

  return (
    <Card key={examClass.id} className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{classLabel}</CardTitle>
          <CardDescription>{examClass.classAcademicYear?.academicYear?.name}</CardDescription>
        </div>
        {hasAssign && (
          <Button variant="ghost" size="icon" onClick={() => removeClass.mutate(examClass.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <Label>Enroll subject</Label>
            <Select value={selectedClassSubjectId} onValueChange={setSelectedClassSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {availableSubjectOptions.map((cs) => (
                  <SelectItem key={cs.id} value={cs.id}>
                    {cs.subject?.name || cs.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleEnroll} disabled={!selectedClassSubjectId || enrollSubject.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {linkedSubjects.length === 0 && <p className="text-sm text-muted-foreground">No subjects enrolled yet.</p>}
          {linkedSubjects.length > 0 && (
            <div className="space-y-2">
              {linkedSubjects.map((subject) => {
                const draft = subjectDrafts[subject.id] || { totalMarks: '', passingMarks: '', scheduledAt: '' };
                return (
                  <div
                    key={subject.id}
                    className="rounded-md border p-3 flex flex-col gap-3 bg-muted/40 hover:bg-muted/60 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium leading-none">{subject.subject?.name || subject.subjectId}</p>
                        <p className="text-xs text-muted-foreground">{subject.classSubject?.notes || 'Enrolled subject'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {subject.scheduledAt && (
                          <Badge variant="outline" className="text-xs">
                            <CalendarDays className="h-3 w-3 mr-1" />
                            {new Date(subject.scheduledAt).toLocaleDateString()}
                          </Badge>
                        )}
                        {hasAssign && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSubject.mutate(subject.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                      <div>
                        <Label className="text-xs">Total marks</Label>
                        <Input
                          type="number"
                          value={draft.totalMarks}
                          onChange={(e) => onDraftChange(subject.id, { ...draft, totalMarks: e.target.value })}
                          placeholder="e.g. 100"
                          disabled={!hasAssign}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Passing marks</Label>
                        <Input
                          type="number"
                          value={draft.passingMarks}
                          onChange={(e) => onDraftChange(subject.id, { ...draft, passingMarks: e.target.value })}
                          placeholder="e.g. 40"
                          disabled={!hasAssign}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Schedule</Label>
                        <Input
                          type="date"
                          value={draft.scheduledAt}
                          onChange={(e) => onDraftChange(subject.id, { ...draft, scheduledAt: e.target.value })}
                          disabled={!hasAssign}
                          min={selectedExam?.startDate ? new Date(selectedExam.startDate).toISOString().slice(0, 10) : undefined}
                          max={selectedExam?.endDate ? new Date(selectedExam.endDate).toISOString().slice(0, 10) : undefined}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={() =>
                            updateSubject.mutate({
                              id: subject.id,
                              data: {
                                total_marks: draft.totalMarks ? Number(draft.totalMarks) : null,
                                passing_marks: draft.passingMarks ? Number(draft.passingMarks) : null,
                                scheduled_at: draft.scheduledAt || null,
                              },
                            })
                          }
                          disabled={!hasAssign || updateSubject.isPending}
                        >
                          <NotebookPen className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            onDraftChange(subject.id, {
                              totalMarks: subject.totalMarks?.toString() || '',
                              passingMarks: subject.passingMarks?.toString() || '',
                              scheduledAt: subject.scheduledAt ? subject.scheduledAt.toISOString().slice(0, 10) : '',
                            })
                          }
                          disabled={!hasAssign}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ExamsManagement() {
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  const { data: academicYears } = useAcademicYears(organizationId);
  const { data: examTypes } = useExamTypes();
  const { data: exams, isLoading } = useExams(organizationId);
  const createExam = useCreateExam();
  const updateExam = useUpdateExam();
  const deleteExam = useDeleteExam();
  const updateExamSubject = useUpdateExamSubject();

  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [formState, setFormState] = useState({ name: '', academicYearId: '', examTypeId: '', description: '' });
  const [draftSubjects, setDraftSubjects] = useState<Record<string, { totalMarks: string; passingMarks: string; scheduledAt: string }>>({});
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  useEffect(() => {
    if (exams && exams.length > 0 && !selectedExam) {
      setSelectedExam(exams[0]);
    }
  }, [exams, selectedExam]);

  useEffect(() => {
    if (selectedExam) {
      setFormState({
        name: selectedExam.name,
        academicYearId: selectedExam.academicYearId,
        examTypeId: selectedExam.examTypeId || '',
        description: selectedExam.description || '',
      });
    } else {
      setFormState({ name: '', academicYearId: '', examTypeId: '', description: '' });
    }
  }, [selectedExam]);

  const { data: examClasses, isLoading: classesLoading } = useExamClasses(selectedExam?.id);
  const { data: examSubjects } = useExamSubjects(selectedExam?.id);
  const { data: availableClasses } = useClassAcademicYears(selectedExam?.academicYearId, organizationId);
  const { data: marksProgress, isLoading: marksProgressLoading } = useMarksProgress(selectedExam?.id);

  // Create a map of examSubjectId -> progress data for quick lookup
  const subjectProgressMap = useMemo(() => {
    if (!marksProgress?.subjectProgress) return new Map();
    const map = new Map();
    marksProgress.subjectProgress.forEach((sp) => {
      map.set(sp.examSubjectId, sp);
    });
    return map;
  }, [marksProgress]);

  useEffect(() => {
    const nextDrafts: Record<string, { totalMarks: string; passingMarks: string; scheduledAt: string }> = {};
    (examSubjects || []).forEach((subject) => {
      nextDrafts[subject.id] = {
        totalMarks: subject.totalMarks?.toString() || '',
        passingMarks: subject.passingMarks?.toString() || '',
        scheduledAt: subject.scheduledAt ? subject.scheduledAt.toISOString().slice(0, 10) : '',
      };
    });
    setDraftSubjects(nextDrafts);
  }, [examSubjects]);

  const assignClass = useAssignClassToExam();
  const removeClass = useRemoveClassFromExam();
  const enrollSubject = useEnrollSubjectToExam();
  const removeSubject = useRemoveExamSubject();
  const onDraftChange = (
    id: string,
    draft: { totalMarks: string; passingMarks: string; scheduledAt: string }
  ) => {
    setDraftSubjects((prev) => ({
      ...prev,
      [id]: draft,
    }));
  };

  const hasCreate = useHasPermission('exams.create');
  const hasUpdate = useHasPermission('exams.update');
  const hasDelete = useHasPermission('exams.delete');
  const hasAssign = useHasPermission('exams.assign');

  const selectedExamId = selectedExam?.id;

  const selectedExamStats = useMemo(
    () => ({
      classes: examClasses?.length ?? 0,
      subjects: examSubjects?.length ?? 0,
      academicYear: selectedExam?.academicYear?.name || '—',
    }),
    [examClasses?.length, examSubjects?.length, selectedExam?.academicYear?.name]
  );

  const handleSaveExam = () => {
    if (!formState.name || !formState.academicYearId) return;
    if (selectedExam) {
      updateExam.mutate({
        id: selectedExam.id,
        data: {
          name: formState.name,
          academicYearId: formState.academicYearId,
          examTypeId: formState.examTypeId || undefined,
          description: formState.description,
        },
      });
    } else {
      createExam.mutate({
        name: formState.name,
        academicYearId: formState.academicYearId,
        examTypeId: formState.examTypeId || undefined,
        description: formState.description,
      });
    }
  };

  const handleDeleteExam = (examId: string) => {
    deleteExam.mutate(examId, {
      onSuccess: () => setSelectedExam(null),
    });
  };

  const renderExamsTable = () => {
    if (isLoading) {
      return <Skeleton className="w-full h-32" />;
    }

    if (!exams || exams.length === 0) {
      return <p className="text-sm text-muted-foreground">No exams yet. Create one to get started.</p>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Exam Type</TableHead>
            <TableHead>Academic Year</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exams.map((exam) => (
            <TableRow key={exam.id} className={selectedExamId === exam.id ? 'bg-muted/40' : ''}>
              <TableCell className="font-medium">{exam.name}</TableCell>
              <TableCell>
                {exam.examType ? (
                  <Badge variant="outline">{exam.examType.name}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>{exam.academicYear?.name || 'N/A'}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedExam(exam)}>
                  Select
                </Button>
                {hasDelete && (
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteExam(exam.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Exam workspace</h1>
          <p className="text-sm text-muted-foreground">
            Create exams, link classes, and capture marks and schedules in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">Academic year: {selectedExamStats.academicYear}</Badge>
          {selectedExam && <Badge variant="secondary">{selectedExam.name}</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Classes lined up</CardDescription>
            <CardTitle className="text-2xl">{selectedExamStats.classes}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Exam subjects</CardDescription>
            <CardTitle className="text-2xl">{selectedExamStats.subjects}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-2xl">{selectedExam ? 'Ready' : 'Drafting'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="builder" className="space-y-4">
        <TabsList>
          <TabsTrigger value="builder">Plan & enrollment</TabsTrigger>
          <TabsTrigger value="grades">Marks & grade cards</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Exams</CardTitle>
                <CardDescription>Manage exam definitions per academic year.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderExamsTable()}
                <Separator />
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Midterm"
                      value={formState.name}
                      onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                      disabled={!hasCreate && !hasUpdate}
                    />
                  </div>
                  <div>
                    <Label>Academic Year</Label>
                    <Select
                      value={formState.academicYearId}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, academicYearId: value }))}
                      disabled={!hasCreate && !hasUpdate}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {(academicYears || []).map((year) => (
                          <SelectItem key={year.id} value={year.id}>
                            {year.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Exam Type</Label>
                    <Select
                      value={formState.examTypeId}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, examTypeId: value }))}
                      disabled={!hasCreate && !hasUpdate}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select exam type (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {(examTypes || []).filter(et => et.isActive).map((examType) => (
                          <SelectItem key={examType.id} value={examType.id}>
                            {examType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Optional description"
                      value={formState.description}
                      onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                      disabled={!hasCreate && !hasUpdate}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleSaveExam}
                      disabled={!formState.name || !formState.academicYearId || (!hasCreate && !selectedExam)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {selectedExam ? 'Update' : 'Create'}
                    </Button>
                    {selectedExam && (
                      <Button variant="outline" onClick={() => setSelectedExam(null)}>
                        New exam
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Assigned Classes</CardTitle>
                  <CardDescription>Link classes from the exam academic year and enroll their subjects.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!selectedExam && <p className="text-sm text-muted-foreground">Select or create an exam to manage assignments.</p>}
                  {selectedExam && (
                    <>
                      <div className="flex items-end space-x-2">
                        <div className="flex-1">
                          <Label>Class section</Label>
                          <Select
                            value={selectedClassId}
                            onValueChange={(value) => setSelectedClassId(value)}
                            disabled={!hasAssign || classesLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                              {(availableClasses || []).map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.class?.name} {c.sectionName ? `- ${c.sectionName}` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="outline"
                          disabled={!selectedExamId || !selectedClassId || !hasAssign}
                          onClick={() => {
                            if (!selectedExamId || !selectedClassId) return;
                            assignClass.mutate(
                              { exam_id: selectedExamId, class_academic_year_id: selectedClassId },
                              { onSuccess: () => setSelectedClassId('') }
                            );
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                      <Separator />
                      {classesLoading && <Skeleton className="h-10 w-full" />}
                      {!classesLoading && (!examClasses || examClasses.length === 0) && (
                        <p className="text-sm text-muted-foreground">No classes assigned yet.</p>
                      )}
                      {!classesLoading && examClasses && examClasses.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {examClasses.map((examClass) => (
                            <ExamClassCard
                              key={examClass.id}
                              examClass={examClass}
                              examSubjects={examSubjects || []}
                              organizationId={organizationId}
                              selectedExamId={selectedExamId}
                              hasAssign={hasAssign}
                              enrollSubject={enrollSubject}
                              removeSubject={removeSubject}
                              removeClass={removeClass}
                              updateSubject={updateExamSubject}
                              subjectDrafts={draftSubjects}
                              onDraftChange={onDraftChange}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="grades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Grade cards preview</CardTitle>
              <CardDescription>Track scheduled subjects, total and passing marks, and mark entry completion status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedExam && <p className="text-sm text-muted-foreground">Select an exam to view its grade cards.</p>}
              {selectedExam && (!examSubjects || examSubjects.length === 0) && (
                <p className="text-sm text-muted-foreground">Enroll subjects to generate grade cards.</p>
              )}
              {selectedExam && examClasses && examClasses.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {examClasses.map((examClass) => {
                    const subjectsForClass = (examSubjects || []).filter((s) => s.examClassId === examClass.id);
                    
                    // Count completed subjects for this class
                    const completedCount = subjectsForClass.filter((subject) => {
                      const progress = subjectProgressMap.get(subject.id);
                      return progress?.isComplete ?? false;
                    }).length;
                    const totalSubjects = subjectsForClass.length;

                    return (
                      <Card key={examClass.id} className="border-dashed">
                        <CardHeader>
                          <CardTitle className="text-base">{examClass.classAcademicYear?.class?.name || 'Class'}</CardTitle>
                          <CardDescription>
                            {subjectsForClass.length} subjects · {completedCount}/{totalSubjects} complete
                            {draftSubjects && subjectsForClass.some((s) => draftSubjects[s.id]?.scheduledAt)
                              ? ' · schedules ready'
                              : ' · scheduling pending'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {subjectsForClass.length === 0 && (
                            <p className="text-sm text-muted-foreground">No subjects enrolled.</p>
                          )}
                          {subjectsForClass.map((subject) => {
                            const draft = draftSubjects[subject.id];
                            const progress = subjectProgressMap.get(subject.id);
                            const isComplete = progress?.isComplete ?? false;
                            const hasScheduled = !!draft?.scheduledAt || !!subject.scheduledAt;
                            const hasProgress = progress !== undefined;
                            const resultsCount = progress?.resultsCount ?? 0;
                            const enrolledCount = progress?.enrolledCount ?? 0;
                            const percentage = progress?.percentage ?? 0;

                            // Determine status badge
                            let badgeLabel = 'Not scheduled';
                            let badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' = 'outline';
                            let badgeIcon = Award;
                            let badgeClassName = '';

                            if (isComplete) {
                              badgeLabel = 'Marks complete';
                              badgeVariant = 'default';
                              badgeIcon = CheckCircle;
                              badgeClassName = 'border-green-200';
                            } else if (hasProgress && resultsCount > 0) {
                              badgeLabel = `${percentage.toFixed(0)}% entered`;
                              badgeVariant = 'secondary';
                              badgeClassName = 'border-blue-200';
                            } else if (hasScheduled) {
                              badgeLabel = draft?.scheduledAt ? `Scheduled ${draft.scheduledAt}` : 'Ready for marks';
                              badgeVariant = 'outline';
                              badgeClassName = 'border-green-200';
                            }

                            return (
                              <div
                                key={subject.id}
                                className="flex items-center justify-between rounded-md border px-3 py-2"
                              >
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{subject.subject?.name || subject.subjectId}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Max {draft?.totalMarks || subject.totalMarks || '—'} • Pass {draft?.passingMarks || subject.passingMarks || '—'}
                                    {hasProgress && (
                                      <span className="ml-2">
                                        • {resultsCount}/{enrolledCount} entered
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <Badge 
                                  variant={badgeVariant} 
                                  className={cn('text-xs flex items-center gap-1', badgeClassName)}
                                >
                                  {badgeIcon === CheckCircle ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : (
                                    <Award className="h-3 w-3" />
                                  )}
                                  {badgeLabel}
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
