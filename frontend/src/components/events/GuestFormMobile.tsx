import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, UserPlus, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { eventsApi, eventGuestsApi } from '@/lib/api/client';
import { createGuestSchema, quickAddGuestSchema, type CreateGuestFormData, type QuickAddGuestFormData } from '@/lib/validations/events';
import type { EventGuest, GuestType, EventTypeField, EventTypeFieldGroup } from '@/types/events';
import { GUEST_TYPE_LABELS } from '@/types/events';
import { QRCodeSVG } from 'qrcode.react';

interface GuestFormMobileProps {
  eventId: string;
  guest?: EventGuest;
  onBack?: () => void;
  quickMode?: boolean;
}

export function GuestFormMobile({ eventId, guest, onBack, quickMode = false }: GuestFormMobileProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!guest;
  const [showSuccess, setShowSuccess] = useState<EventGuest | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(guest?.photo_url || null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Fetch event with fields
  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.get(eventId),
  });

  const fields = event?.event_type?.fields || [];
  const fieldGroups = event?.event_type?.field_groups || [];

  // Group fields
  const groupedFields = fieldGroups.map(group => ({
    ...group,
    fields: fields.filter(f => f.field_group_id === group.id && f.is_enabled),
  }));
  const ungroupedFields = fields.filter(f => !f.field_group_id && f.is_enabled);

  const schema = quickMode ? quickAddGuestSchema : createGuestSchema;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateGuestFormData | QuickAddGuestFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: guest?.full_name || '',
      phone: guest?.phone || '',
      guest_type: guest?.guest_type || 'external',
      invite_count: guest?.invite_count || 1,
      field_values: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateGuestFormData) => {
      const newGuest = await eventGuestsApi.create(eventId, data);

      // Upload photo if provided
      if (photoFile && newGuest.id) {
        try {
          await eventGuestsApi.uploadPhoto(newGuest.id, photoFile);
        } catch (e) {
          console.error('Photo upload failed:', e);
        }
      }

      return newGuest;
    },
    onSuccess: (newGuest) => {
      queryClient.invalidateQueries({ queryKey: ['event-guests', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      toast.success('Guest added successfully');
      setShowSuccess(newGuest as EventGuest);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add guest');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CreateGuestFormData) => {
      const updated = await eventGuestsApi.update(eventId, guest!.id, data);

      // Upload photo if provided
      if (photoFile) {
        try {
          await eventGuestsApi.uploadPhoto(guest!.id, photoFile);
        } catch (e) {
          console.error('Photo upload failed:', e);
        }
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-guests', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-guest', eventId, guest!.id] });
      toast.success('Guest updated successfully');
      onBack?.() || navigate(-1);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update guest');
    },
  });

  const onSubmit = (data: CreateGuestFormData | QuickAddGuestFormData) => {
    if (isEditing) {
      updateMutation.mutate(data as CreateGuestFormData);
    } else {
      createMutation.mutate(data as CreateGuestFormData);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddAnother = () => {
    reset();
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowSuccess(null);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Success screen
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Guest Added!</h2>
            <p className="text-muted-foreground mb-4">{showSuccess.full_name}</p>

            <div className="bg-white p-4 rounded-lg inline-block mb-4">
              <QRCodeSVG
                value={showSuccess.qr_token}
                size={200}
                level="H"
                includeMargin
              />
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Code: <span className="font-mono font-medium">{showSuccess.guest_code}</span>
            </p>

            <div className="flex flex-col gap-2">
              <Button onClick={handleAddAnother} className="w-full" size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Add Another Guest
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/events/${eventId}/guests`)}
                className="w-full"
              >
                View All Guests
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => onBack?.() || navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">
          {isEditing ? 'Edit Guest' : quickMode ? 'Quick Add' : 'Add Guest'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 pb-24 space-y-6">
        {/* Photo */}
        <div className="flex flex-col items-center">
          <label htmlFor="photo" className="cursor-pointer">
            <Avatar className="h-24 w-24">
              <AvatarImage src={photoPreview || undefined} />
              <AvatarFallback className="bg-muted">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          </label>
          <input
            id="photo"
            type="file"
            accept="image/*"
            capture="user"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <p className="text-sm text-muted-foreground mt-2">Tap to add photo</p>
        </div>

        {/* Basic Info - Always visible */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                {...register('full_name')}
                placeholder="Enter full name"
                autoComplete="name"
                className="text-lg py-6"
              />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                placeholder="07xxxxxxxx"
                autoComplete="tel"
                className="text-lg py-6"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Guest Type</Label>
                <Controller
                  name="guest_type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(GUEST_TYPE_LABELS) as GuestType[]).map((type) => (
                          <SelectItem key={type} value={type}>
                            {GUEST_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite_count">Invite Count</Label>
                <Input
                  id="invite_count"
                  type="number"
                  min={1}
                  max={100}
                  {...register('invite_count', { valueAsNumber: true })}
                  className="h-12 text-lg"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Fields Groups */}
        {!quickMode && groupedFields.map((group) => (
          group.fields.length > 0 && (
            <Collapsible
              key={group.id}
              open={expandedGroups.has(group.id)}
              onOpenChange={(open) => {
                setExpandedGroups(prev => {
                  const next = new Set(prev);
                  if (open) next.add(group.id);
                  else next.delete(group.id);
                  return next;
                });
              }}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{group.title}</CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {expandedGroups.has(group.id) ? 'Collapse' : 'Expand'}
                      </span>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    {group.fields.map((field) => (
                      <DynamicField key={field.id} field={field} control={control} register={register} />
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )
        ))}

        {/* Ungrouped Fields */}
        {!quickMode && ungroupedFields.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ungroupedFields.map((field) => (
                <DynamicField key={field.id} field={field} control={control} register={register} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Submit Button - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-lg"
            disabled={isPending}
          >
            {isPending ? (
              'Saving...'
            ) : isEditing ? (
              'Update Guest'
            ) : (
              <>
                <UserPlus className="h-5 w-5 mr-2" />
                Add Guest
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

interface DynamicFieldProps {
  field: EventTypeField;
  control: any;
  register: any;
}

function DynamicField({ field, control, register }: DynamicFieldProps) {
  const baseInputClass = "h-12 text-base";

  switch (field.field_type) {
    case 'text':
    case 'phone':
    case 'email':
    case 'id_number':
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.is_required && ' *'}
          </Label>
          <Input
            type={field.field_type === 'email' ? 'email' : field.field_type === 'phone' ? 'tel' : 'text'}
            placeholder={field.placeholder || undefined}
            className={baseInputClass}
          />
          {field.help_text && (
            <p className="text-sm text-muted-foreground">{field.help_text}</p>
          )}
        </div>
      );

    case 'textarea':
    case 'address':
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.is_required && ' *'}
          </Label>
          <Textarea
            placeholder={field.placeholder || undefined}
            rows={3}
          />
          {field.help_text && (
            <p className="text-sm text-muted-foreground">{field.help_text}</p>
          )}
        </div>
      );

    case 'number':
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.is_required && ' *'}
          </Label>
          <Input
            type="number"
            placeholder={field.placeholder || undefined}
            className={baseInputClass}
          />
        </div>
      );

    case 'date':
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.is_required && ' *'}
          </Label>
          <Input
            type="date"
            className={baseInputClass}
          />
        </div>
      );

    case 'select':
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.is_required && ' *'}
          </Label>
          <Select>
            <SelectTrigger className="h-12">
              <SelectValue placeholder={field.placeholder || 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'toggle':
      return (
        <div className="flex items-center justify-between">
          <div>
            <Label>{field.label}</Label>
            {field.help_text && (
              <p className="text-sm text-muted-foreground">{field.help_text}</p>
            )}
          </div>
          <Switch />
        </div>
      );

    default:
      return null;
  }
}
