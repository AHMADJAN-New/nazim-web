/**
 * Calendar-Aware Form Fields
 * Integration with react-hook-form for calendar-aware date inputs
 */

import * as React from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

import { CalendarDatePicker, CalendarInput } from './calendar-date-picker';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './form';
import { dateToLocalYYYYMMDD, parseLocalDate } from '@/lib/dateUtils';

/**
 * Calendar-aware date field for react-hook-form
 *
 * Usage with react-hook-form:
 * ```tsx
 * import { useForm } from 'react-hook-form';
 * import { CalendarFormField } from '@/components/ui/calendar-form-field';
 *
 * function MyForm() {
 *   const form = useForm();
 *
 *   return (
 *     <form onSubmit={form.handleSubmit(onSubmit)}>
 *       <CalendarFormField
 *         control={form.control}
 *         name="startDate"
 *         label="Start Date"
 *         placeholder="Select start date"
 *       />
 *     </form>
 *   );
 * }
 * ```
 */
interface CalendarFormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  /**
   * React Hook Form control
   */
  control: Control<TFieldValues>;

  /**
   * Field name from the form schema
   */
  name: TName;

  /**
   * Label for the field
   */
  label?: string;

  /**
   * Description text shown below the field
   */
  description?: string;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Minimum selectable date
   */
  minDate?: Date;

  /**
   * Maximum selectable date
   */
  maxDate?: Date;

  /**
   * Required field indicator
   */
  required?: boolean;

  /**
   * Custom class name
   */
  className?: string;
}

export function CalendarFormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  label,
  description,
  placeholder,
  disabled,
  minDate,
  maxDate,
  required,
  className,
}: CalendarFormFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        // Transform string value to Date for the picker (local date to avoid timezone bugs)
        const dateValue = React.useMemo(() => {
          if (!field.value) return undefined;
          if (field.value instanceof Date) return field.value;
          if (typeof field.value === 'string' && field.value.trim()) {
            const date = parseLocalDate(field.value);
            return isNaN(date.getTime()) ? undefined : date;
          }
          return undefined;
        }, [field.value]);

        // Transform Date from picker to local YYYY-MM-DD string for the form
        const handleDateChange = (date: Date | undefined) => {
          if (date) {
            field.onChange(dateToLocalYYYYMMDD(date));
          } else {
            field.onChange('');
          }
        };

        return (
          <FormItem className={className}>
            {label && (
              <FormLabel>
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
              </FormLabel>
            )}
            <FormControl>
              <CalendarDatePicker
                date={dateValue}
                onDateChange={handleDateChange}
                placeholder={placeholder}
                disabled={disabled}
                minDate={minDate}
                maxDate={maxDate}
              />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

/**
 * Calendar-aware date range field for react-hook-form
 *
 * Usage:
 * ```tsx
 * <CalendarRangeFormField
 *   control={form.control}
 *   startName="startDate"
 *   endName="endDate"
 *   label="Date Range"
 *   startPlaceholder="Start date"
 *   endPlaceholder="End date"
 * />
 * ```
 */
interface CalendarRangeFormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TStartName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TEndName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>;
  startName: TStartName;
  endName: TEndName;
  label?: string;
  description?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function CalendarRangeFormField<
  TFieldValues extends FieldValues = FieldValues,
  TStartName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TEndName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  startName,
  endName,
  label,
  description,
  startPlaceholder,
  endPlaceholder,
  disabled,
  required,
  className,
}: CalendarRangeFormFieldProps<TFieldValues, TStartName, TEndName>) {
  return (
    <div className={className}>
      {label && (
        <FormLabel>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </FormLabel>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name={startName}
          render={({ field: startField }) => (
            <FormItem>
              <FormLabel>{startPlaceholder ?? (label ? `${label} (from)` : 'Start date')}</FormLabel>
              <FormControl>
                <CalendarDatePicker
                  date={startField.value ? parseLocalDate(String(startField.value)) : undefined}
                  onDateChange={(date) => startField.onChange(date ? dateToLocalYYYYMMDD(date) : '')}
                  placeholder={startPlaceholder}
                  disabled={disabled}
                  className="w-full"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={endName}
          render={({ field: endField }) => (
            <FormItem>
              <FormLabel>{endPlaceholder ?? (label ? `${label} (to)` : 'End date')}</FormLabel>
              <FormControl>
                <CalendarDatePicker
                  date={endField.value ? parseLocalDate(String(endField.value)) : undefined}
                  onDateChange={(date) => endField.onChange(date ? dateToLocalYYYYMMDD(date) : '')}
                  placeholder={endPlaceholder}
                  disabled={disabled}
                  className="w-full"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      {description && <FormDescription>{description}</FormDescription>}
      <FormField
        control={control}
        name={startName}
        render={() => <FormMessage />}
      />
      <FormField
        control={control}
        name={endName}
        render={() => <FormMessage />}
      />
    </div>
  );
}
