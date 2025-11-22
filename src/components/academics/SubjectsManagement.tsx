import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, BookOpen, Trash2, Pencil } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useSubjects, useCreateSubject, useUpdateSubject, useDeleteSubject, SubjectPayload } from '@/hooks/useSubjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { LoadingSpinner } from '@/components/ui/loading';
import type { SubjectWithTeachers } from '@/types/academics';

interface SubjectFormValues {
  name: string;
  code: string;
  grade_level?: string | null;
  credit_hours?: number | null;
  description?: string | null;
  color?: string | null;
  is_core: boolean;
}

export function SubjectsManagement() {
  const { t } = useLanguage();
  const { data: subjects, isLoading } = useSubjects();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectWithTeachers | null>(null);

  const form = useForm<SubjectFormValues>({
    defaultValues: {
      name: '',
      code: '',
      grade_level: '',
      credit_hours: undefined,
      description: '',
      color: '#0b0b56',
      is_core: true,
    },
  });

  const openDialog = (subject?: SubjectWithTeachers) => {
    if (subject) {
      setEditingSubject(subject);
      form.reset({
        name: subject.name,
        code: subject.code,
        grade_level: subject.grade_level || '',
        credit_hours: subject.credit_hours || undefined,
        description: subject.description || '',
        color: subject.color || '#0b0b56',
        is_core: subject.is_core,
      });
    } else {
      setEditingSubject(null);
      form.reset({
        name: '',
        code: '',
        grade_level: '',
        credit_hours: undefined,
        description: '',
        color: '#0b0b56',
        is_core: true,
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingSubject(null);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: SubjectPayload = {
      name: values.name,
      code: values.code,
      grade_level: values.grade_level || null,
      credit_hours: values.credit_hours ?? null,
      description: values.description || null,
      color: values.color || null,
      is_core: values.is_core,
    };

    if (editingSubject) {
      await updateSubject.mutateAsync({ id: editingSubject.id, ...payload });
    } else {
      await createSubject.mutateAsync(payload);
    }

    closeDialog();
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('academic.subjects.title')}</h1>
          <p className="text-muted-foreground">{t('academic.subjects.management')}</p>
        </div>
        <Button onClick={() => openDialog()} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t('academic.subjects.addSubject')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t('academic.subjects.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner text={t('common.loading')} />
          ) : subjects && subjects.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('academic.subjects.subjectName')}</TableHead>
                    <TableHead>{t('academic.subjects.code')}</TableHead>
                    <TableHead>{t('academic.subjects.gradeLevel')}</TableHead>
                    <TableHead>{t('academic.subjects.creditHours')}</TableHead>
                    <TableHead>{t('academic.subjects.isCore')}</TableHead>
                    <TableHead>{t('academic.subjects.assignedTeachers')}</TableHead>
                    <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {subject.color && (
                            <span
                              className="inline-block h-3 w-3 rounded-full border"
                              style={{ backgroundColor: subject.color }}
                            />
                          )}
                          {subject.name}
                        </div>
                      </TableCell>
                      <TableCell>{subject.code}</TableCell>
                      <TableCell>{subject.grade_level || '—'}</TableCell>
                      <TableCell>{subject.credit_hours ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={subject.is_core ? 'default' : 'outline'}>
                          {subject.is_core ? t('academic.subjects.core') : t('academic.subjects.elective')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {subject.teachers.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {subject.teachers.map((assignment) => (
                              <Badge key={assignment.assignmentId} variant="secondary" className="text-xs">
                                {assignment.className}: {assignment.teacherName}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {t('academic.subjects.noTeachersAssigned')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openDialog(subject)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('academic.subjects.deleteSubject')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('academic.subjects.deleteConfirm')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteSubject.mutate(subject.id)}
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
              {t('academic.subjects.noSubjectsFound')}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSubject ? t('academic.subjects.editSubject') : t('academic.subjects.addSubject')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject-name">{t('academic.subjects.subjectName')}</Label>
                <Input id="subject-name" {...form.register('name', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject-code">{t('academic.subjects.code')}</Label>
                <Input id="subject-code" {...form.register('code', { required: true })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grade-level">{t('academic.subjects.gradeLevel')}</Label>
                <Input id="grade-level" {...form.register('grade_level')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credit-hours">{t('academic.subjects.creditHours')}</Label>
                <Input
                  id="credit-hours"
                  type="number"
                  step="0.5"
                  {...form.register('credit_hours', { valueAsNumber: true })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('academic.subjects.description')}</Label>
              <Input id="description" {...form.register('description')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject-color">{t('academic.subjects.color')}</Label>
              <Input id="subject-color" type="color" {...form.register('color')} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-base">{t('academic.subjects.isCore')}</Label>
                <p className="text-sm text-muted-foreground">{t('academic.subjects.coreDescription')}</p>
              </div>
              <Switch
                checked={form.watch('is_core')}
                onCheckedChange={(checked) => form.setValue('is_core', checked)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createSubject.isPending || updateSubject.isPending}>
                {editingSubject ? t('common.save') : t('common.add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SubjectsManagement;
