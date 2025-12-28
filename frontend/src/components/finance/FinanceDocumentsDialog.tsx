import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateFinanceDocument } from '@/hooks/useFinanceDocuments';
import { useLanguage } from '@/hooks/useLanguage';
import { Upload, Loader2 } from 'lucide-react';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';

const DOCUMENT_TYPES = [
  { value: 'invoice', labelKey: 'finance.documentTypes.invoice' },
  { value: 'receipt', labelKey: 'finance.documentTypes.receipt' },
  { value: 'budget', labelKey: 'finance.documentTypes.budget' },
  { value: 'report', labelKey: 'finance.documentTypes.report' },
  { value: 'tax_document', labelKey: 'finance.documentTypes.taxDocument' },
  { value: 'voucher', labelKey: 'finance.documentTypes.voucher' },
  { value: 'bank_statement', labelKey: 'finance.documentTypes.bankStatement' },
  { value: 'other', labelKey: 'finance.documentTypes.other' },
];

const financeDocumentSchema = z.object({
  document_type: z.enum(['invoice', 'receipt', 'budget', 'report', 'tax_document', 'voucher', 'bank_statement', 'other']),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  amount: z.string().optional(),
  reference_number: z.string().max(100).optional(),
  document_date: z.string().optional(),
  file: z.any().refine((file) => file instanceof File, {
    message: 'File is required',
  }).refine((file) => file && file.size <= 20 * 1024 * 1024, {
    message: 'File size must be less than 20MB',
  }),
});

type FinanceDocumentFormData = z.infer<typeof financeDocumentSchema>;

interface FinanceDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FinanceDocumentsDialog({
  open,
  onOpenChange,
}: FinanceDocumentsDialogProps) {
  const { t } = useLanguage();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const createDocument = useCreateFinanceDocument();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FinanceDocumentFormData>({
    resolver: zodResolver(financeDocumentSchema),
    defaultValues: {
      document_type: 'other',
      title: '',
      description: '',
      amount: '',
      reference_number: '',
      document_date: '',
    },
  });

  const onSubmit = async (data: FinanceDocumentFormData) => {
    try {
      const formData = new FormData();
      formData.append('document_type', data.document_type);
      formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      if (data.amount) formData.append('amount', data.amount);
      if (data.reference_number) formData.append('reference_number', data.reference_number);
      if (data.document_date) formData.append('document_date', data.document_date);
      if (data.file) formData.append('file', data.file);

      await createDocument.mutateAsync(formData);
      handleClose();
    } catch (error) {
      console.error('Failed to upload document:', error);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('finance.uploadDocument')}</DialogTitle>
          <DialogDescription>
            {t('finance.uploadDocumentDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Document Type */}
          <div className="space-y-2">
            <Label htmlFor="document_type">
              {t('finance.documentType')} <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="document_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {t(type.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.document_type && (
              <p className="text-sm text-destructive">{errors.document_type.message}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              {t('finance.documentTitle')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              {...register('title')}
              placeholder={t('finance.documentTitlePlaceholder')}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('finance.documentDescription')}</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder={t('finance.documentDescriptionPlaceholder')}
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">{t('finance.amount')}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount')}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            {/* Reference Number */}
            <div className="space-y-2">
              <Label htmlFor="reference_number">{t('finance.referenceNumber')}</Label>
              <Input
                id="reference_number"
                {...register('reference_number')}
                placeholder={t('finance.referenceNumberPlaceholder')}
              />
              {errors.reference_number && (
                <p className="text-sm text-destructive">{errors.reference_number.message}</p>
              )}
            </div>
          </div>

          {/* Document Date */}
          <div className="space-y-2">
            <Label htmlFor="document_date">{t('finance.documentDate')}</Label>
            <Controller
              control={control}
              name="document_date"
              render={({ field }) => (
                <CalendarDatePicker
                  date={field.value ? new Date(field.value) : undefined}
                  onDateChange={(date) => {
                    field.onChange(date ? date.toISOString().slice(0, 10) : '');
                  }}
                  placeholder={t('finance.documentDate') || 'Select date'}
                />
              )}
            />
            {errors.document_date && (
              <p className="text-sm text-destructive">{errors.document_date.message}</p>
            )}
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">
              {t('finance.file')} <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="file"
              render={({ field: { onChange, value, ...field } }) => (
                <div className="space-y-2">
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    {...field}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        onChange(file);
                      }
                    }}
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              )}
            />
            {errors.file && (
              <p className="text-sm text-destructive">
                {errors.file.message as string}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('finance.maxFileSize')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.uploading')}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('common.upload')}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

