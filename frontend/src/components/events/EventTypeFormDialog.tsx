import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { eventTypesApi, schoolsApi } from '@/lib/api/client';
import { createEventTypeSchema, type CreateEventTypeFormData } from '@/lib/validations/events';
import type { EventType } from '@/types/events';

interface EventTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventType?: EventType | null;
  schoolId?: string;
}

export function EventTypeFormDialog({
  open,
  onOpenChange,
  eventType,
  schoolId,
}: EventTypeFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!eventType;

  const { data: schools } = useQuery({
    queryKey: ['schools'],
    queryFn: () => schoolsApi.list({}),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateEventTypeFormData>({
    resolver: zodResolver(createEventTypeSchema),
    defaultValues: {
      name: eventType?.name || '',
      description: eventType?.description || '',
      school_id: eventType?.school_id || schoolId || '',
      is_active: eventType?.is_active ?? true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateEventTypeFormData) => eventTypesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
      toast.success('Event type created successfully');
      reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create event type');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateEventTypeFormData) =>
      eventTypesApi.update(eventType!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
      toast.success('Event type updated successfully');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update event type');
    },
  });

  const onSubmit = (data: CreateEventTypeFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const selectedSchoolId = watch('school_id');
  const isActive = watch('is_active');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Event Type' : 'Create Event Type'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Graduation Ceremony"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="school_id">School *</Label>
            <Select
              value={selectedSchoolId}
              onValueChange={(value) => setValue('school_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a school" />
              </SelectTrigger>
              <SelectContent>
                {schools?.map((school: any) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.school_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.school_id && (
              <p className="text-sm text-destructive">{errors.school_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Optional description for this event type"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Active</Label>
              <p className="text-sm text-muted-foreground">
                Inactive event types cannot be used for new events
              </p>
            </div>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setValue('is_active', checked)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
