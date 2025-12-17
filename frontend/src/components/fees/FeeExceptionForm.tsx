import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { feeExceptionSchema, type FeeExceptionFormData } from '@/lib/validations/fees';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/hooks/useLanguage';

interface FeeExceptionFormProps {
  defaultValues?: Partial<FeeExceptionFormData>;
  assignments?: Array<
    {
      label: string;
      value: string;
      studentId: string;
    }
  >;
  onSubmit: (values: FeeExceptionFormData) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function FeeExceptionForm({
  defaultValues,
  assignments = [],
  onSubmit,
  onCancel,
  isSubmitting,
}: FeeExceptionFormProps) {
  const { t } = useLanguage();

  const form = useForm<FeeExceptionFormData>({
    resolver: zodResolver(feeExceptionSchema),
    defaultValues: {
      fee_assignment_id: defaultValues?.fee_assignment_id ?? '',
      student_id: defaultValues?.student_id ?? '',
      exception_type: defaultValues?.exception_type ?? 'discount_fixed',
      exception_amount: defaultValues?.exception_amount ?? 0,
      exception_reason: defaultValues?.exception_reason ?? '',
      approved_by_user_id: defaultValues?.approved_by_user_id ?? '',
      approved_at: defaultValues?.approved_at ?? null,
      valid_from: defaultValues?.valid_from ?? '',
      valid_to: defaultValues?.valid_to ?? null,
      is_active: defaultValues?.is_active ?? true,
      notes: defaultValues?.notes ?? '',
      organization_id: defaultValues?.organization_id ?? null,
    },
  });

  const handleSubmit = async (values: FeeExceptionFormData) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fee_assignment_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fees.assignment')}</FormLabel>
              <Select
                value={field.value}
                onValueChange={(val) => {
                  field.onChange(val);
                  const selected = assignments.find((opt) => opt.value === val);
                  if (selected) {
                    form.setValue('student_id', selected.studentId);
                  }
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('fees.selectAssignment')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {assignments.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="exception_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fees.exceptionType')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('fees.exceptionType')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="discount_percentage">{t('fees.exceptionTypes.discount_percentage')}</SelectItem>
                    <SelectItem value="discount_fixed">{t('fees.exceptionTypes.discount_fixed')}</SelectItem>
                    <SelectItem value="waiver">{t('fees.exceptionTypes.waiver')}</SelectItem>
                    <SelectItem value="custom">{t('fees.exceptionTypes.custom')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="exception_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fees.exceptionAmount')}</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valid_from"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fees.validFrom')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valid_to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fees.validTo')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="exception_reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fees.exceptionReason')}</FormLabel>
              <FormControl>
                <Input placeholder={t('fees.exceptionReasonPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fees.notes')}</FormLabel>
              <FormControl>
                <Input placeholder={t('fees.notesPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

