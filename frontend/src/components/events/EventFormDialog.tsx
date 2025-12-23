import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { eventsApi, eventTypesApi, schoolsApi } from '@/lib/api/client';
import { createEventSchema, type CreateEventFormData } from '@/lib/validations/events';
import type { Event, EventStatus } from '@/types/events';
import { EVENT_STATUS_LABELS } from '@/types/events';

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
  schoolId?: string;
}

export function EventFormDialog({
  open,
  onOpenChange,
  event,
  schoolId,
}: EventFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!event;

  const { data: schools } = useQuery({
    queryKey: ['schools'],
    queryFn: () => schoolsApi.list({}),
  });

  const { data: eventTypes } = useQuery({
    queryKey: ['event-types', schoolId || event?.school_id],
    queryFn: () => eventTypesApi.list({ school_id: schoolId || event?.school_id, is_active: true }),
    enabled: !!(schoolId || event?.school_id),
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: event?.title || '',
      school_id: event?.school_id || schoolId || '',
      event_type_id: event?.event_type_id || undefined,
      starts_at: event?.starts_at
        ? format(new Date(event.starts_at), "yyyy-MM-dd'T'HH:mm")
        : '',
      ends_at: event?.ends_at
        ? format(new Date(event.ends_at), "yyyy-MM-dd'T'HH:mm")
        : undefined,
      venue: event?.venue || undefined,
      capacity: event?.capacity || undefined,
      status: event?.status || 'draft',
    },
  });

  const selectedSchoolId = watch('school_id');

  const createMutation = useMutation({
    mutationFn: (data: CreateEventFormData) => eventsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event created successfully');
      reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create event');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateEventFormData) => eventsApi.update(event!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', event!.id] });
      toast.success('Event updated successfully');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update event');
    },
  });

  const onSubmit = (data: CreateEventFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Event' : 'Create Event'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="e.g., Annual Graduation Ceremony 2024"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="school_id">School *</Label>
              <Controller
                name="school_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
                )}
              />
              {errors.school_id && (
                <p className="text-sm text-destructive">{errors.school_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_type_id">Event Type</Label>
              <Controller
                name="event_type_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || 'none'}
                    onValueChange={(val) => field.onChange(val === 'none' ? undefined : val)}
                    disabled={!selectedSchoolId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No type</SelectItem>
                      {eventTypes?.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Start Date & Time *</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                {...register('starts_at')}
              />
              {errors.starts_at && (
                <p className="text-sm text-destructive">{errors.starts_at.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ends_at">End Date & Time</Label>
              <Input
                id="ends_at"
                type="datetime-local"
                {...register('ends_at')}
              />
              {errors.ends_at && (
                <p className="text-sm text-destructive">{errors.ends_at.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              {...register('venue')}
              placeholder="e.g., Main Auditorium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                {...register('capacity', { valueAsNumber: true })}
                placeholder="Maximum guests"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(EVENT_STATUS_LABELS) as EventStatus[]).map((status) => (
                        <SelectItem key={status} value={status}>
                          {EVENT_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
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
