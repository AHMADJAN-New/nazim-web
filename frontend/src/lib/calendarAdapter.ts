/**
 * Calendar Adapter - Global Date Formatting Functions
 * These functions read from the global calendar state and format dates accordingly
 * Can be used anywhere (components, utilities, etc.)
 */

import { format as dateFnsFormat } from 'date-fns';
import { calendarState } from './calendarState';
import { convertToCalendar, padNumber } from './calendarConverter';
import { MONTH_NAMES, SHORT_MONTH_NAMES } from './datePreferences';
import type { Language } from './i18n';

/**
 * Format a date according to the user's preferred calendar
 * This is a drop-in replacement for the existing formatDate function
 */
export function formatDate(date: Date | string, locale: string = 'en-US'): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Check for invalid date
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    const calendar = calendarState.get();

    // If using Gregorian calendar, use date-fns format
    if (calendar === 'gregorian') {
      return dateFnsFormat(dateObj, 'MMM d, yyyy');
    }

    // Convert to preferred calendar
    const converted = convertToCalendar(dateObj, calendar);

    // Determine language from locale (simple mapping)
    const language = getLanguageFromLocale(locale);

    // Get month name
    const monthName = MONTH_NAMES[calendar][language]?.[converted.month - 1] ||
                      MONTH_NAMES[calendar]['en'][converted.month - 1];

    // Format: "Hamal 15, 1403"
    return `${monthName} ${converted.day}, ${converted.year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

/**
 * Format a date with time according to the user's preferred calendar
 */
export function formatDateTime(date: Date | string, locale: string = 'en-US'): string {
  try {
    // Ensure we have a valid Date object
    let dateObj: Date;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      return 'Invalid Date';
    }

    // Check if dateObj is a valid Date instance
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    const calendar = calendarState.get();

    // If using Gregorian calendar, use date-fns format
    if (calendar === 'gregorian') {
      return dateFnsFormat(dateObj, 'MMM d, yyyy h:mm a');
    }

    // Convert to preferred calendar
    const converted = convertToCalendar(dateObj, calendar);

    // Determine language from locale
    const language = getLanguageFromLocale(locale);

    // Get month name
    const monthName = MONTH_NAMES[calendar][language]?.[converted.month - 1] ||
                      MONTH_NAMES[calendar]['en'][converted.month - 1];

    // Format time
    const hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;

    // Format: "Hamal 15, 1403 3:30 PM"
    return `${monthName} ${converted.day}, ${converted.year} ${hours12}:${padNumber(minutes)} ${ampm}`;
  } catch (error) {
    console.error('Error formatting date/time:', error);
    return 'Invalid Date';
  }
}

/**
 * Format a short date according to the user's preferred calendar
 */
export function formatShortDate(date: Date | string, locale: string = 'en-US'): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Check for invalid date
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    const calendar = calendarState.get();

    // If using Gregorian calendar, use date-fns format
    if (calendar === 'gregorian') {
      return dateFnsFormat(dateObj, 'MMM dd');
    }

    // Convert to preferred calendar
    const converted = convertToCalendar(dateObj, calendar);

    // Determine language from locale
    const language = getLanguageFromLocale(locale);

    // Get short month name
    const monthName = SHORT_MONTH_NAMES[calendar][language]?.[converted.month - 1] ||
                      SHORT_MONTH_NAMES[calendar]['en'][converted.month - 1];

    // Format: "Hamal 15"
    return `${monthName} ${padNumber(converted.day)}`;
  } catch (error) {
    console.error('Error formatting short date:', error);
    return 'Invalid Date';
  }
}

/**
 * Format a date for display in a specific format pattern
 * This is a more flexible version that accepts custom format strings
 */
export function formatDatePattern(date: Date | string, pattern: string, locale: string = 'en-US'): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Check for invalid date
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    const calendar = calendarState.get();

    // If using Gregorian calendar, use date-fns format
    if (calendar === 'gregorian') {
      return dateFnsFormat(dateObj, pattern);
    }

    // For non-Gregorian calendars, convert and format manually
    const converted = convertToCalendar(dateObj, calendar);
    const language = getLanguageFromLocale(locale);

    // Simple pattern replacement
    let result = pattern
      .replace('MMMM', MONTH_NAMES[calendar][language]?.[converted.month - 1] || MONTH_NAMES[calendar]['en'][converted.month - 1])
      .replace('MMM', SHORT_MONTH_NAMES[calendar][language]?.[converted.month - 1] || SHORT_MONTH_NAMES[calendar]['en'][converted.month - 1])
      .replace('MM', padNumber(converted.month))
      .replace('M', String(converted.month))
      .replace('dd', padNumber(converted.day))
      .replace('d', String(converted.day))
      .replace('yyyy', String(converted.year))
      .replace('yy', String(converted.year).slice(-2));

    // Add time formatting if pattern includes time tokens
    if (pattern.includes('h') || pattern.includes('H') || pattern.includes('m') || pattern.includes('a')) {
      const hours = dateObj.getHours();
      const minutes = dateObj.getMinutes();
      const seconds = dateObj.getSeconds();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12;

      result = result
        .replace('HH', padNumber(hours))
        .replace('H', String(hours))
        .replace('hh', padNumber(hours12))
        .replace('h', String(hours12))
        .replace('mm', padNumber(minutes))
        .replace('m', String(minutes))
        .replace('ss', padNumber(seconds))
        .replace('s', String(seconds))
        .replace('a', ampm.toLowerCase())
        .replace('A', ampm);
    }

    return result;
  } catch (error) {
    console.error('Error formatting date with pattern:', error);
    return 'Invalid Date';
  }
}

/**
 * Helper function to extract language from locale string
 */
function getLanguageFromLocale(locale: string): Language {
  const lang = locale.split('-')[0].toLowerCase();
  switch (lang) {
    case 'fa':
    case 'ps':
    case 'ar':
      return lang as Language;
    default:
      return 'en';
  }
}
