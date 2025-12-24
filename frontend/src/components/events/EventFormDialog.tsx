import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { formatDateForInput } from '@/lib/dateUtils';
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
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { showToast } from '@/lib/toast';
import { eventsApi, eventTypesApi, schoolsApi } from '@/lib/api/client';
import { createEventSchema, type CreateEventFormData } from '@/lib/validations/events';
import type { Event, EventStatus } from '@/types/events';
import { EVENT_STATUS_LABELS } from '@/types/events';
import { useHasPermission } from '@/hooks/usePermissions';

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
  schoolId?: string;
}

// Helper to parse datetime string to date and time
const parseDateTime = (datetimeStr: string | null | undefined) => {
  if (!datetimeStr) return { date: undefined, time: '' };
  const date = new Date(datetimeStr);
  if (isNaN(date.getTime())) return { date: undefined, time: '' };
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return { date, time: `${hours}:${minutes}` };
};

// Helper to combine date and time into datetime string
const combineDateTime = (date: Date | undefined, time: string): string | undefined => {
  if (!date || !time) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T${time}`;
};

export function EventFormDialog({
  open,
  onOpenChange,
  event,
  schoolId,
}: EventFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!event;
  const hasEventUpdatePermission = useHasPermission('events.update');

  const { data: schools } = useQuery({
    queryKey: ['schools'],
    queryFn: () => schoolsApi.list({}),
  });

  const { data: eventTypes } = useQuery({
    queryKey: ['event-types', schoolId || event?.school_id],
    queryFn: () => eventTypesApi.list({ school_id: schoolId || event?.school_id, is_active: true }),
    enabled: !!(schoolId || event?.school_id),
  });

  const startsDateTime = parseDateTime(event?.starts_at);
  const endsDateTime = parseDateTime(event?.ends_at);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateEventFormData & { starts_date?: Date; starts_time?: string; ends_date?: Date; ends_time?: string }>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: event?.title || '',
      school_id: event?.school_id || schoolId || '',
      event_type_id: event?.event_type_id || undefined,
      starts_date: startsDateTime.date,
      starts_time: startsDateTime.time || '09:00',
      ends_date: endsDateTime.date,
      ends_time: endsDateTime.time || '',
      venue: event?.venue || undefined,
      capacity: event?.capacity || undefined,
      status: event?.status || 'draft',
    },
  });

  const startsDate = watch('starts_date');
  const startsTime = watch('starts_time');
  const endsDate = watch('ends_date');
  const endsTime = watch('ends_time');

  // Update starts_at when date or time changes
  React.useEffect(() => {
    const datetime = combineDateTime(startsDate, startsTime || '09:00');
    if (datetime) {
      setValue('starts_at', datetime);
    }
  }, [startsDate, startsTime, setValue]);

  // Update ends_at when date or time changes
  React.useEffect(() => {
    const datetime = combineDateTime(endsDate, endsTime || '17:00');
    if (datetime) {
      setValue('ends_at', datetime);
    } else {
      setValue('ends_at', undefined);
    }
  }, [endsDate, endsTime, setValue]);

  const selectedSchoolId = watch('school_id');

  const createMutation = useMutation({
    mutationFn: (data: CreateEventFormData) => eventsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showToast.success('toast.eventCreated');
      reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.eventCreateFailed');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateEventFormData) => eventsApi.update(event!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', event!.id] });
      showToast.success('toast.eventUpdated');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.eventUpdateFailed');
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
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Start Date & Time *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Controller
                  name="starts_date"
                  control={control}
                  render={({ field }) => (
                    <CalendarDatePicker
                      date={field.value}
                      onDateChange={(date) => {
                        field.onChange(date);
                      }}
                      placeholder="Select date"
                    />
                  )}
                />
                <Controller
                  name="starts_time"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="time"
                      value={field.value || '09:00'}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                      }}
                    />
                  )}
                />
              </div>
              {errors.starts_at && (
                <p className="text-sm text-destructive">{errors.starts_at.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ends_at">End Date & Time</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Controller
                  name="ends_date"
                  control={control}
                  render={({ field }) => (
                    <CalendarDatePicker
                      date={field.value}
                      onDateChange={(date) => {
                        field.onChange(date);
                      }}
                      placeholder="Select date"
                      minDate={startsDate}
                    />
                  )}
                />
                <Controller
                  name="ends_time"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="time"
                      value={field.value || ''}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                      }}
                    />
                  )}
                />
              </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                {...register('capacity', { valueAsNumber: true })}
                placeholder="Maximum guests"
              />
            </div>

            {/* Status field - Only show if user has events.update permission */}
            {hasEventUpdatePermission && (
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
            )}
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
