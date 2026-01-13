import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useLanguage } from '@/hooks/useLanguage';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { eventTypesApi, schoolsApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
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
  const { t } = useLanguage();
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
      showToast.success(t('toast.eventTypeCreated') || 'Event type created successfully');
      reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.eventTypeCreateFailed') || 'Failed to create event type');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateEventTypeFormData) =>
      eventTypesApi.update(eventType!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
      showToast.success(t('toast.eventTypeUpdated') || 'Event type updated successfully');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.eventTypeUpdateFailed') || 'Failed to update event type');
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
            {isEditing ? (t('events.eventTypes.editEventType') || 'Edit Event Type') : (t('events.eventTypes.createEventType') || 'Create Event Type')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('events.eventTypes.nameLabel') || 'Name *'}</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder={t('events.eventTypes.namePlaceholder') || 'e.g., Graduation Ceremony'}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="school_id">{t('events.eventTypes.schoolLabel') || 'School *'}</Label>
            <Select
              value={selectedSchoolId}
              onValueChange={(value) => setValue('school_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('events.eventTypes.selectSchool') || 'Select a school'} />
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
            <Label htmlFor="description">{t('events.eventTypes.descriptionLabel') || 'Description'}</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder={t('events.eventTypes.descriptionPlaceholder') || 'Optional description for this event type'}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">{t('events.eventTypes.activeLabel') || 'Active'}</Label>
              <p className="text-sm text-muted-foreground">
                {t('events.eventTypes.activeDescription') || 'Inactive event types cannot be used for new events'}
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
              {t('events.eventTypes.cancelButton') || 'Cancel'}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (t('events.eventTypes.saving') || 'Saving...') : isEditing ? (t('events.eventTypes.updateButton') || 'Update') : (t('events.eventTypes.createButton') || 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
