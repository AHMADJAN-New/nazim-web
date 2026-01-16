/**
 * Calendar-Aware Form Fields
 * Integration with react-hook-form for calendar-aware date inputs
 */

import * as React from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

import { CalendarDatePicker, CalendarInput, CalendarDateRangePicker } from './calendar-date-picker';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './form';

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
        // Transform string value to Date for the picker
        const dateValue = React.useMemo(() => {
          if (!field.value) return undefined;
          if (field.value instanceof Date) return field.value;
          if (typeof field.value === 'string' && field.value.trim()) {
            const date = new Date(field.value);
            return isNaN(date.getTime()) ? undefined : date;
          }
          return undefined;
        }, [field.value]);

        // Transform Date from picker to string for the form
        const handleDateChange = (date: Date | undefined) => {
          if (date) {
            // Convert Date to ISO string format (YYYY-MM-DD)
            field.onChange(date.toISOString().split('T')[0]);
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
      <div className="space-y-2">
        <div className="flex gap-2">
          <FormField
            control={control}
            name={startName}
            render={({ field: startField }) => (
              <FormField
                control={control}
                name={endName}
                render={({ field: endField }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <CalendarDateRangePicker
                        startDate={startField.value}
                        endDate={endField.value}
                        onStartDateChange={startField.onChange}
                        onEndDateChange={endField.onChange}
                        startPlaceholder={startPlaceholder}
                        endPlaceholder={endPlaceholder}
                        disabled={disabled}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
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
    </div>
  );
}
