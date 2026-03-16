import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from '@/components/ui/textarea';
import { useCreateOrgFinanceDocument } from '@/hooks/useOrgFinance';
import { useLanguage } from '@/hooks/useLanguage';

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

const schema = z.object({
  document_type: z.enum(['invoice', 'receipt', 'budget', 'report', 'tax_document', 'voucher', 'bank_statement', 'other']),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  amount: z.string().optional(),
  reference_number: z.string().max(100).optional(),
  document_date: z.string().optional(),
  file: z.any()
    .refine((file) => file instanceof File, { message: 'File is required' })
    .refine((file) => file && file.size <= 20 * 1024 * 1024, { message: 'File size must be less than 20MB' }),
});

type FormData = z.infer<typeof schema>;

interface OrgFinanceDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrgFinanceDocumentsDialog({ open, onOpenChange }: OrgFinanceDocumentsDialogProps) {
  const { t, tUnsafe } = useLanguage();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const createDocument = useCreateOrgFinanceDocument();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      document_type: 'other',
      title: '',
      description: '',
      amount: '',
      reference_number: '',
      document_date: '',
    },
  });

  const onSubmit = async (data: FormData) => {
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
      reset();
      setSelectedFile(null);
      onOpenChange(false);
    } catch (err) {
      console.error('Upload failed:', err);
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
          <DialogTitle>{tUnsafe('finance.uploadDocument') ?? 'Upload document'}</DialogTitle>
          <DialogDescription>{tUnsafe('finance.uploadDocumentDescription') ?? 'Upload a finance document.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('finance.documentType')}</Label>
              <Controller
                control={control}
                name="document_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{tUnsafe(type.labelKey) ?? type.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('finance.documentDate')}</Label>
              <Controller
                control={control}
                name="document_date"
                render={({ field }) => (
                  <CalendarDatePicker
                    date={field.value ? new Date(field.value) : undefined}
                    onDateChange={(d) => field.onChange(d ? d.toISOString().slice(0, 10) : '')}
                    placeholder={t('finance.documentDate')}
                  />
                )}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('courses.documentTitle')} *</Label>
            <Input {...register('title')} placeholder={t('courses.documentTitle')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>{tUnsafe('finance.description') ?? 'Description'}</Label>
            <Textarea {...register('description')} rows={2} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('finance.referenceNumber')}</Label>
              <Input {...register('reference_number')} />
            </div>
            <div className="space-y-2">
              <Label>{t('finance.amount')}</Label>
              <Input type="number" step="0.01" {...register('amount')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('finance.file') ?? 'File'} *</Label>
            <Controller
              control={control}
              name="file"
              render={({ field: { onChange, value, ...rest } }) => (
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  {...rest}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setSelectedFile(f ?? null);
                    onChange(f);
                  }}
                />
              )}
            />
            {errors.file && <p className="text-sm text-destructive">{errors.file.message as string}</p>}
            {selectedFile && <p className="text-xs text-muted-foreground">{selectedFile.name}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('events.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {tUnsafe('finance.uploadDocument') ?? 'Upload document'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
