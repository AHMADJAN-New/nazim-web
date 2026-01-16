import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { CalendarFormField } from '@/components/ui/calendar-form-field';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useAuth } from '@/hooks/useAuth';
import { useClasses, useClassAcademicYears } from '@/hooks/useClasses';
import { useCurrencies, useExchangeRates } from '@/hooks/useCurrencies';
import { useLanguage } from '@/hooks/useLanguage';
import { useSchools } from '@/hooks/useSchools';
import { showToast } from '@/lib/toast';
import { feeStructureSchema, type FeeStructureFormData } from '@/lib/validations/fees';

interface FeeStructureFormProps {
  defaultValues?: Partial<FeeStructureFormData>;
  onSubmit: (values: FeeStructureFormData) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function FeeStructureForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: FeeStructureFormProps) {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { data: academicYears = [] } = useAcademicYears();

  const form = useForm<FeeStructureFormData>({
    resolver: zodResolver(feeStructureSchema),
    defaultValues: {
      academic_year_id: '',
      name: defaultValues?.name ?? '',
      code: defaultValues?.code ?? '',
      description: defaultValues?.description ?? '',
      fee_type: defaultValues?.fee_type ?? 'one_time',
      amount: defaultValues?.amount ?? 0,
      currency_id: defaultValues?.currency_id ?? '',
      due_date: defaultValues?.due_date ?? '',
      start_date: defaultValues?.start_date ?? '',
      end_date: defaultValues?.end_date ?? '',
      class_id: defaultValues?.class_id ?? '',
      class_academic_year_id: defaultValues?.class_academic_year_id ?? '',
      is_active: defaultValues?.is_active ?? true,
      is_required: defaultValues?.is_required ?? true,
      display_order: defaultValues?.display_order ?? 0,
      school_id: defaultValues?.school_id ?? profile?.default_school_id ?? '',
    },
  });

  const selectedAcademicYearId = form.watch('academic_year_id');
  const { data: classAcademicYears = [] } = useClassAcademicYears(selectedAcademicYearId);
  const { data: classes = [] } = useClasses();
  const { data: schools = [] } = useSchools();
  const { data: currencies = [] } = useCurrencies({ isActive: true });

  useEffect(() => {
    // Prefill academic year when loaded
    const currentAy = academicYears[0];
    if (currentAy && !form.getValues('academic_year_id')) {
      form.setValue('academic_year_id', currentAy.id);
    }
    // Prefill school from profile if available
    if (profile?.default_school_id && !form.getValues('school_id')) {
      form.setValue('school_id', profile.default_school_id);
    }
  }, [academicYears, form, profile]);

  const handleSubmit = async (values: FeeStructureFormData) => {
    await onSubmit(values);
  };

  const handleError = (errors: unknown) => {
    if (import.meta.env.DEV) {
       
      console.error('[FeeStructureForm] validation errors', errors);
    }
    const firstError =
      typeof errors === 'object' && errors !== null && 'root' in (errors as any)
        ? (errors as any).root?.message
        : 'Validation failed';
    showToast.error(firstError || 'Validation failed');
  };

  const baseCurrency = useMemo(() => currencies.find((c) => c.isBase), [currencies]);
  const selectedCurrencyId = form.watch('currency_id');
  const selectedCurrency = useMemo(
    () => currencies.find((c) => c.id === selectedCurrencyId),
    [currencies, selectedCurrencyId],
  );

  const { data: exchangeRates = [] } = useExchangeRates(
    selectedCurrency && baseCurrency && selectedCurrency.id !== baseCurrency.id
      ? { fromCurrencyId: selectedCurrency.id, toCurrencyId: baseCurrency.id, isActive: true }
      : undefined,
  );

  const amountValue = form.watch('amount');
  const conversionRate = useMemo(() => {
    if (!exchangeRates.length) return null;
    return exchangeRates[0]?.rate ?? null;
  }, [exchangeRates]);

  const convertedAmount = useMemo(() => {
    if (!conversionRate || amountValue === undefined || amountValue === null || Number.isNaN(amountValue)) {
      return null;
    }
    return Number(amountValue) * conversionRate;
  }, [amountValue, conversionRate]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit, handleError)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="academic_year_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fees.academicYear')}</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      // reset class selections when academic year changes
                      form.setValue('class_academic_year_id', '');
                      form.setValue('class_id', '');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('fees.selectAcademicYear')} />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map((ay) => (
                        <SelectItem key={ay.id} value={ay.id}>
                          {ay.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="school_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fees.school')}</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.selectSchool')} />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.schoolName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('events.name')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('fees.namePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('events.code')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('fees.codePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fee_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fees.feeType')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('fees.feeType')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="one_time">{t('fees.feeTypes.one_time')}</SelectItem>
                    <SelectItem value="monthly">{t('fees.feeTypes.monthly')}</SelectItem>
                    <SelectItem value="quarterly">{t('fees.feeTypes.quarterly')}</SelectItem>
                    <SelectItem value="semester">{t('fees.feeTypes.semester')}</SelectItem>
                    <SelectItem value="annual">{t('fees.feeTypes.annual')}</SelectItem>
                    <SelectItem value="custom">{t('fees.feeTypes.custom')}</SelectItem>
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
                    value={Number.isNaN(field.value) || field.value === null ? '' : field.value}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val === '' ? '' : e.target.valueAsNumber);
                    }}
                  />
                </FormControl>
                <FormMessage />
                {selectedCurrency && baseCurrency && selectedCurrency.id !== baseCurrency.id && (
                  <p className="text-sm text-muted-foreground">
                    {conversionRate && convertedAmount != null
                      ? `≈ ${convertedAmount.toFixed(2)} ${baseCurrency.code}`
                      : ''}
                  </p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fees.account')}</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('fees.accountPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} {c.isBase ? `(${t('events.base')})` : ''} - {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <CalendarFormField control={form.control} name="due_date" label={t('fees.dueDate')} />

          <CalendarFormField control={form.control} name="start_date" label={t('events.startDate')} />

          <CalendarFormField control={form.control} name="end_date" label={t('events.endDate')} />

          <FormField
            control={form.control}
            name="class_academic_year_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('search.class')}</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      const cay = classAcademicYears.find((c) => c.id === val);
                      form.setValue('class_id', cay?.classId ?? '');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('events.selectClass')} />
                    </SelectTrigger>
                    <SelectContent>
                      {classAcademicYears
                        .filter(
                          (cay) =>
                            !form.getValues('academic_year_id') || cay.academicYearId === form.getValues('academic_year_id'),
                        )
                        .map((cay) => (
                          <SelectItem key={cay.id} value={cay.id}>
                            {cay.class?.name ?? classes.find((c) => c.id === cay.classId)?.name ?? cay.id}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="class_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fees.structureId')}</FormLabel>
                <FormControl>
                  <Input
                    value={
                      field.value ||
                      classes.find((c) => c.id === field.value)?.name ||
                      classAcademicYears.find((cay) => cay.id === form.watch('class_academic_year_id'))?.class?.name ||
                      ''
                    }
                    onChange={field.onChange}
                    placeholder={t('events.selectClass')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="display_order"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('events.displayOrder')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    value={Number.isNaN(field.value) || field.value === null ? '' : field.value}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val === '' ? '' : e.target.valueAsNumber);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('events.description')}</FormLabel>
              <FormControl>
                <Input placeholder={t('permissions.descriptionPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-4">
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormLabel>{t('events.active')}</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_required"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormLabel>{t('events.required')}</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              {t('events.cancel')}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('events.saving') : t('events.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

