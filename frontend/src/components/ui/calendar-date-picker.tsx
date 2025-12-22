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
import { convertToCalendar, gregorianToHijriShamsi, gregorianToHijriQamari, hijriShamsiToGregorian } from '@/lib/calendarConverter';
import { MONTH_NAMES } from '@/lib/datePreferences';
import type { CalendarType } from '@/lib/datePreferences';
import { format as dateFnsFormat, type Locale } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';

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
  const [month, setMonth] = React.useState<Date | undefined>(date || new Date());
  const { language, t } = useLanguage();

  // Subscribe to calendar changes
  React.useEffect(() => {
    const unsubscribe = calendarState.subscribe((calendar) => {
      setCurrentCalendar(calendar);
    });
    return unsubscribe;
  }, []);

  // Get today's date in Gregorian
  const today = React.useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  // Convert today to the selected calendar
  const todayConverted = React.useMemo(() => {
    return convertToCalendar(today, currentCalendar);
  }, [today, currentCalendar]);

  // Format the display value
  const displayValue = React.useMemo(() => {
    if (!date) return placeholder;
    return formatDate(date);
  }, [date, placeholder]);

  // Handle date selection
  const handleSelect = (selectedDate: Date | undefined) => {
    onDateChange?.(selectedDate);
    if (selectedDate) {
      setMonth(selectedDate);
    }
    setIsOpen(false);
  };

  // Update month when date changes externally
  React.useEffect(() => {
    if (date) {
      setMonth(date);
    }
  }, [date]);

  // Get weekday names based on language
  // Week starts from Saturday, so we reorder: Sat, Sun, Mon, Tue, Wed, Thu, Fri
  // English: abbreviated (Sat, Sun, Mon, etc.)
  // Other languages: full names (شنبه, یکشنبه, etc.)
  const weekdayNames = React.useMemo(() => {
    const weekdays = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    if (language === 'en') {
      // English: return abbreviated names, starting from Saturday
      const abbreviated = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      return abbreviated;
    }
    
    // Other languages: return full names from translations, starting from Saturday
    return weekdays.map(day => t(`academic.timetable.days.${day}`));
  }, [t, language]);

  // Custom formatters for react-day-picker
  const formatters = React.useMemo(() => {
    if (currentCalendar === 'gregorian') {
      // For Gregorian, use default formatters but customize weekday names
      return {
        formatWeekdayName: (date: Date) => {
          // Week starts from Saturday (6), so we need to map correctly
          const dayIndex = date.getDay();
          const weekdayIndex = dayIndex === 6 ? 0 : dayIndex + 1;
          return weekdayNames[weekdayIndex] || weekdayNames[0];
        },
      };
    }

    const monthNames = MONTH_NAMES[currentCalendar][language] || MONTH_NAMES[currentCalendar]['en'];

    return {
      formatCaption: (date: Date) => {
        const converted = convertToCalendar(date, currentCalendar);
        return `${monthNames[converted.month - 1]} ${converted.year}`;
      },
      formatDay: (date: Date) => {
        const converted = convertToCalendar(date, currentCalendar);
        return String(converted.day);
      },
      formatWeekdayName: (date: Date) => {
        // Week starts from Saturday (6), so we need to map correctly
        // date.getDay() returns: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
        // weekdayNames array: [Sat, Sun, Mon, Tue, Wed, Thu, Fri]
        const dayIndex = date.getDay();
        // Map: 0->1 (Sun), 1->2 (Mon), 2->3 (Tue), 3->4 (Wed), 4->5 (Thu), 5->6 (Fri), 6->0 (Sat)
        const weekdayIndex = dayIndex === 6 ? 0 : dayIndex + 1;
        return weekdayNames[weekdayIndex] || weekdayNames[0];
      },
    };
  }, [currentCalendar, language, weekdayNames]);

  // Modifiers to mark today correctly in the converted calendar and highlight Fridays
  const modifiers = React.useMemo(() => {
    const baseModifiers: Record<string, Date | ((date: Date) => boolean)> = {
      // Highlight Fridays (day 5 = Friday)
      friday: (date: Date) => date.getDay() === 5,
    };

    if (currentCalendar === 'gregorian') {
      return {
        ...baseModifiers,
        today: today,
      };
    }

    // For non-Gregorian calendars, we need to check if a date matches today in the converted calendar
    return {
      ...baseModifiers,
      today: (date: Date) => {
        const converted = convertToCalendar(date, currentCalendar);
        // Check if this date matches today in the converted calendar
        return (
          converted.year === todayConverted.year &&
          converted.month === todayConverted.month &&
          converted.day === todayConverted.day
        );
      },
    };
  }, [currentCalendar, today, todayConverted]);

  // Custom class names for modifiers (Friday highlighting)
  const modifierClassNames = React.useMemo(() => {
    return {
      friday: 'bg-red-50 text-red-700 hover:bg-red-100',
    };
  }, []);

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
      <PopoverContent className="w-auto min-w-[380px] overflow-hidden p-0" align="start">
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
          modifiers={modifiers}
          modifiersClassNames={modifierClassNames}
          weekStartsOn={6}
          captionLayout="dropdown"
          fromYear={1900}
          toYear={new Date().getFullYear() + 10}
          month={month}
          onMonthChange={setMonth}
          components={currentCalendar !== 'gregorian' ? {
            Dropdown: (props: any) => {
              const monthNames = MONTH_NAMES[currentCalendar][language] || MONTH_NAMES[currentCalendar]['en'];
              
              // Handle month dropdown - react-day-picker v8 passes value as Gregorian month (1-12)
              // Check if this is a month dropdown by examining props.value
              const isMonthDropdown = 
                props.name === 'month' || 
                props.name === 'months' ||
                (typeof props.value === 'number' && props.value >= 1 && props.value <= 12 && !props.name) ||
                props['aria-label']?.toLowerCase().includes('month');
              
              if (isMonthDropdown) {
                // props.value is the Gregorian month (1-12) from react-day-picker
                const currentGregorianMonth = props.value || (month instanceof Date ? month.getMonth() + 1 : new Date().getMonth() + 1);
                
                return (
                  <select
                    {...props}
                    value={currentGregorianMonth}
                    onChange={(e) => {
                      const selectedGregorianMonth = parseInt(e.target.value);
                      // Update the month state
                      const currentMonthDate = month instanceof Date ? month : (date instanceof Date ? date : new Date());
                      const newMonth = new Date(currentMonthDate);
                      newMonth.setMonth(selectedGregorianMonth - 1);
                      setMonth(newMonth);
                      // Call original onChange if provided
                      if (props.onChange) {
                        props.onChange(selectedGregorianMonth);
                      }
                    }}
                    className="h-8 px-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary min-w-[140px]"
                  >
                    {monthNames.map((name, idx) => {
                      // Find Gregorian month that corresponds to this calendar month
                      for (let gMonth = 1; gMonth <= 12; gMonth++) {
                        const testDate = new Date(2000, gMonth - 1, 15);
                        const conv = convertToCalendar(testDate, currentCalendar);
                        if (conv.month === idx + 1) {
                          return (
                            <option key={idx} value={gMonth}>
                              {name}
                            </option>
                          );
                        }
                      }
                      return null;
                    })}
                  </select>
                );
              }
              
              // Handle year dropdown - react-day-picker v8 passes value as Gregorian year
              const isYearDropdown = 
                props.name === 'years' || 
                props.name === 'year' ||
                (typeof props.value === 'number' && props.value >= 1900 && props.value <= 2100 && !props.name) ||
                props['aria-label']?.toLowerCase().includes('year');
              
              if (isYearDropdown) {
                // props.value is the Gregorian year from react-day-picker
                const currentGregorianYear = props.value || (month instanceof Date ? month.getFullYear() : new Date().getFullYear());
                
                // Generate unique years in the converted calendar
                const yearsSet = new Set<number>();
                for (let gYear = 1900; gYear <= new Date().getFullYear() + 10; gYear++) {
                  const testDate = new Date(gYear, 6, 15);
                  const conv = convertToCalendar(testDate, currentCalendar);
                  yearsSet.add(conv.year);
                }
                const uniqueYears = Array.from(yearsSet).sort((a, b) => a - b);
                
                return (
                  <select
                    {...props}
                    value={currentGregorianYear}
                    onChange={(e) => {
                      const selectedGregorianYear = parseInt(e.target.value);
                      // Update the month state
                      const currentMonth = month instanceof Date ? month : (date instanceof Date ? date : new Date());
                      const newMonth = new Date(currentMonth);
                      newMonth.setFullYear(selectedGregorianYear);
                      setMonth(newMonth);
                      // Call original onChange if provided
                      if (props.onChange) {
                        props.onChange(selectedGregorianYear);
                      }
                    }}
                    className="h-8 px-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary min-w-[90px]"
                  >
                    {uniqueYears.map((year) => {
                      // Find Gregorian year for this calendar year
                      for (let gYear = 1900; gYear <= new Date().getFullYear() + 10; gYear++) {
                        const testDate = new Date(gYear, 6, 15);
                        const conv = convertToCalendar(testDate, currentCalendar);
                        if (conv.year === year) {
                          return (
                            <option key={year} value={gYear}>
                              {year}
                            </option>
                          );
                        }
                      }
                      return null;
                    })}
                  </select>
                );
              }
              
              // Default: return children to use default dropdown
              return props.children;
            },
          } : undefined}
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
