import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Image as ImageIcon, Type } from 'lucide-react';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/ui/loading';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { useWatermarks, useCreateWatermark, useUpdateWatermark, useDeleteWatermark, type Watermark, type CreateWatermarkData } from '@/hooks/useWatermarks';

const watermarkSchema = z.object({
  report_key: z.string().max(100).optional().nullable(),
  wm_type: z.enum(['text', 'image']),
  text: z.string().max(500).optional().nullable(),
  font_family: z.string().max(100).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  opacity: z.number().min(0).max(1).optional(),
  rotation_deg: z.number().min(-360).max(360).optional(),
  scale: z.number().min(0.1).max(5).optional(),
  position: z.enum(['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).optional(),
  pos_x: z.number().min(0).max(100).optional(),
  pos_y: z.number().min(0).max(100).optional(),
  repeat_pattern: z.enum(['none', 'repeat', 'repeat-x', 'repeat-y']).optional(),
  sort_order: z.number().optional(),
  is_active: z.boolean().optional(),
});

type WatermarkFormData = z.infer<typeof watermarkSchema>;

interface WatermarkManagementProps {
  brandingId: string;
  brandingName: string;
}

export function WatermarkManagement({ brandingId, brandingName }: WatermarkManagementProps) {
  const { t } = useLanguage();
  const hasCreatePermission = useHasPermission('school_branding.update');
  const hasUpdatePermission = useHasPermission('school_branding.update');
  const hasDeletePermission = useHasPermission('school_branding.delete');
  
  const { data: watermarks, isLoading } = useWatermarks(brandingId);
  const createWatermark = useCreateWatermark();
  const updateWatermark = useUpdateWatermark();
  const deleteWatermark = useDeleteWatermark();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWatermark, setSelectedWatermark] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImagePreview, setExistingImagePreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WatermarkFormData>({
    resolver: zodResolver(watermarkSchema),
    defaultValues: {
      wm_type: 'text',
      text: '',
      font_family: null,
      color: '#000000',
      opacity: 0.08,
      rotation_deg: 35,
      scale: 1.0,
      position: 'center',
      pos_x: 50.0,
      pos_y: 50.0,
      repeat_pattern: 'none',
      sort_order: 0,
      is_active: true,
      report_key: null,
    },
  });

  const watermarkType = watch('wm_type');

  const handleOpenDialog = (watermarkId?: string) => {
    if (watermarkId) {
      const watermark = watermarks?.find((w) => w.id === watermarkId);
      if (watermark) {
        reset({
          report_key: watermark.reportKey,
          wm_type: watermark.type,
          text: watermark.text || '',
          font_family: watermark.fontFamily || null,
          color: watermark.color,
          opacity: watermark.opacity,
          rotation_deg: watermark.rotationDeg,
          scale: watermark.scale,
          position: watermark.position,
          pos_x: watermark.posX,
          pos_y: watermark.posY,
          repeat_pattern: watermark.repeatPattern,
          sort_order: watermark.sortOrder,
          is_active: watermark.isActive,
        });
        if (watermark.type === 'image' && watermark.imageDataUri) {
          setExistingImagePreview(watermark.imageDataUri);
        }
        setSelectedWatermark(watermarkId);
      }
    } else {
      reset({
        wm_type: 'text',
        text: '',
        font_family: null,
        color: '#000000',
        opacity: 0.08,
        rotation_deg: 35,
        scale: 1.0,
        position: 'center',
        pos_x: 50.0,
        pos_y: 50.0,
        repeat_pattern: 'none',
        sort_order: 0,
        is_active: true,
        report_key: null,
      });
      setSelectedWatermark(null);
      setExistingImagePreview(null);
    }
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedWatermark(null);
    setImageFile(null);
    setExistingImagePreview(null);
    reset();
  };

  const convertFileToBase64 = async (file: File): Promise<string | null> => {
    if (!file) return null;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          let binaryString = '';
          const chunkSize = 8192;
          for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.slice(i, i + chunkSize);
            binaryString += String.fromCharCode(...chunk);
          }
          const base64 = btoa(binaryString);
          resolve(base64);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const onSubmit = async (data: WatermarkFormData) => {
    try {
      const watermarkData: CreateWatermarkData = {
        brandingId,
        reportKey: data.report_key || null,
        type: data.wm_type,
        text: data.text || null,
        fontFamily: data.font_family || null,
        color: data.color || '#000000',
        opacity: data.opacity ?? 0.08,
        rotationDeg: data.rotation_deg ?? 35,
        scale: data.scale ?? 1.0,
        position: data.position || 'center',
        posX: data.pos_x ?? 50.0,
        posY: data.pos_y ?? 50.0,
        repeatPattern: data.repeat_pattern || 'none',
        sortOrder: data.sort_order ?? 0,
        isActive: data.is_active ?? true,
      };

      if (data.wm_type === 'image') {
        if (imageFile) {
          const base64 = await convertFileToBase64(imageFile);
          if (base64) {
            watermarkData.imageBinary = base64;
            watermarkData.imageMime = imageFile.type;
          }
        } else if (existingImagePreview && selectedWatermark) {
          // Keep existing image - don't send image fields
        } else {
          throw new Error('Image is required for image watermarks');
        }
      }

      if (selectedWatermark) {
        updateWatermark.mutate(
          {
            id: selectedWatermark,
            ...watermarkData,
          },
          {
            onSuccess: () => {
              handleCloseDialog();
            },
          }
        );
      } else {
        createWatermark.mutate(watermarkData, {
          onSuccess: () => {
            handleCloseDialog();
          },
        });
      }
    } catch (error) {
      console.error('Error submitting watermark:', error);
    }
  };

  const handleDeleteClick = (watermarkId: string) => {
    setSelectedWatermark(watermarkId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedWatermark) {
      deleteWatermark.mutate(
        {
          id: selectedWatermark,
          brandingId,
        },
        {
          onSuccess: () => {
            setIsDeleteDialogOpen(false);
            setSelectedWatermark(null);
          },
        }
      );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('watermark.title') || 'Watermarks'}</CardTitle>
            <CardDescription>
              {t('watermark.subtitle') || `Manage watermarks for ${brandingName}`}
            </CardDescription>
          </div>
          {hasCreatePermission && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              {t('watermarks.addWatermark') || 'Add Watermark'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!watermarks || watermarks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t('watermarks.noWatermarks') || 'No watermarks found'}</p>
            {hasCreatePermission && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => handleOpenDialog()}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('watermarks.addFirstWatermark') || 'Add Your First Watermark'}
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('events.type') || 'Type'}</TableHead>
                  <TableHead>{t('watermarks.content') || 'Content'}</TableHead>
                  <TableHead>{t('watermarks.reportKey') || 'Report'}</TableHead>
                  <TableHead>{t('search.position') || 'Position'}</TableHead>
                  <TableHead>{t('events.status') || 'Status'}</TableHead>
                  <TableHead className="text-right">{t('events.actions') || 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {watermarks.map((watermark) => (
                  <TableRow key={watermark.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {watermark.type === 'image' ? (
                          <ImageIcon className="h-4 w-4" />
                        ) : (
                          <Type className="h-4 w-4" />
                        )}
                        <span className="capitalize">{watermark.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {watermark.type === 'text' ? (
                        <span className="text-sm">{watermark.text || '-'}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {watermark.imageDataUri ? 'Image uploaded' : 'No image'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {watermark.reportKey || t('watermarks.allReports') || 'All Reports'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">{watermark.position}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={watermark.isActive ? 'default' : 'secondary'}>
                        {watermark.isActive
                          ? t('events.active') || 'Active'
                          : t('events.inactive') || 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {hasUpdatePermission && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(watermark.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {hasDeletePermission && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(watermark.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {selectedWatermark
                  ? t('watermarks.editWatermark') || 'Edit Watermark'
                  : t('watermarks.addWatermark') || 'Add Watermark'}
              </DialogTitle>
              <DialogDescription>
                {selectedWatermark
                  ? t('watermarks.updateWatermarkInfo') || 'Update watermark settings'
                  : t('watermarks.enterWatermarkDetails') || 'Enter watermark details'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="wm_type">{t('events.type') || 'Type'}</Label>
                <Controller
                  name="wm_type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">
                          <div className="flex items-center gap-2">
                            <Type className="h-4 w-4" />
                            {t('watermarks.text') || 'Text'}
                          </div>
                        </SelectItem>
                        <SelectItem value="image">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            {t('watermarks.image') || 'Image'}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {watermarkType === 'text' ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="text">{t('watermarks.text') || 'Text'}</Label>
                    <Textarea
                      id="text"
                      {...register('text')}
                      placeholder={t('watermarks.enterText') || 'Enter watermark text'}
                      rows={3}
                    />
                    {errors.text && (
                      <p className="text-sm text-destructive">{errors.text.message}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="font_family">{t('watermarks.fontFamily') || 'Font Family'}</Label>
                    <Input
                      id="font_family"
                      {...register('font_family')}
                      placeholder={t('watermarks.enterFontFamily') || 'e.g., Arial, Times New Roman'}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="color">{t('watermarks.color') || 'Color'}</Label>
                    <div className="flex gap-2">
                      <Controller
                        name="color"
                        control={control}
                        render={({ field }) => (
                          <>
                            <Input
                              id="color"
                              type="color"
                              value={field.value || '#000000'}
                              onChange={(e) => field.onChange(e.target.value || '#000000')}
                              className="w-20 h-10"
                            />
                            <Input
                              value={field.value || '#000000'}
                              onChange={(e) => {
                                const value = e.target.value.trim();
                                field.onChange(value || '#000000');
                              }}
                              placeholder="#000000"
                            />
                          </>
                        )}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="image">{t('watermarks.image') || 'Image'}</Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setImageFile(file || null);
                        if (file) {
                          setExistingImagePreview(null);
                        }
                      }}
                    />
                    {(imageFile || existingImagePreview) && (
                      <div className="mt-2">
                        {imageFile ? (
                          <img
                            src={URL.createObjectURL(imageFile)}
                            alt="Watermark Preview"
                            className="w-32 h-32 object-contain border rounded"
                          />
                        ) : existingImagePreview ? (
                          <img
                            src={existingImagePreview}
                            alt="Watermark Preview"
                            className="w-32 h-32 object-contain border rounded"
                          />
                        ) : null}
                      </div>
                    )}
                    {!imageFile && !existingImagePreview && (
                      <p className="text-sm text-muted-foreground">
                        {t('watermarks.imageRequired') || 'Image is required for image watermarks'}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="grid gap-2">
                <Label htmlFor="report_key">{t('watermarks.reportKey') || 'Report Key (Optional)'}</Label>
                <Input
                  id="report_key"
                  {...register('report_key')}
                  placeholder={t('watermarks.enterReportKey') || 'Leave empty for all reports, e.g., student_list'}
                />
                <p className="text-xs text-muted-foreground">
                  {t('watermarks.reportKeyHint') || 'Leave empty to apply to all reports, or specify a report key like "student_list"'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="position">{t('search.position') || 'Position'}</Label>
                  <Controller
                    name="position"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="center">{t('watermarks.center') || 'Center'}</SelectItem>
                          <SelectItem value="top-left">{t('watermarks.topLeft') || 'Top Left'}</SelectItem>
                          <SelectItem value="top-right">{t('watermarks.topRight') || 'Top Right'}</SelectItem>
                          <SelectItem value="bottom-left">{t('watermarks.bottomLeft') || 'Bottom Left'}</SelectItem>
                          <SelectItem value="bottom-right">{t('watermarks.bottomRight') || 'Bottom Right'}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="repeat_pattern">{t('watermarks.repeatPattern') || 'Repeat Pattern'}</Label>
                  <Controller
                    name="repeat_pattern"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('events.none') || 'None'}</SelectItem>
                          <SelectItem value="repeat">{t('watermarks.repeat') || 'Repeat'}</SelectItem>
                          <SelectItem value="repeat-x">{t('watermarks.repeatX') || 'Repeat X'}</SelectItem>
                          <SelectItem value="repeat-y">{t('watermarks.repeatY') || 'Repeat Y'}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>
                  {t('watermarks.opacity') || 'Opacity'}: {watch('opacity')?.toFixed(2) || '0.08'}
                </Label>
                <Controller
                  name="opacity"
                  control={control}
                  render={({ field }) => (
                    <Slider
                      value={[field.value ?? 0.08]}
                      onValueChange={(value) => field.onChange(value[0])}
                      min={0}
                      max={1}
                      step={0.01}
                    />
                  )}
                />
              </div>

              <div className="grid gap-2">
                <Label>
                  {t('watermarks.rotation') || 'Rotation'}: {watch('rotation_deg') || 35}°
                </Label>
                <Controller
                  name="rotation_deg"
                  control={control}
                  render={({ field }) => (
                    <Slider
                      value={[field.value ?? 35]}
                      onValueChange={(value) => field.onChange(value[0])}
                      min={-360}
                      max={360}
                      step={1}
                    />
                  )}
                />
              </div>

              <div className="grid gap-2">
                <Label>
                  {t('watermarks.scale') || 'Scale'}: {watch('scale')?.toFixed(1) || '1.0'}
                </Label>
                <Controller
                  name="scale"
                  control={control}
                  render={({ field }) => (
                    <Slider
                      value={[field.value ?? 1.0]}
                      onValueChange={(value) => field.onChange(value[0])}
                      min={0.1}
                      max={5}
                      step={0.1}
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="pos_x">
                    {t('watermarks.positionX') || 'Position X'}: {watch('pos_x') || 50.0}%
                  </Label>
                  <Controller
                    name="pos_x"
                    control={control}
                    render={({ field }) => (
                      <Slider
                        value={[field.value ?? 50.0]}
                        onValueChange={(value) => field.onChange(value[0])}
                        min={0}
                        max={100}
                        step={1}
                      />
                    )}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pos_y">
                    {t('watermarks.positionY') || 'Position Y'}: {watch('pos_y') || 50.0}%
                  </Label>
                  <Controller
                    name="pos_y"
                    control={control}
                    render={({ field }) => (
                      <Slider
                        value={[field.value ?? 50.0]}
                        onValueChange={(value) => field.onChange(value[0])}
                        min={0}
                        max={100}
                        step={1}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sort_order">{t('examReports.sortOrder') || 'Sort Order'}</Label>
                <Input
                  id="sort_order"
                  type="number"
                  {...register('sort_order', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="is_active"
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="is_active">{t('events.active') || 'Active'}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t('events.cancel') || 'Cancel'}
              </Button>
              <Button type="submit" disabled={createWatermark.isPending || updateWatermark.isPending}>
                {selectedWatermark
                  ? t('events.update') || 'Update'
                  : t('events.create') || 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('watermarks.deleteConfirmTitle') || 'Delete Watermark'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('watermarks.deleteConfirmDescription') || 'Are you sure you want to delete this watermark? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('events.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('events.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

