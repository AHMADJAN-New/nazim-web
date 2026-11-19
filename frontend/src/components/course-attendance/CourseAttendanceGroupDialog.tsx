import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateCourseAttendanceGroup,
  useUpdateCourseAttendanceGroup,
  type CourseAttendanceGroup,
  type CourseRosterStudent,
} from '@/hooks/useCourseAttendance';
import { useLanguage } from '@/hooks/useLanguage';
import {
  createCourseAttendanceGroupSchema,
  type CourseAttendanceGroupFormData,
} from '@/lib/validations/courseAttendanceGroup';

interface CourseAttendanceGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  group: CourseAttendanceGroup | null;
  students: CourseRosterStudent[];
}

export function CourseAttendanceGroupDialog({
  open,
  onOpenChange,
  courseId,
  group,
  students,
}: CourseAttendanceGroupDialogProps) {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');
  const createGroup = useCreateCourseAttendanceGroup();
  const updateGroup = useUpdateCourseAttendanceGroup();

  const schema = useMemo(
    () => createCourseAttendanceGroupSchema({
      name: t('courses.attendance.groupName'),
      description: t('courses.attendance.groupDescription'),
      studentsRequired: t('courses.attendance.groupStudentsRequired'),
    }),
    [language, t]
  );

  const form = useForm<CourseAttendanceGroupFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      student_ids: [],
    },
  });

  useEffect(() => {
    if (!open) {
      setSearch('');
      return;
    }

    form.reset({
      name: group?.name ?? '',
      description: group?.description ?? '',
      student_ids: group?.students.map((student) => student.id) ?? [],
    });
  }, [open, group, form]);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) =>
      student.full_name.toLowerCase().includes(term)
      || (student.admission_no || '').toLowerCase().includes(term)
      || (student.father_name || '').toLowerCase().includes(term)
    );
  }, [search, students]);

  const selectedCount = form.watch('student_ids')?.length ?? 0;
  const isSaving = createGroup.isPending || updateGroup.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name.trim(),
      description: values.description?.trim() || null,
      student_ids: values.student_ids,
    };

    try {
      if (group) {
        await updateGroup.mutateAsync({ id: group.id, data: payload });
      } else {
        await createGroup.mutateAsync({ course_id: courseId, ...payload });
      }
      onOpenChange(false);
    } catch {
      // The mutation hook already shows the error toast.
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {group ? t('courses.attendance.editGroup') : t('courses.attendance.addGroup')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="attendance-group-name">{t('courses.attendance.groupName')}</Label>
            <Input
              id="attendance-group-name"
              {...form.register('name')}
              placeholder={t('courses.attendance.groupNamePlaceholder')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="attendance-group-description">{t('courses.attendance.groupDescription')}</Label>
            <Textarea
              id="attendance-group-description"
              {...form.register('description')}
              placeholder={t('courses.attendance.groupDescriptionPlaceholder')}
              rows={2}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>{t('courses.attendance.groupStudents')}</Label>
              <span className="text-xs text-muted-foreground">
                {t('courses.attendance.studentsSelected', { count: selectedCount })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{t('courses.attendance.groupStudentsHint')}</p>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('courses.attendance.searchStudents')}
            />
            <Controller
              control={form.control}
              name="student_ids"
              render={({ field }) => (
                <div className="max-h-56 overflow-y-auto rounded-md border p-2 space-y-1">
                  {filteredStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      {t('courses.attendance.noEnrolledStudents')}
                    </p>
                  ) : (
                    filteredStudents.map((student) => {
                      const checked = field.value.includes(student.id);
                      return (
                        <label
                          key={student.id}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              const next = value
                                ? [...field.value, student.id]
                                : field.value.filter((id) => id !== student.id);
                              field.onChange(next);
                            }}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium truncate">{student.full_name}</span>
                            <span className="block text-xs text-muted-foreground truncate">
                              {student.admission_no || student.father_name || ''}
                            </span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            />
            {form.formState.errors.student_ids && (
              <p className="text-sm text-destructive">{form.formState.errors.student_ids.message}</p>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
              {isSaving ? t('courses.attendance.savingGroup') : t('courses.attendance.saveGroup')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
