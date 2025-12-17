import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { feePaymentSchema, type FeePaymentFormData } from '@/lib/validations/fees';
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

interface Option {
  label: string;
  value: string;
}

interface FeePaymentFormProps {
  defaultValues?: Partial<FeePaymentFormData>;
  accounts?: Option[];
  assignments?: Array<
    Option & {
      studentId: string;
      studentAdmissionId: string;
    }
  >;
  onSubmit: (values: FeePaymentFormData) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function FeePaymentForm({
  defaultValues,
  accounts = [],
  assignments = [],
  onSubmit,
  onCancel,
  isSubmitting,
}: FeePaymentFormProps) {
  const { t } = useLanguage();

  const form = useForm<FeePaymentFormData>({
    resolver: zodResolver(feePaymentSchema),
    defaultValues: {
      fee_assignment_id: defaultValues?.fee_assignment_id ?? '',
      student_id: defaultValues?.student_id ?? '',
      student_admission_id: defaultValues?.student_admission_id ?? '',
      amount: defaultValues?.amount ?? 0,
      currency_id: defaultValues?.currency_id ?? null,
      payment_date: defaultValues?.payment_date ?? '',
      payment_method: defaultValues?.payment_method ?? 'cash',
      reference_no: defaultValues?.reference_no ?? '',
      account_id: defaultValues?.account_id ?? '',
      received_by_user_id: defaultValues?.received_by_user_id ?? null,
      notes: defaultValues?.notes ?? '',
      school_id: defaultValues?.school_id ?? null,
    },
  });

  const handleSubmit = async (values: FeePaymentFormData) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    const selected = assignments.find((option) => option.value === val);
                    if (selected) {
                      form.setValue('student_id', selected.studentId);
                      form.setValue('student_admission_id', selected.studentAdmissionId);
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('fees.selectAssignment')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {assignments.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="payment_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fees.paymentDate')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="payment_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fees.paymentMethod')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('fees.paymentMethod')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cash">{t('fees.paymentMethods.cash')}</SelectItem>
                    <SelectItem value="bank_transfer">{t('fees.paymentMethods.bank_transfer')}</SelectItem>
                    <SelectItem value="cheque">{t('fees.paymentMethods.cheque')}</SelectItem>
                    <SelectItem value="other">{t('fees.paymentMethods.other')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fees.amount')}</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="account_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fees.account')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('fees.accountPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="reference_no"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fees.reference')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('fees.referencePlaceholder')} {...field} />
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
        </div>

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

