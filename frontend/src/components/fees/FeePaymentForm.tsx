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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/hooks/useLanguage';
import { useEffect } from 'react';

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
      assignment?: {
        remainingAmount: number;
        assignedAmount: number;
        paidAmount: number;
        status: string;
      };
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

  // Set default payment date to today
  const today = new Date().toISOString().split('T')[0];

  const form = useForm<FeePaymentFormData>({
    resolver: zodResolver(feePaymentSchema),
    defaultValues: {
      fee_assignment_id: defaultValues?.fee_assignment_id ?? '',
      student_id: defaultValues?.student_id ?? '',
      student_admission_id: defaultValues?.student_admission_id ?? '',
      amount: defaultValues?.amount ?? 0,
      currency_id: defaultValues?.currency_id ?? null,
      payment_date: defaultValues?.payment_date || today,
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

  // Reset form when assignments change (new filters applied)
  useEffect(() => {
    // Reset form when assignments list changes to clear previous selection
    form.reset({
      fee_assignment_id: '',
      student_id: '',
      student_admission_id: '',
      amount: 0,
      currency_id: null,
      payment_date: today,
      payment_method: 'cash',
      reference_no: '',
      account_id: '',
      received_by_user_id: null,
      notes: '',
      school_id: null,
    });
  }, [assignments.length, form, today]); // Reset when assignments change

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {assignments.length === 0 && (
          <Alert>
            <AlertDescription>
              {t('fees.noAssignmentsAvailable') || 'No fee assignments available. Please select an academic year and class first.'}
            </AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fee_assignment_id"
            render={({ field }) => {
              const selectedAssignment = assignments.find((option) => option.value === field.value);
              const assignment = selectedAssignment?.assignment;

              return (
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
                        // Auto-fill amount with remaining amount if available
                        if (selected.assignment && selected.assignment.remainingAmount > 0) {
                          form.setValue('amount', selected.assignment.remainingAmount);
                        }
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
                  {assignment && (
                    <div className="mt-2 p-3 bg-muted/50 rounded-md text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('fees.assignedAmount')}:</span>
                        <span className="font-medium">{assignment.assignedAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('fees.paidAmount')}:</span>
                        <span className="font-medium">{assignment.paidAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('fees.remaining')}:</span>
                        <span className="font-semibold text-primary">{assignment.remainingAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('fees.status')}:</span>
                        <span className="capitalize">{assignment.status}</span>
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <CalendarFormField control={form.control} name="payment_date" label={t('fees.paymentDate')} />

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
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={typeof field.value === 'number' ? field.value : field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Convert to number: empty string becomes 0, otherwise parse as float
                      const numValue = value === '' ? 0 : (isNaN(parseFloat(value)) ? 0 : parseFloat(value));
                      field.onChange(numValue);
                    }}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
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
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                form.reset();
                onCancel();
              }} 
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting || assignments.length === 0}>
            {isSubmitting ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

