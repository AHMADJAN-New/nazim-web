import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useClasses, useCreateClass, useDeleteClass, useUpdateClass, ClassPayload } from '@/hooks/useClasses';
import { useStaffByType } from '@/hooks/useStaff';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import type { ClassWithTeachers } from '@/types/academics';

interface ClassFormValues {
  name: string;
  code: string;
  grade_level?: string | null;
  section?: string | null;
  description?: string | null;
  homeroom_teacher_id?: string | null;
}

export function ClassesManagement() {
  const { t } = useLanguage();
  const { data: classes, isLoading } = useClasses();
  const { data: teachers } = useStaffByType('teacher');
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  const deleteClass = useDeleteClass();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithTeachers | null>(null);

  const form = useForm<ClassFormValues>({
    defaultValues: {
      name: '',
      code: '',
      grade_level: '',
      section: '',
      description: '',
      homeroom_teacher_id: '',
    },
  });

  const openDialog = (cls?: ClassWithTeachers) => {
    if (cls) {
      setEditingClass(cls);
      form.reset({
        name: cls.name,
        code: cls.code,
        grade_level: cls.grade_level || '',
        section: cls.section || '',
        description: cls.description || '',
        homeroom_teacher_id: cls.homeroom_teacher_id || '',
      });
    } else {
      setEditingClass(null);
      form.reset({
        name: '',
        code: '',
        grade_level: '',
        section: '',
        description: '',
        homeroom_teacher_id: '',
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingClass(null);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: ClassPayload = {
      name: values.name,
      code: values.code,
      grade_level: values.grade_level || null,
      section: values.section || null,
      description: values.description || null,
      homeroom_teacher_id: values.homeroom_teacher_id || null,
    };

    if (editingClass) {
      await updateClass.mutateAsync({ id: editingClass.id, ...payload });
    } else {
      await createClass.mutateAsync(payload);
    }
    closeDialog();
  });

  const teacherOptions = useMemo(
    () =>
      (teachers ?? []).map((teacher) => ({
        id: teacher.id,
        label: teacher.profile?.full_name || teacher.full_name || teacher.employee_id,
      })),
    [teachers]
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('academic.classes.title')}</h1>
          <p className="text-muted-foreground">{t('academic.classes.management')}</p>
        </div>
        <Button onClick={() => openDialog()} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t('academic.classes.addClass')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('academic.classes.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner text={t('common.loading')} />
          ) : classes && classes.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('academic.classes.className')}</TableHead>
                    <TableHead>{t('academic.classes.code')}</TableHead>
                    <TableHead>{t('academic.classes.gradeLevel')}</TableHead>
                    <TableHead>{t('academic.classes.section')}</TableHead>
                    <TableHead>{t('academic.classes.homeroomTeacher')}</TableHead>
                    <TableHead>{t('academic.classes.teachers')}</TableHead>
                    <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>{cls.code}</TableCell>
                      <TableCell>{cls.grade_level || '—'}</TableCell>
                      <TableCell>{cls.section || '—'}</TableCell>
                      <TableCell>
                        {cls.homeroom_teacher_id
                          ? teacherOptions.find((option) => option.id === cls.homeroom_teacher_id)?.label || '—'
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {cls.teacherAssignments.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {cls.teacherAssignments.map((assignment) => (
                              <Badge key={assignment.assignmentId} variant="secondary" className="text-xs">
                                {assignment.subjectName}: {assignment.teacherName}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {t('academic.classes.noTeachersAssigned')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openDialog(cls)}>
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
                              <AlertDialogTitle>{t('academic.classes.deleteClass')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('academic.classes.deleteConfirm')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteClass.mutate(cls.id)}
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
              {t('academic.classes.noClassesFound')}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingClass ? t('academic.classes.editClass') : t('academic.classes.addClass')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('academic.classes.className')}</Label>
                <Input id="name" {...form.register('name', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">{t('academic.classes.code')}</Label>
                <Input id="code" {...form.register('code', { required: true })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grade_level">{t('academic.classes.gradeLevel')}</Label>
                <Input id="grade_level" {...form.register('grade_level')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">{t('academic.classes.section')}</Label>
                <Input id="section" {...form.register('section')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('academic.classes.description')}</Label>
              <Input id="description" {...form.register('description')} />
            </div>
            <div className="space-y-2">
              <Label>{t('academic.classes.homeroomTeacher')}</Label>
              <Select
                value={form.watch('homeroom_teacher_id') || ''}
                onValueChange={(value) => form.setValue('homeroom_teacher_id', value || '')}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('academic.classes.selectHomeroomTeacher')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('academic.classes.noHomeroomTeacher')}</SelectItem>
                  {teacherOptions.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createClass.isPending || updateClass.isPending}>
                {editingClass ? t('common.save') : t('common.add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ClassesManagement;
