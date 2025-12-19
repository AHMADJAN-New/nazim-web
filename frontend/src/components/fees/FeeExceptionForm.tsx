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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

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
  const { profile } = useAuth();

  const form = useForm<FeeExceptionFormData>({
    resolver: zodResolver(feeExceptionSchema),
    defaultValues: {
      fee_assignment_id: defaultValues?.fee_assignment_id ?? '',
      student_id: defaultValues?.student_id ?? '',
      exception_type: defaultValues?.exception_type ?? 'discount_fixed',
      exception_amount: defaultValues?.exception_amount ?? 0,
      exception_reason: defaultValues?.exception_reason ?? '',
      approved_by_user_id: defaultValues?.approved_by_user_id ?? '',
      approved_at: defaultValues?.approved_at ?? '',
      valid_from: defaultValues?.valid_from ?? '',
      valid_to: defaultValues?.valid_to ?? '',
      is_active: defaultValues?.is_active ?? true,
      notes: defaultValues?.notes ?? '',
      organization_id: defaultValues?.organization_id ?? '',
    },
  });

  // Reset form when defaultValues change (for edit mode or new form)
  useEffect(() => {
    const resetValues = {
      fee_assignment_id: defaultValues?.fee_assignment_id ?? '',
      student_id: defaultValues?.student_id ?? '',
      exception_type: defaultValues?.exception_type ?? 'discount_fixed',
      exception_amount: defaultValues?.exception_amount ?? 0,
      exception_reason: defaultValues?.exception_reason ?? '',
      approved_by_user_id: defaultValues?.approved_by_user_id ?? profile?.id ?? '',
      approved_at: defaultValues?.approved_at ?? (defaultValues ? '' : new Date().toISOString().slice(0, 10)),
      valid_from: defaultValues?.valid_from ?? (defaultValues ? '' : new Date().toISOString().slice(0, 10)),
      valid_to: defaultValues?.valid_to ?? '',
      is_active: defaultValues?.is_active ?? true,
      notes: defaultValues?.notes ?? '',
      organization_id: defaultValues?.organization_id ?? profile?.organization_id ?? '',
    };
    form.reset(resetValues);
  }, [defaultValues, form, profile]);

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
                value={field.value ?? ''}
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
                <Select value={field.value ?? 'discount_fixed'} onValueChange={field.onChange}>
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
                  <Input
                    type="number"
                    step="0.01"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                  />
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
                  <Input type="date" value={field.value ?? ''} onChange={field.onChange} />
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
                  <Input type="date" value={field.value ?? ''} onChange={field.onChange} />
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
                <Textarea 
                  placeholder={t('fees.exceptionReasonPlaceholder') || 'Enter the reason for this exception...'} 
                  value={field.value ?? ''} 
                  onChange={field.onChange}
                  rows={3}
                  className="resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="approved_by_user_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fees.approvedBy') || 'Approved By'}</FormLabel>
                <FormControl>
                  <Input 
                    type="text"
                    value={profile?.full_name || profile?.email || field.value || ''} 
                    onChange={() => {}} // Read-only
                    disabled
                    className="bg-muted"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  {t('fees.currentUserWillBeApprover') || 'Current user will be set as approver'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="approved_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fees.approvedAt') || 'Approved At'}</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    value={field.value ?? ''} 
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">{t('fees.isActive') || 'Active'}</FormLabel>
                <FormDescription>
                  {t('fees.isActiveDescription') || 'Whether this exception is currently active'}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value ?? true}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
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
                <Textarea 
                  placeholder={t('fees.notesPlaceholder') || 'Enter any additional notes...'} 
                  value={field.value ?? ''} 
                  onChange={field.onChange}
                  rows={3}
                  className="resize-none"
                />
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

