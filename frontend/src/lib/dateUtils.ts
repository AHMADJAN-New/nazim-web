/**
 * Local date utilities for YYYY-MM-DD handling.
 * Use these instead of new Date("YYYY-MM-DD") and date.toISOString().split("T")[0]
 * to avoid timezone-related off-by-one-day bugs.
 */

/**
 * Parse a "YYYY-MM-DD" string as local midnight.
 * Do not use new Date(ymd) — that parses as UTC midnight and causes wrong day in many timezones.
 */
export function parseLocalDate(ymd: string): Date {
  if (!ymd || typeof ymd !== 'string') {
    return new Date(NaN);
  }
  const parts = ymd.trim().split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return new Date(NaN);
  }
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

/**
 * Format a Date as "YYYY-MM-DD" using local date parts.
 * Do not use toISOString().split("T")[0] — that uses UTC and can shift the calendar day.
 */
export function dateToLocalYYYYMMDD(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Format date for display (re-export from utils for backward compatibility). */
export { formatDate } from '@/lib/utils';

/**
 * Format a date for use in an input value (YYYY-MM-DD). Accepts Date or string.
 */
export function formatDateForInput(date: Date | string | undefined | null): string {
  if (date == null) return '';
  if (typeof date === 'string') return date;
  return dateToLocalYYYYMMDD(date);
}

/**
 * Truncate a string to a maximum length with ellipsis.
 */
export function getShortDescription(str: string | undefined | null, maxLen: number): string {
  if (str == null) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen).trim() + '…';
}
