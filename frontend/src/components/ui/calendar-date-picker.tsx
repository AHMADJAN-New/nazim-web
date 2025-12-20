/**
 * Calendar-Aware Date Picker
 * A date picker that displays dates in the user's preferred calendar
 * while storing values as Gregorian dates in the database
 */

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/calendarAdapter';
import { calendarState } from '@/lib/calendarState';
import { convertToCalendar, gregorianToHijriShamsi, gregorianToHijriQamari } from '@/lib/calendarConverter';
import { MONTH_NAMES } from '@/lib/datePreferences';
import type { CalendarType } from '@/lib/datePreferences';
import { format as dateFnsFormat, type Locale } from 'date-fns';

interface CalendarDatePickerProps {
  /**
   * The selected date (always in Gregorian format for storage)
   */
  date?: Date;

  /**
   * Callback when date is selected (receives Gregorian date)
   */
  onDateChange?: (date: Date | undefined) => void;

  /**
   * Placeholder text when no date is selected
   */
  placeholder?: string;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Custom class name for the trigger button
   */
  className?: string;

  /**
   * Minimum selectable date
   */
  minDate?: Date;

  /**
   * Maximum selectable date
   */
  maxDate?: Date;
}

/**
 * Calendar-aware date picker component
 *
 * Usage:
 * ```tsx
 * <CalendarDatePicker
 *   date={formData.startDate}
 *   onDateChange={(date) => setFormData({ ...formData, startDate: date })}
 *   placeholder="Select start date"
 * />
 * ```
 *
 * Features:
 * - Displays dates in user's preferred calendar (Gregorian/Hijri Shamsi/Hijri Qamari)
 * - Stores dates as Gregorian (for database compatibility)
 * - Shows month names in the selected calendar
 * - Automatic conversion between calendars
 * - Drop-in replacement for existing date pickers
 */
export function CalendarDatePicker({
  date,
  onDateChange,
  placeholder = 'Pick a date',
  disabled = false,
  className,
  minDate,
  maxDate,
}: CalendarDatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentCalendar, setCurrentCalendar] = React.useState<CalendarType>(calendarState.get());

  // Subscribe to calendar changes
  React.useEffect(() => {
    const unsubscribe = calendarState.subscribe((calendar) => {
      setCurrentCalendar(calendar);
    });
    return unsubscribe;
  }, []);

  // Get custom month names based on current calendar
  const getMonthLabels = React.useCallback(() => {
    const calendar = currentCalendar;
    const monthNames = MONTH_NAMES[calendar]['en']; // Use English for now
    return monthNames;
  }, [currentCalendar]);

  // Format the display value
  const displayValue = React.useMemo(() => {
    if (!date) return placeholder;
    return formatDate(date);
  }, [date, placeholder]);

  // Handle date selection
  const handleSelect = (selectedDate: Date | undefined) => {
    onDateChange?.(selectedDate);
    setIsOpen(false);
  };

  // Custom formatters for react-day-picker
  const formatters = React.useMemo(() => {
    if (currentCalendar === 'gregorian') {
      // Use default formatters for Gregorian
      return undefined;
    }

    return {
      formatCaption: (date: Date) => {
        const converted = convertToCalendar(date, currentCalendar);
        const monthNames = MONTH_NAMES[currentCalendar]['en'];
        return `${monthNames[converted.month - 1]} ${converted.year}`;
      },
    };
  }, [currentCalendar]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
            return false;
          }}
          initialFocus
          formatters={formatters}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Calendar-aware date input field
 * Similar to CalendarDatePicker but styled as an input field
 *
 * Usage:
 * ```tsx
 * <CalendarInput
 *   value={formData.birthDate}
 *   onChange={(date) => setFormData({ ...formData, birthDate: date })}
 *   placeholder="Birth date"
 * />
 * ```
 */
interface CalendarInputProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  required?: boolean;
}

export function CalendarInput({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  className,
  minDate,
  maxDate,
  required = false,
}: CalendarInputProps) {
  return (
    <CalendarDatePicker
      date={value}
      onDateChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      minDate={minDate}
      maxDate={maxDate}
    />
  );
}

/**
 * Calendar-aware date range picker
 * For selecting date ranges (start and end dates)
 *
 * Usage:
 * ```tsx
 * <CalendarDateRangePicker
 *   startDate={formData.startDate}
 *   endDate={formData.endDate}
 *   onStartDateChange={(date) => setFormData({ ...formData, startDate: date })}
 *   onEndDateChange={(date) => setFormData({ ...formData, endDate: date })}
 * />
 * ```
 */
interface CalendarDateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onStartDateChange?: (date: Date | undefined) => void;
  onEndDateChange?: (date: Date | undefined) => void;
  startPlaceholder?: string;
  endPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CalendarDateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startPlaceholder = 'Start date',
  endPlaceholder = 'End date',
  disabled = false,
  className,
}: CalendarDateRangePickerProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      <CalendarDatePicker
        date={startDate}
        onDateChange={onStartDateChange}
        placeholder={startPlaceholder}
        disabled={disabled}
        maxDate={endDate}
        className="flex-1"
      />
      <CalendarDatePicker
        date={endDate}
        onDateChange={onEndDateChange}
        placeholder={endPlaceholder}
        disabled={disabled}
        minDate={startDate}
        className="flex-1"
      />
    </div>
  );
}
