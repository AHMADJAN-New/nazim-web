/**
 * Calendar-Aware Date Picker
 * A date picker that displays dates in the user's preferred calendar
 * while storing values as Gregorian dates in the database
 */

import { format as dateFnsFormat, type Locale } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/calendarAdapter';
import { convertToCalendar, gregorianToHijriShamsi, gregorianToHijriQamari, hijriShamsiToGregorian } from '@/lib/calendarConverter';
import { calendarState } from '@/lib/calendarState';
import { parseLocalDate } from '@/lib/dateUtils';
import { MONTH_NAMES } from '@/lib/datePreferences';
import type { CalendarType } from '@/lib/datePreferences';
import { cn } from '@/lib/utils';

interface CalendarDatePickerProps {
  /**
   * The selected date (always in Gregorian format for storage; Date or YYYY-MM-DD string)
   */
  date?: Date | string;

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
// Cache for date conversions to avoid recalculating
const conversionCache = new Map<string, { year: number; month: number; day: number; calendar: CalendarType }>();

function getCachedConversion(date: Date, calendar: CalendarType): { year: number; month: number; day: number; calendar: CalendarType } {
  const cacheKey = `${date.getTime()}-${calendar}`;
  if (conversionCache.has(cacheKey)) {
    return conversionCache.get(cacheKey)!;
  }
  const converted = convertToCalendar(date, calendar);
  conversionCache.set(cacheKey, converted);
  // Limit cache size to prevent memory leaks (keep last 1000 conversions)
  if (conversionCache.size > 1000) {
    const firstKey = conversionCache.keys().next().value;
    conversionCache.delete(firstKey);
  }
  return converted;
}

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
  
  // Normalize date prop: convert string to Date if needed (use local date to avoid timezone bugs)
  const normalizedDate = React.useMemo(() => {
    if (!date) return undefined;
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? undefined : date;
    }
    if (typeof date === 'string') {
      const parsed = parseLocalDate(date);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return undefined;
  }, [date]);
  
  const [month, setMonth] = React.useState<Date | undefined>(normalizedDate || new Date());
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

  // Convert today to the selected calendar (cached)
  const todayConverted = React.useMemo(() => {
    return getCachedConversion(today, currentCalendar);
  }, [today, currentCalendar]);

  // Format the display value
  const displayValue = React.useMemo(() => {
    if (!normalizedDate) return placeholder;
    return formatDate(normalizedDate);
  }, [normalizedDate, placeholder]);

  // Handle date selection
  const handleSelect = (selectedDate: Date | undefined) => {
    onDateChange?.(selectedDate);
    if (selectedDate) {
      setMonth(selectedDate);
    }
    setIsOpen(false);
  };

  // Handle "Today" button click
  const handleTodayClick = () => {
    // Check if today is within min/max date constraints
    if (minDate && today < minDate) return;
    if (maxDate && today > maxDate) return;
    
    handleSelect(today);
  };

  // Check if today button should be disabled
  const isTodayDisabled = React.useMemo(() => {
    if (minDate && today < minDate) return true;
    if (maxDate && today > maxDate) return true;
    return false;
  }, [today, minDate, maxDate]);

  // Update month when date changes externally
  React.useEffect(() => {
    if (normalizedDate) {
      setMonth(normalizedDate);
    } else if (!date) {
      // If date is cleared, reset to current month
      setMonth(new Date());
    }
  }, [normalizedDate, date]);

  // Hide the default labels that react-day-picker adds to dropdowns
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        // Find and hide labels like ":Year" and ":Month"
        const popover = document.querySelector('[role="dialog"]');
        if (popover) {
          const labels = popover.querySelectorAll('.rdp-caption_dropdowns > span, .rdp-caption_dropdowns > *:not(select):not(button)');
          labels.forEach((label) => {
            const text = label.textContent?.trim();
            if (text === ':Year' || text === ':Month' || text?.includes(':')) {
              (label as HTMLElement).style.display = 'none';
            }
          });
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Memoize month options to improve performance
  // For Qamari calendar, month mapping changes with year, so we need to recalculate when year changes
  const monthOptions = React.useMemo(() => {
    if (currentCalendar === 'gregorian') {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return monthNames.map((name, idx) => ({ value: idx + 1, label: name }));
    }

    const monthNames = MONTH_NAMES[currentCalendar][language] || MONTH_NAMES[currentCalendar]['en'];
    const currentYear = month instanceof Date ? month.getFullYear() : new Date().getFullYear();
    const options: Array<{ value: number; label: string }> = [];

    // For Qamari calendar, we need to use the current year because the month mapping changes each year
    // For Shamsi, the mapping is more stable but we still use current year for accuracy
    // Build a map of Gregorian month -> Calendar month name
    const monthMap = new Map<number, string>();
    const currentGregMonth = month instanceof Date ? month.getMonth() + 1 : new Date().getMonth() + 1;
    const currentDay = month instanceof Date ? month.getDate() : new Date().getDate();
    
    // Check each Gregorian month to see which calendar month it corresponds to
    for (let gMonth = 1; gMonth <= 12; gMonth++) {
      // For the current Gregorian month, use the actual current day
      // For other months, use day 15 to avoid edge cases at month boundaries
      const testDay = (gMonth === currentGregMonth) ? currentDay : 15;
      const testDate = new Date(currentYear, gMonth - 1, testDay);
      const conv = getCachedConversion(testDate, currentCalendar);
      const calendarMonthIdx = conv.month - 1; // Convert to 0-based index
      
      if (calendarMonthIdx >= 0 && calendarMonthIdx < monthNames.length) {
        monthMap.set(gMonth, monthNames[calendarMonthIdx]);
      }
    }

    // Convert map to array and sort by Gregorian month value
    monthMap.forEach((label, value) => {
      options.push({ value, label });
    });
    
    // Sort by Gregorian month value to ensure correct order
    options.sort((a, b) => a.value - b.value);

    return options;
  }, [currentCalendar, language, month instanceof Date ? month.getFullYear() : undefined, month instanceof Date ? month.getMonth() : undefined, month instanceof Date ? month.getDate() : undefined]);

  // Memoize year options to improve performance
  // For Gregorian: value and label are the same. For Shamsi/Qamari: value is Gregorian year (for setMonth), label is calendar year so the dropdown shows 1404 not 2025.
  const yearOptions = React.useMemo(() => {
    const years: Array<{ value: number; label: string | number }> = [];
    if (currentCalendar === 'gregorian') {
      for (let year = 1900; year <= new Date().getFullYear() + 10; year++) {
        years.push({ value: year, label: year });
      }
      return years;
    }
    // Non-Gregorian: use a fixed Gregorian month (July, index 6) to map gYear -> calendar year for stable labels
    for (let gYear = 1900; gYear <= new Date().getFullYear() + 10; gYear++) {
      const refDate = new Date(gYear, 6, 15);
      const converted = getCachedConversion(refDate, currentCalendar);
      years.push({ value: gYear, label: converted.year });
    }
    return years;
  }, [currentCalendar]);

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
    const baseFormatters = {
      formatWeekdayName: (date: Date) => {
        // Week starts from Saturday (6), so we need to map correctly
        const dayIndex = date.getDay();
        const weekdayIndex = dayIndex === 6 ? 0 : dayIndex + 1;
        return weekdayNames[weekdayIndex] || weekdayNames[0];
      },
      // Hide labels for dropdown layout
      formatMonthDropdown: () => '',
      formatYearDropdown: () => '',
    };

    if (currentCalendar === 'gregorian') {
      // For Gregorian, use default formatters but customize weekday names
      return baseFormatters;
    }

    const monthNames = MONTH_NAMES[currentCalendar][language] || MONTH_NAMES[currentCalendar]['en'];

    return {
      ...baseFormatters,
      formatCaption: (date: Date) => {
        const converted = getCachedConversion(date, currentCalendar);
        return `${monthNames[converted.month - 1]} ${converted.year}`;
      },
      formatDay: (date: Date) => {
        const converted = getCachedConversion(date, currentCalendar);
        return String(converted.day);
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
        const converted = getCachedConversion(date, currentCalendar);
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
            'justify-start text-left font-normal px-2.5',
            !date && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-[380px] overflow-hidden p-0 [&_.rdp-caption_label]:hidden [&_.rdp-caption_dropdowns_*:not(select)]:hidden" align="start">
        <Calendar
          mode="single"
          selected={normalizedDate}
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
          classNames={{
            caption: "flex justify-center pt-1 relative items-center gap-2",
            caption_dropdowns: "flex gap-2 items-center justify-center [&_span]:hidden",
            caption_label: "hidden",
          }}
          components={{
            Caption: ({ displayMonth }: any) => {
              // Custom caption that renders Select components directly
              const currentMonth = month instanceof Date ? month : (date instanceof Date ? date : new Date());
              const currentGregorianMonth = currentMonth.getMonth() + 1;
              const currentGregorianYear = currentMonth.getFullYear();
              
              // For non-Gregorian calendars, show the actual calendar month name that the current date falls into
              // Note: A Gregorian month can span parts of two calendar months, so we use the actual date's calendar month
              let currentMonthLabel: string;
              let selectValue: string;
              
              if (currentCalendar !== 'gregorian') {
                // Convert the current date to the selected calendar to get the actual calendar month (cached)
                const currentDateConverted = getCachedConversion(currentMonth, currentCalendar);
                const monthNames = MONTH_NAMES[currentCalendar][language] || MONTH_NAMES[currentCalendar]['en'];
                const calendarMonthName = monthNames[currentDateConverted.month - 1];
                
                // Use the current Gregorian month as the select value
                // The monthOptions should now have the correct label for the current date
                selectValue = String(currentGregorianMonth);
                const currentMonthOption = monthOptions.find(opt => opt.value === currentGregorianMonth);
                
                // Use the option's label if it matches, otherwise use the actual calendar month name
                if (currentMonthOption?.label === calendarMonthName) {
                  currentMonthLabel = calendarMonthName;
                } else {
                  // The option might have a different label (from day 15), so use the actual calendar month name
                  currentMonthLabel = calendarMonthName;
                }
              } else {
                // For Gregorian, just use the Gregorian month
                selectValue = String(currentGregorianMonth);
                const currentMonthOption = monthOptions.find(opt => opt.value === currentGregorianMonth);
                currentMonthLabel = currentMonthOption?.label || String(currentGregorianMonth);
              }
              
              return (
                <div className="flex justify-center pt-1 relative items-center gap-2">
                  <Select
                    value={String(currentGregorianYear)}
                    onValueChange={(value) => {
                      const selectedGregorianYear = parseInt(value);
                      const newMonth = new Date(currentMonth);
                      newMonth.setFullYear(selectedGregorianYear);
                      setMonth(newMonth);
                    }}
                  >
                    <SelectTrigger className="h-9 min-w-[90px] text-sm font-normal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {String(option.label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={selectValue}
                    onValueChange={(value) => {
                      const selectedGregorianMonth = parseInt(value);
                      const newMonth = new Date(currentMonth);
                      newMonth.setMonth(selectedGregorianMonth - 1);
                      setMonth(newMonth);
                    }}
                  >
                    <SelectTrigger className="h-9 min-w-[140px] text-sm font-normal">
                      <SelectValue>
                        <span>{currentMonthLabel}</span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            },
          }}
        />
        <div className="border-t p-2 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleTodayClick}
            disabled={isTodayDisabled}
            className="h-8 text-xs"
          >
            {t('events.today') || 'Today'}
          </Button>
        </div>
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
  startDate?: Date | string;
  endDate?: Date | string;
  onStartDateChange?: (date: Date | undefined) => void;
  onEndDateChange?: (date: Date | undefined) => void;
  startPlaceholder?: string;
  endPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

/** Date range type for react-day-picker range mode */
type DateRange = { from?: Date; to?: Date };

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
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentCalendar, setCurrentCalendar] = React.useState<CalendarType>(calendarState.get());
  const { language, t } = useLanguage();

  const fromDate = React.useMemo(() => {
    if (!startDate) return undefined;
    if (startDate instanceof Date) return isNaN(startDate.getTime()) ? undefined : startDate;
    const parsed = parseLocalDate(startDate);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }, [startDate]);

  const toDate = React.useMemo(() => {
    if (!endDate) return undefined;
    if (endDate instanceof Date) return isNaN(endDate.getTime()) ? undefined : endDate;
    const parsed = parseLocalDate(endDate);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }, [endDate]);

  const dateRange: DateRange = React.useMemo(
    () => ({ from: fromDate, to: toDate }),
    [fromDate, toDate]
  );

  React.useEffect(() => {
    const unsub = calendarState.subscribe(setCurrentCalendar);
    return unsub;
  }, []);

  const today = React.useMemo(() => {
    const n = new Date();
    n.setHours(0, 0, 0, 0);
    return n;
  }, []);
  const todayConverted = React.useMemo(() => getCachedConversion(today, currentCalendar), [today, currentCalendar]);

  const weekdayNames = React.useMemo(() => {
    const days = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    if (language === 'en') return ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    return days.map((day) => t(`academic.timetable.days.${day}`));
  }, [t, language]);

  const formatters = React.useMemo(() => {
    const base = {
      formatWeekdayName: (date: Date) => {
        const dayIndex = date.getDay();
        const idx = dayIndex === 6 ? 0 : dayIndex + 1;
        return weekdayNames[idx] ?? weekdayNames[0];
      },
      formatMonthDropdown: () => '',
      formatYearDropdown: () => '',
    };
    if (currentCalendar === 'gregorian') return base;
    const monthNames = MONTH_NAMES[currentCalendar][language] ?? MONTH_NAMES[currentCalendar]['en'];
    return {
      ...base,
      formatCaption: (date: Date) => {
        const c = getCachedConversion(date, currentCalendar);
        return `${monthNames[c.month - 1]} ${c.year}`;
      },
      formatDay: (date: Date) => String(getCachedConversion(date, currentCalendar).day),
    };
  }, [currentCalendar, language, weekdayNames]);

  const modifiers = React.useMemo(() => {
    const base: Record<string, Date | ((d: Date) => boolean)> = {
      friday: (d: Date) => d.getDay() === 5,
    };
    if (currentCalendar === 'gregorian') {
      return { ...base, today };
    }
    return {
      ...base,
      today: (d: Date) => {
        const c = getCachedConversion(d, currentCalendar);
        return c.year === todayConverted.year && c.month === todayConverted.month && c.day === todayConverted.day;
      },
    };
  }, [currentCalendar, today, todayConverted]);

  const modifierClassNames = React.useMemo(() => ({ friday: 'bg-red-50 text-red-700 hover:bg-red-100' }), []);

  const buttonLabel = React.useMemo(() => {
    if (fromDate && toDate) return `${formatDate(fromDate)} - ${formatDate(toDate)}`;
    if (fromDate) return formatDate(fromDate);
    return startPlaceholder;
  }, [fromDate, toDate, startPlaceholder]);

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from) onStartDateChange?.(range.from);
    else onStartDateChange?.(undefined);
    if (range?.to) onEndDateChange?.(range.to);
    else onEndDateChange?.(undefined);
    if (range?.from && range?.to) setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal px-2.5',
            !fromDate && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {buttonLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={handleSelect}
          defaultMonth={fromDate ?? toDate ?? new Date()}
          numberOfMonths={2}
          pagedNavigation
          disabled={(date) => {
            if (fromDate && !toDate && date < fromDate) return true;
            return false;
          }}
          formatters={formatters}
          modifiers={modifiers}
          modifiersClassNames={modifierClassNames}
          weekStartsOn={6}
          className="p-2"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-3 sm:space-x-3 sm:space-y-0",
            month: "space-y-2",
            caption: "flex justify-center pt-0.5 relative items-center gap-2",
            table: "w-full border-collapse space-y-0.5",
            head_cell:
              "text-muted-foreground rounded w-10 min-w-[2.5rem] font-normal text-[0.7rem] px-0.5 truncate",
            row: "flex w-full mt-1",
            cell: "h-8 w-10 min-w-[2.5rem] text-center text-xs p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: "h-8 w-10 min-w-[2.5rem] p-0 text-xs font-normal rounded-md aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            day_range_end: "day-range-end",
            day_selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
            day_outside:
              "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
            day_disabled: "text-muted-foreground opacity-50",
            day_range_middle:
              "aria-selected:bg-accent aria-selected:text-accent-foreground",
            day_hidden: "invisible",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
