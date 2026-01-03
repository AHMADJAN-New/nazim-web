import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Camera, UserPlus, Check, Plus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { eventsApi, eventGuestsApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { createGuestSchema, quickAddGuestSchema, type CreateGuestFormData, type QuickAddGuestFormData } from '@/lib/validations/events';
import type { EventGuest, GuestType, EventTypeField, EventTypeFieldGroup } from '@/types/events';
import { GUEST_TYPE_LABELS } from '@/types/events';


// QR Code generation fallback for browser compatibility
async function generateQRCodeImage(data: string, size: number = 200): Promise<string> {
  try {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
    const response = await fetch(qrUrl);
    if (!response.ok) throw new Error('Failed to generate QR code');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[GuestFormMobile] QR code generation failed:', error);
    }
    throw error;
  }
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    const imageLoaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Unable to decode HEIC image'));
    });
    img.src = objectUrl;
    await imageLoaded;

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context is not available');
    }
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    );
    if (!blob) {
      throw new Error('Failed to convert HEIC image');
    }

    const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([blob], newName, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function compressImageFile(
  file: File,
  options: { maxDimension: number; quality: number; outputType: 'image/jpeg' | 'image/webp' }
): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    const imageLoaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Unable to decode image'));
    });
    img.src = objectUrl;
    await imageLoaded;

    const maxSide = Math.max(img.width, img.height);
    const scale = maxSide > options.maxDimension ? options.maxDimension / maxSide : 1;
    const targetWidth = Math.max(1, Math.round(img.width * scale));
    const targetHeight = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return file;
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, options.outputType, options.quality)
    );
    if (!blob) {
      return file;
    }

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const extension = options.outputType === 'image/webp' ? 'webp' : 'jpg';
    return new File([blob], `${baseName}.${extension}`, { type: options.outputType });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
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

  // Expand all groups by default when field groups are loaded
  useEffect(() => {
    if (fieldGroups.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(fieldGroups.map(g => g.id)));
    }
  }, [fieldGroups, expandedGroups.size]);
  
  // Fetch guest photo if editing and guest has photo_path
  useEffect(() => {
    if (isEditing && guest?.id) {
      let currentBlobUrl: string | null = null;

      // Fetch photo via API endpoint
      const fetchPhoto = async () => {
        try {
          const { apiClient } = await import('@/lib/api/client');
          const { blob } = await apiClient.requestFile(`/guests/${guest.id}/photo`, {
            method: 'GET',
            headers: { Accept: 'image/*' },
          });
          const blobUrl = URL.createObjectURL(blob);
          currentBlobUrl = blobUrl;
          setPhotoPreview(blobUrl);
        } catch (error: any) {
          const status = error?.status;
          if (status !== 404 && import.meta.env.DEV) {
            console.error('Error fetching guest photo:', error);
          }
        }
      };

      fetchPhoto();

      return () => {
        if (currentBlobUrl) {
          URL.revokeObjectURL(currentBlobUrl);
        }
      };
    }
  }, [isEditing, guest?.id]);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [useQrImageFallback, setUseQrImageFallback] = useState(false);
  
  // Detect Opera browser and use image fallback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent;
      const isOpera = (
        userAgent.indexOf('OPR') > -1 ||
        userAgent.indexOf('Opera') > -1 ||
        (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('OPR') > -1) ||
        userAgent.indexOf('Opera/') > -1
      );
      setUseQrImageFallback(isOpera);
    }
  }, []);

  const schema = quickMode ? quickAddGuestSchema : createGuestSchema;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    getValues,
    reset,
    formState: { errors },
  } = useForm<CreateGuestFormData | QuickAddGuestFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: guest?.full_name || '',
      phone: guest?.phone || '',
      guest_type: guest?.guest_type || 'external',
      invite_count: guest?.invite_count || 1,
      field_values: guest?.field_values?.map(fv => ({
        field_id: fv.field_id,
        value: fv.value,
      })) || [],
    },
  });

  // Initialize field values when editing a guest
  useEffect(() => {
    if (guest?.field_values && fields.length > 0) {
      // Set each field value individually using React Hook Form's nested path
      guest.field_values.forEach(fv => {
        if (fv.field_id) {
          setValue(`field_values.${fv.field_id}` as any, fv.value || '');
        }
      });
    }
  }, [guest, fields, setValue]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateGuestFormData) => {
      const newGuest = await eventGuestsApi.create(eventId, data);

      // Upload photo if provided - do this synchronously to ensure it completes
      if (photoFile && newGuest.id) {
        try {
          // Validate file again before upload (in case it changed)
          if (!photoFile || photoFile.size === 0) {
            throw new Error('Invalid file selected');
          }
          
          if (import.meta.env.DEV) {
            console.log('Uploading photo for guest:', {
              guestId: newGuest.id,
              fileName: photoFile.name,
              fileSize: photoFile.size,
              fileType: photoFile.type,
            });
          }
          
          const uploadResult = await eventGuestsApi.uploadPhoto(newGuest.id, photoFile);
          
          if (import.meta.env.DEV) {
            console.log('Photo upload successful:', uploadResult);
          }
          
          // Photo uploaded successfully - will be fetched via API endpoint when displaying
        } catch (e: any) {
          const errorMessage = e?.message || 'Failed to upload photo';
          if (import.meta.env.DEV) {
            console.error('Photo upload failed:', e);
            console.error('File details:', {
              name: photoFile?.name,
              size: photoFile?.size,
              type: photoFile?.type,
            });
            console.error('Guest ID:', newGuest.id);
          }
          // Show error to user but don't fail the entire guest creation
          showToast.error(errorMessage);
          // Log for debugging
          if (import.meta.env.DEV) {
            console.warn('Guest created but photo upload failed:', newGuest.id);
          }
        }
      }

      // Return guest - photo will be fetched via API endpoint when needed
      return newGuest as EventGuest;
    },
    onSuccess: (newGuest) => {
      queryClient.invalidateQueries({ queryKey: ['event-guests', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      showToast.success('toast.guestAdded');
      setShowSuccess(newGuest);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.guestAddFailed');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CreateGuestFormData) => {
      const updated = await eventGuestsApi.update(eventId, guest!.id, data);

      // Upload photo if provided
      if (photoFile) {
        try {
          // Validate file before upload
          if (!photoFile || photoFile.size === 0) {
            throw new Error('Invalid file selected');
          }
          
          await eventGuestsApi.uploadPhoto(guest!.id, photoFile);
        } catch (e: any) {
          const errorMessage = e?.message || 'Failed to upload photo';
          if (import.meta.env.DEV) {
            console.error('Photo upload failed:', e);
            console.error('File details:', {
              name: photoFile?.name,
              size: photoFile?.size,
              type: photoFile?.type,
            });
          }
          showToast.error(errorMessage);
        }
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-guests', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-guest', eventId, guest!.id] });
      showToast.success('toast.guestUpdated');
      onBack?.() || navigate(-1);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.guestUpdateFailed');
    },
  });

  const onSubmit = (data: CreateGuestFormData | QuickAddGuestFormData) => {
    // Get all form values including field_values
    const allValues = getValues();
    
    // Transform field_values from object format to array format for API
    // React Hook Form stores nested values as { field_values: { [fieldId]: value } }
    const fieldValuesObj = (allValues as any).field_values || {};
    const fieldValuesArray = fields
      .filter(f => f.is_enabled)
      .map(field => {
        // Access field value from nested object structure
        const fieldValue = fieldValuesObj[field.id];
        
        // Skip undefined, null, or empty string values
        if (fieldValue === undefined || fieldValue === null) {
          return null;
        }
        
        // For string values, skip empty strings
        if (typeof fieldValue === 'string' && fieldValue.trim() === '') {
          return null;
        }
        
        // For arrays, skip empty arrays
        if (Array.isArray(fieldValue) && fieldValue.length === 0) {
          return null;
        }
        
        // Handle boolean values (for toggle fields) - convert to string
        if (typeof fieldValue === 'boolean') {
          return {
            field_id: field.id,
            value: fieldValue ? 'true' : 'false',
          };
        }
        
        return {
          field_id: field.id,
          value: fieldValue,
        };
      })
      .filter((fv): fv is { field_id: string; value: string | string[] | null } => fv !== null);

    const submitData: CreateGuestFormData = {
      ...data,
      field_values: fieldValuesArray.length > 0 ? fieldValuesArray : undefined,
    };

    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type for Android Chrome compatibility
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
      const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(file.type) && !(fileExtension && validExtensions.includes(fileExtension))) {
        if (import.meta.env.DEV) {
          console.error('Invalid file type:', file.type, fileExtension);
        }
        showToast.error('Please select a valid image file (JPG, PNG, WEBP, or HEIC)');
        // Reset input
        e.target.value = '';
        return;
      }
      
      let normalizedFile = file;
      const isHeic =
        file.type === 'image/heic' ||
        file.type === 'image/heif' ||
        fileExtension === 'heic' ||
        fileExtension === 'heif';

      if (isHeic) {
        try {
          normalizedFile = await convertHeicToJpeg(file);
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Failed to convert HEIC image:', error);
          }
          showToast.error('Unable to process this photo. Please try a JPG or PNG image.');
          e.target.value = '';
          return;
        }
      }

      const compressedFile = await compressImageFile(normalizedFile, {
        maxDimension: 1280,
        quality: 0.8,
        outputType: 'image/jpeg',
      });

      const maxUploadBytes = 1.8 * 1024 * 1024; // ~1.8MB to stay under server 2MB limit
      if (compressedFile.size > maxUploadBytes) {
        showToast.error('Image is too large. Please choose a smaller photo.');
        e.target.value = '';
        return;
      }

      setPhotoFile(compressedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Revoke old blob URL if it exists
        if (photoPreview && photoPreview.startsWith('blob:')) {
          URL.revokeObjectURL(photoPreview);
        }
        setPhotoPreview(result);
      };
      reader.onerror = () => {
        if (import.meta.env.DEV) {
          console.error('Error reading file:', reader.error);
        }
        showToast.error('Error reading image file. Please try again.');
        e.target.value = '';
      };
      reader.readAsDataURL(compressedFile);
    }
  };

  const handleAddAnother = () => {
    reset();
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowSuccess(null);
  };

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      navigate(`/events/${eventId}/guests`);
    }
  }, [onBack, navigate, eventId]);

  // Generate QR code image as fallback for browser compatibility
  useEffect(() => {
    if (showSuccess?.qr_token && useQrImageFallback) {
      generateQRCodeImage(showSuccess.qr_token, 200)
        .then(setQrCodeImage)
        .catch((error) => {
          if (import.meta.env.DEV) {
            console.error('[GuestFormMobile] Failed to generate QR code image:', error);
          }
        });
    } else {
      setQrCodeImage(null);
    }
  }, [showSuccess?.qr_token, useQrImageFallback]);

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
            
            {/* Guest Photo */}
            <GuestPhotoAvatar guestId={showSuccess.id} guestName={showSuccess.full_name} size="lg" />
            
            <p className="text-muted-foreground mb-4 font-medium">{showSuccess.full_name}</p>

            {showSuccess.qr_token ? (
              <div className="bg-white p-4 rounded-lg mb-4 flex justify-center items-center w-full">
                {useQrImageFallback ? (
                  qrCodeImage ? (
                    <img
                      src={qrCodeImage}
                      alt="QR Code"
                      className="w-[200px] h-[200px]"
                      onError={() => {
                        if (import.meta.env.DEV) {
                          console.error('[GuestFormMobile] QR code image failed to load');
                        }
                      }}
                    />
                  ) : (
                    <div className="w-[200px] h-[200px] flex items-center justify-center text-muted-foreground">
                      Loading QR code...
                    </div>
                  )
                ) : (
                  <QRCodeSVG
                    value={showSuccess.qr_token}
                    size={200}
                    level="H"
                    includeMargin
                  />
                )}
              </div>
            ) : (
              <div className="bg-muted p-4 rounded-lg mb-4 text-muted-foreground">
                QR code will be generated...
              </div>
            )}

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
        <Button 
          variant="ghost" 
          size="icon" 
          type="button"
          onClick={handleBack}
        >
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

// Helper component to fetch and display guest photo
function GuestPhotoAvatar({ guestId, guestName, size = 'default' }: { guestId: string; guestName: string; size?: 'default' | 'lg' }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let currentBlobUrl: string | null = null;

    const fetchPhoto = async () => {
      try {
        const { apiClient } = await import('@/lib/api/client');
        const { blob } = await apiClient.requestFile(`/guests/${guestId}/photo`, {
          method: 'GET',
          headers: { Accept: 'image/*' },
        });
        const blobUrl = URL.createObjectURL(blob);
        currentBlobUrl = blobUrl;
        setPhotoUrl(blobUrl);
      } catch (error: any) {
        const status = error?.status;
        if (status === 404) {
          setPhotoUrl(null);
        } else if (import.meta.env.DEV) {
          console.warn('Failed to fetch guest photo:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhoto();
    
    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [guestId]);

  if (isLoading || !photoUrl) {
    return null; // Don't show anything if no photo
  }

  return (
    <div className="mb-4 flex justify-center">
      <Avatar className={size === 'lg' ? 'h-20 w-20' : 'h-12 w-12'}>
        <AvatarImage src={photoUrl} alt={guestName} />
        <AvatarFallback className="bg-muted">
          <UserPlus className={size === 'lg' ? 'h-8 w-8' : 'h-6 w-6'} />
        </AvatarFallback>
      </Avatar>
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
  const fieldName = `field_values.${field.id}` as const;

  // Get default value from existing guest data if editing
  const defaultValue = field.field_type === 'toggle' ? false : '';

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
          <Controller
            name={fieldName}
            control={control}
            defaultValue={defaultValue}
            render={({ field: formField }) => (
              <Input
                type={field.field_type === 'email' ? 'email' : field.field_type === 'phone' ? 'tel' : 'text'}
                placeholder={field.placeholder || undefined}
                className={baseInputClass}
                {...formField}
              />
            )}
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
          <Controller
            name={fieldName}
            control={control}
            defaultValue={defaultValue}
            render={({ field: formField }) => (
              <Textarea
                placeholder={field.placeholder || undefined}
                rows={3}
                {...formField}
              />
            )}
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
          <Controller
            name={fieldName}
            control={control}
            defaultValue={defaultValue}
            render={({ field: formField }) => (
              <Input
                type="number"
                placeholder={field.placeholder || undefined}
                className={baseInputClass}
                {...formField}
                value={formField.value || ''}
                onChange={(e) => formField.onChange(e.target.value ? Number(e.target.value) : null)}
              />
            )}
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
          <Controller
            name={fieldName}
            control={control}
            defaultValue={defaultValue}
            render={({ field: formField }) => (
              <Input
                type="date"
                className={baseInputClass}
                {...formField}
                value={formField.value || ''}
              />
            )}
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
          <Controller
            name={fieldName}
            control={control}
            defaultValue={defaultValue}
            render={({ field: formField }) => (
              <Select value={formField.value || ''} onValueChange={formField.onChange}>
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
            )}
          />
        </div>
      );

    case 'multiselect':
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.is_required && ' *'}
          </Label>
          <Controller
            name={fieldName}
            control={control}
            defaultValue={[]}
            render={({ field: formField }) => (
              <Select
                value={Array.isArray(formField.value) ? formField.value.join(',') : ''}
                onValueChange={(value) => {
                  const values = value ? value.split(',').filter(v => v) : [];
                  formField.onChange(values);
                }}
              >
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
            )}
          />
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
          <Controller
            name={fieldName}
            control={control}
            defaultValue={false}
            render={({ field: formField }) => (
              <Switch
                checked={formField.value || false}
                onCheckedChange={formField.onChange}
              />
            )}
          />
        </div>
      );

    default:
      return null;
  }
}
