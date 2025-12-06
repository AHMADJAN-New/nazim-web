import { useEffect, memo } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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
  const isEdit = !!course;
  const createMutation = useCreateShortTermCourse();
  const updateMutation = useUpdateShortTermCourse();

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<CourseFormValues>({
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
          <DialogTitle>{isEdit ? 'Edit Course' : 'Create Course'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the course details below.' : 'Fill in the details to create a new short-term course.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">Course Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Advanced Web Development"
                {...register('name', { required: 'Course name is required' })}
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the course..."
                {...register('description')}
              />
            </div>

            <div>
              <Label htmlFor="instructorName">Instructor Name</Label>
              <Input
                id="instructorName"
                placeholder="e.g., Ahmad Khan"
                {...register('instructorName')}
              />
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Room 101"
                {...register('location')}
              />
            </div>

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate')}
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                {...register('endDate')}
              />
            </div>

            <div>
              <Label htmlFor="durationDays">Duration (days)</Label>
              <Input
                id="durationDays"
                type="number"
                min={1}
                placeholder="e.g., 30"
                {...register('durationDays', { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="maxStudents">Max Students</Label>
              <Input
                id="maxStudents"
                type="number"
                min={1}
                placeholder="e.g., 25"
                {...register('maxStudents', { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="feeAmount">Fee Amount</Label>
              <Input
                id="feeAmount"
                type="number"
                min={0}
                step={0.01}
                placeholder="e.g., 5000"
                {...register('feeAmount', { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
              {isEdit ? 'Update Course' : 'Create Course'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

export default ShortTermCourseFormDialog;
