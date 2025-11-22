import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLanguage } from '@/hooks/useLanguage';
import { useClasses } from '@/hooks/useClasses';
import { useSubjects } from '@/hooks/useSubjects';
import { useStaffByType } from '@/hooks/useStaff';
import {
  useSubjectAssignments,
  useCreateSubjectAssignment,
  useUpdateSubjectAssignment,
  useDeleteSubjectAssignment,
  AssignmentPayload,
} from '@/hooks/useSubjectAssignments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { Plus, Shuffle, Trash2 } from 'lucide-react';
import type { SubjectTeacherAssignment } from '@/types/academics';

interface AssignmentFormValues {
  class_id: string;
  subject_id: string;
  teacher_staff_id: string;
  schedule_slot?: string | null;
  notes?: string | null;
}

export function SubjectAssignmentsManagement() {
  const { t } = useLanguage();
  const { data: classes } = useClasses();
  const { data: subjects } = useSubjects();
  const { data: teachers } = useStaffByType('teacher');

  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('');

  const { data: assignments, isLoading } = useSubjectAssignments({
    classId: selectedClassFilter || undefined,
    subjectId: selectedSubjectFilter || undefined,
  });

  const createAssignment = useCreateSubjectAssignment();
  const updateAssignment = useUpdateSubjectAssignment();
  const deleteAssignment = useDeleteSubjectAssignment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<SubjectTeacherAssignment | null>(null);

  const form = useForm<AssignmentFormValues>({
    defaultValues: {
      class_id: '',
      subject_id: '',
      teacher_staff_id: '',
      schedule_slot: '',
      notes: '',
    },
  });

  const openDialog = (assignment?: SubjectTeacherAssignment) => {
    if (assignment) {
      setEditingAssignment(assignment);
      form.reset({
        class_id: assignment.class_id,
        subject_id: assignment.subject_id,
        teacher_staff_id: assignment.teacher_staff_id,
        schedule_slot: assignment.schedule_slot || '',
        notes: assignment.notes || '',
      });
    } else {
      setEditingAssignment(null);
      form.reset({
        class_id: '',
        subject_id: '',
        teacher_staff_id: '',
        schedule_slot: '',
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingAssignment(null);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: AssignmentPayload = {
      class_id: values.class_id,
      subject_id: values.subject_id,
      teacher_staff_id: values.teacher_staff_id,
      schedule_slot: values.schedule_slot || null,
      notes: values.notes || null,
    };

    if (editingAssignment) {
      await updateAssignment.mutateAsync({ id: editingAssignment.id, ...payload });
    } else {
      await createAssignment.mutateAsync(payload);
    }
    closeDialog();
  });

  const classOptions = classes ?? [];
  const subjectOptions = subjects ?? [];
  const teacherOptions =
    teachers?.map((teacher) => ({
      id: teacher.id,
      name: teacher.profile?.full_name || teacher.full_name || teacher.employee_id,
    })) ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('academic.assignments.title')}</h1>
          <p className="text-muted-foreground">{t('academic.assignments.management')}</p>
        </div>
        <Button onClick={() => openDialog()} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t('academic.assignments.addAssignment')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('academic.assignments.filters')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{t('academic.assignments.class')}</Label>
            <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('academic.assignments.filterClassPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('academic.assignments.allClasses')}</SelectItem>
                {classOptions.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('academic.assignments.subject')}</Label>
            <Select value={selectedSubjectFilter} onValueChange={setSelectedSubjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('academic.assignments.filterSubjectPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('academic.assignments.allSubjects')}</SelectItem>
                {subjectOptions.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('academic.assignments.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner text={t('common.loading')} />
          ) : assignments && assignments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('academic.assignments.class')}</TableHead>
                    <TableHead>{t('academic.assignments.subject')}</TableHead>
                    <TableHead>{t('academic.assignments.teacher')}</TableHead>
                    <TableHead>{t('academic.assignments.schedule')}</TableHead>
                    <TableHead>{t('academic.assignments.notes')}</TableHead>
                    <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{assignment.class?.name || '—'}</span>
                          {assignment.class?.grade_level && (
                            <span className="text-xs text-muted-foreground">
                              {assignment.class.grade_level}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {assignment.subject?.color && (
                            <span
                              className="inline-block h-3 w-3 rounded-full border"
                              style={{ backgroundColor: assignment.subject.color }}
                            />
                          )}
                          {assignment.subject?.name || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {assignment.teacher?.full_name ? (
                          <span>{assignment.teacher.full_name}</span>
                        ) : (
                          <Badge variant="outline">{t('academic.assignments.unassigned')}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{assignment.schedule_slot || '—'}</TableCell>
                      <TableCell>{assignment.notes || '—'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openDialog(assignment)}>
                          <Shuffle className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('academic.assignments.deleteAssignment')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('academic.assignments.deleteConfirm')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteAssignment.mutate(assignment.id)}
                              >
                                {t('common.delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-10 text-center text-muted-foreground">
              {t('academic.assignments.noAssignmentsFound')}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAssignment
                ? t('academic.assignments.editAssignment')
                : t('academic.assignments.addAssignment')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('academic.assignments.class')}</Label>
              <Select
                value={form.watch('class_id')}
                onValueChange={(value) => form.setValue('class_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('academic.assignments.selectClass')} />
                </SelectTrigger>
                <SelectContent>
                  {classOptions.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('academic.assignments.subject')}</Label>
              <Select
                value={form.watch('subject_id')}
                onValueChange={(value) => form.setValue('subject_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('academic.assignments.selectSubject')} />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('academic.assignments.teacher')}</Label>
              <Select
                value={form.watch('teacher_staff_id')}
                onValueChange={(value) => form.setValue('teacher_staff_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('academic.assignments.selectTeacher')} />
                </SelectTrigger>
                <SelectContent>
                  {teacherOptions.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-slot">{t('academic.assignments.schedule')}</Label>
                <Input id="schedule-slot" {...form.register('schedule_slot')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">{t('academic.assignments.notes')}</Label>
                <Input id="notes" {...form.register('notes')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createAssignment.isPending || updateAssignment.isPending}
              >
                {editingAssignment ? t('common.save') : t('academic.assignments.assignButton')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SubjectAssignmentsManagement;
