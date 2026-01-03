/**
 * Date Preference Hook and Provider
 * Manages user's preferred calendar type (Gregorian, Hijri Shamsi, Hijri Qamari)
 */

import { format } from 'date-fns';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { convertToCalendar, padNumber, convertNumerals, type ConvertedDate } from '@/lib/calendarConverter';
import { calendarState } from '@/lib/calendarState';
import type { CalendarType, DatePreference } from '@/lib/datePreferences';
import { CALENDAR_TYPES, DEFAULT_DATE_FORMATS, DATE_PREFERENCE_KEY, MONTH_NAMES, SHORT_MONTH_NAMES } from '@/lib/datePreferences';
import type { Language } from '@/lib/i18n';

interface DateFormatterOptions {
  includeTime?: boolean;
  shortMonth?: boolean;
  shortDate?: boolean;
  convertNumerals?: boolean;
  customFormat?: string;
}

interface DatePreferenceContextType {
  calendar: CalendarType;
  setCalendar: (calendar: CalendarType) => void;
  preference: DatePreference;
  formatDate: (date: Date | string, options?: DateFormatterOptions) => string;
  formatDateTime: (date: Date | string, options?: DateFormatterOptions) => string;
  formatShortDate: (date: Date | string, options?: DateFormatterOptions) => string;
  getMonthName: (monthNumber: number, language: Language, short?: boolean) => string;
  convertedDate: (date: Date | string) => ConvertedDate;
}

const DatePreferenceContext = createContext<DatePreferenceContextType | undefined>(undefined);

interface DatePreferenceProviderProps {
  children: ReactNode;
  defaultCalendar?: CalendarType;
}

export function DatePreferenceProvider({ children, defaultCalendar = 'gregorian' }: DatePreferenceProviderProps) {
  const [calendar, setCalendarState] = useState<CalendarType>(() => {
    // Get from localStorage or use default
    const saved = localStorage.getItem(DATE_PREFERENCE_KEY);
    const cal = (saved as CalendarType) || defaultCalendar;
    // Validate calendar type
    return Object.values(CALENDAR_TYPES).includes(cal) ? cal : defaultCalendar;
  });

  const setCalendar = (cal: CalendarType) => {
    // Only set if it's a valid calendar type
    if (Object.values(CALENDAR_TYPES).includes(cal)) {
      setCalendarState(cal);
      localStorage.setItem(DATE_PREFERENCE_KEY, cal);
      // Sync with global state
      calendarState.set(cal);
    }
  };

  // Sync calendar changes with global state
  useEffect(() => {
    calendarState.set(calendar);
  }, [calendar]);

  const preference = DEFAULT_DATE_FORMATS[calendar];

  /**
   * Get the month name for a given month number (1-12) in the current calendar
   */
  const getMonthName = (monthNumber: number, language: Language, short = false): string => {
    const monthIndex = monthNumber - 1; // Convert to 0-based index
    const monthNames = short ? SHORT_MONTH_NAMES : MONTH_NAMES;
    return monthNames[calendar][language]?.[monthIndex] || monthNames[calendar]['en'][monthIndex] || '';
  };

  /**
   * Convert a date to the user's preferred calendar
   */
  const convertedDate = (date: Date | string): ConvertedDate => {
    return convertToCalendar(date, calendar);
  };

  /**
   * Format a date according to user's preferred calendar
   */
  const formatDateWithOptions = (date: Date | string, options: DateFormatterOptions = {}, includeTime = false): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Check for invalid date
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    // If using Gregorian calendar, use date-fns format
    if (calendar === 'gregorian') {
      let formatStr = options.customFormat || (includeTime ? preference.dateTimeFormat : preference.dateFormat);
      if (options.shortDate) {
        formatStr = preference.shortDateFormat;
      }
      return format(dateObj, formatStr);
    }

    // Convert to preferred calendar
    const converted = convertToCalendar(dateObj, calendar);

    // Determine which language to use for month names
    // This should ideally come from the LanguageContext, but for now we'll default to 'en'
    // You can pass language through options if needed
    const language: Language = 'en'; // Default, can be extended

    // Get month name
    const monthName = getMonthName(converted.month, language, options.shortMonth);

    // Format the date
    let formattedDate = '';
    if (options.customFormat) {
      // Simple custom format support
      formattedDate = options.customFormat
        .replace('MMMM', monthName)
        .replace('MMM', getMonthName(converted.month, language, true))
        .replace('MM', padNumber(converted.month))
        .replace('M', String(converted.month))
        .replace('dd', padNumber(converted.day))
        .replace('d', String(converted.day))
        .replace('yyyy', String(converted.year))
        .replace('yy', String(converted.year).slice(-2));
    } else if (options.shortDate) {
      formattedDate = `${getMonthName(converted.month, language, true)} ${padNumber(converted.day)}`;
    } else {
      formattedDate = `${monthName} ${converted.day}, ${converted.year}`;
    }

    // Add time if needed
    if (includeTime) {
      const hours = dateObj.getHours();
      const minutes = dateObj.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12;
      formattedDate += ` ${hours12}:${padNumber(minutes)} ${ampm}`;
    }

    // Convert numerals if requested
    if (options.convertNumerals) {
      const lang = language; // Use the language from context
      formattedDate = convertNumerals(formattedDate, lang);
    }

    return formattedDate;
  };

  const formatDateFn = (date: Date | string, options?: DateFormatterOptions): string => {
    return formatDateWithOptions(date, options, false);
  };

  const formatDateTimeFn = (date: Date | string, options?: DateFormatterOptions): string => {
    return formatDateWithOptions(date, { ...options, includeTime: true }, true);
  };

  const formatShortDateFn = (date: Date | string, options?: DateFormatterOptions): string => {
    return formatDateWithOptions(date, { ...options, shortDate: true }, false);
  };

  const value: DatePreferenceContextType = {
    calendar,
    setCalendar,
    preference,
    formatDate: formatDateFn,
    formatDateTime: formatDateTimeFn,
    formatShortDate: formatShortDateFn,
    getMonthName,
    convertedDate,
  };

  return <DatePreferenceContext.Provider value={value}>{children}</DatePreferenceContext.Provider>;
}

/**
 * Hook to use date preferences
 * Must be used within DatePreferenceProvider
 */
export function useDatePreference() {
  const context = useContext(DatePreferenceContext);
  if (context === undefined) {
    throw new Error('useDatePreference must be used within a DatePreferenceProvider');
  }
  return context;
}

/**
 * Hook to format dates with the user's preferred calendar
 * This is a convenience hook that only provides formatting functions
 */
export function useDateFormatter() {
  const { formatDate, formatDateTime, formatShortDate, calendar } = useDatePreference();
  return { formatDate, formatDateTime, formatShortDate, calendar };
}
