import { useEffect, memo } from 'react';
import { useForm, Controller, FormProvider } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { CalendarFormField } from '@/components/ui/calendar-form-field';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/hooks/useLanguage';
import { useCreateShortTermCourse, useUpdateShortTermCourse } from '@/hooks/useShortTermCourses';
import type { ShortTermCourse } from '@/types/domain/shortTermCourse';

interface ShortTermCourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: ShortTermCourse | null;
  onSuccess?: () => void;
}

interface CourseFormValues {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  durationDays: number | undefined;
  maxStudents: number | undefined;
  status: 'draft' | 'open' | 'closed' | 'completed';
  feeAmount: number | undefined;
  instructorName: string;
  location: string;
}

export const ShortTermCourseFormDialog = memo(function ShortTermCourseFormDialog({
  open,
  onOpenChange,
  course,
  onSuccess,
}: ShortTermCourseFormDialogProps) {
  const { t } = useLanguage();
  const isEdit = !!course;
  const createMutation = useCreateShortTermCourse();
  const updateMutation = useUpdateShortTermCourse();

  const formMethods = useForm<CourseFormValues>({
    defaultValues: {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      durationDays: undefined,
      maxStudents: undefined,
      status: 'draft',
      feeAmount: undefined,
      instructorName: '',
      location: '',
    },
  });

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = formMethods;

  useEffect(() => {
    if (!open) return;
    if (course) {
      reset({
        name: course.name || '',
        description: course.description || '',
        startDate: course.startDate || '',
        endDate: course.endDate || '',
        durationDays: course.durationDays ?? undefined,
        maxStudents: course.maxStudents ?? undefined,
        status: course.status || 'draft',
        feeAmount: course.feeAmount ?? undefined,
        instructorName: course.instructorName || '',
        location: course.location || '',
      });
    } else {
      reset({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        durationDays: undefined,
        maxStudents: undefined,
        status: 'draft',
        feeAmount: undefined,
        instructorName: '',
        location: '',
      });
    }
  }, [open, course, reset]);

  const onSubmit = async (values: CourseFormValues) => {
    const payload: Partial<ShortTermCourse> = {
      name: values.name,
      description: values.description || null,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
      durationDays: values.durationDays ?? null,
      maxStudents: values.maxStudents ?? null,
      status: values.status,
      feeAmount: values.feeAmount ?? null,
      instructorName: values.instructorName || null,
      location: values.location || null,
    };

    if (isEdit && course) {
      await updateMutation.mutateAsync({ id: course.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('courses.editCourse') : t('courses.createCourse')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('courses.updateDetails') : t('courses.createCourseDescription')}
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...formMethods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">{t('courses.courseName')} *</Label>
              <Input
                id="name"
                placeholder={t('events.courseNameExample')}
                {...register('name', { required: t('courses.courseNameRequired') })}
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">{t('courses.description')}</Label>
              <Textarea
                id="description"
                placeholder={t('courses.descriptionPlaceholder')}
                {...register('description')}
              />
            </div>

            <div>
              <Label htmlFor="instructorName">{t('courses.instructorName')}</Label>
              <Input
                id="instructorName"
                placeholder={t('courses.instructorNamePlaceholder')}
                {...register('instructorName')}
              />
            </div>

            <div>
              <Label htmlFor="location">{t('courses.location')}</Label>
              <Input
                id="location"
                placeholder={t('courses.locationPlaceholder')}
                {...register('location')}
              />
            </div>

            <div>
              <CalendarFormField 
                control={control} 
                name="startDate" 
                label={t('events.startDate')}
                placeholder={t('courses.pickDate')}
              />
            </div>

            <div>
              <CalendarFormField 
                control={control} 
                name="endDate" 
                label={t('events.endDate')}
                placeholder={t('courses.pickDate')}
              />
            </div>

            <div>
              <Label htmlFor="durationDays">{t('courses.durationDays')}</Label>
              <Input
                id="durationDays"
                type="number"
                min={1}
                placeholder={t('courses.durationDaysPlaceholder')}
                {...register('durationDays', { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="maxStudents">{t('courses.maxStudents')}</Label>
              <Input
                id="maxStudents"
                type="number"
                min={1}
                placeholder={t('courses.maxStudentsPlaceholder')}
                {...register('maxStudents', { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="feeAmount">{t('courses.feeAmount')}</Label>
              <Input
                id="feeAmount"
                type="number"
                min={0}
                step={0.01}
                placeholder={t('courses.feeAmountPlaceholder')}
                {...register('feeAmount', { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="status">{t('courses.status')}</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('courses.selectStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{t('courses.draft')}</SelectItem>
                      <SelectItem value="open">{t('courses.open')}</SelectItem>
                      <SelectItem value="closed">{t('courses.closed')}</SelectItem>
                      <SelectItem value="completed">{t('courses.completed')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
              {isEdit ? t('courses.updateCourse') : t('courses.createCourse')}
            </Button>
          </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
});

export default ShortTermCourseFormDialog;
