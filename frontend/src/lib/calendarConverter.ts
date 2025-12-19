/**
 * Calendar Conversion Utilities
 * Converts between Gregorian, Hijri Shamsi (Solar/Jalali), and Hijri Qamari (Lunar/Islamic) calendars
 */

import { toJalaali, toGregorian } from 'jalaali-js';
import type { CalendarType } from './datePreferences';

export interface ConvertedDate {
  year: number;
  month: number; // 1-12
  day: number;
  calendar: CalendarType;
}

/**
 * Convert Gregorian date to Hijri Shamsi (Solar/Jalali)
 */
export function gregorianToHijriShamsi(date: Date): ConvertedDate {
  const jalaaliDate = toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return {
    year: jalaaliDate.jy,
    month: jalaaliDate.jm,
    day: jalaaliDate.jd,
    calendar: 'hijri_shamsi',
  };
}

/**
 * Convert Hijri Shamsi (Solar/Jalali) to Gregorian date
 */
export function hijriShamsiToGregorian(year: number, month: number, day: number): Date {
  const gregorianDate = toGregorian(year, month, day);
  return new Date(gregorianDate.gy, gregorianDate.gm - 1, gregorianDate.gd);
}

/**
 * Convert Gregorian date to Hijri Qamari (Lunar/Islamic)
 * Uses the Intl API with Islamic calendar
 */
export function gregorianToHijriQamari(date: Date): ConvertedDate {
  // Create formatter for Islamic calendar
  const formatter = new Intl.DateTimeFormat('en-u-ca-islamic', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '0');
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '0');

  return {
    year,
    month,
    day,
    calendar: 'hijri_qamari',
  };
}

/**
 * Convert any date to the specified calendar type
 */
export function convertToCalendar(date: Date | string, targetCalendar: CalendarType): ConvertedDate {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check for invalid date
  if (isNaN(dateObj.getTime())) {
    // Return current date as fallback
    const now = new Date();
    return convertToCalendar(now, targetCalendar);
  }

  switch (targetCalendar) {
    case 'hijri_shamsi':
      return gregorianToHijriShamsi(dateObj);
    case 'hijri_qamari':
      return gregorianToHijriQamari(dateObj);
    case 'gregorian':
    default:
      return {
        year: dateObj.getFullYear(),
        month: dateObj.getMonth() + 1, // Convert to 1-12
        day: dateObj.getDate(),
        calendar: 'gregorian',
      };
  }
}

/**
 * Get the number of days in a month for a given calendar
 */
export function getDaysInMonth(year: number, month: number, calendar: CalendarType): number {
  switch (calendar) {
    case 'hijri_shamsi':
      // Jalali calendar: first 6 months have 31 days, next 5 have 30, last has 29/30
      if (month <= 6) return 31;
      if (month <= 11) return 30;
      // Check for leap year
      return isJalaaliLeapYear(year) ? 30 : 29;

    case 'hijri_qamari':
      // Islamic calendar: months alternate between 30 and 29 days
      // with the last month having 30 days in leap years
      if (month === 12) {
        return isIslamicLeapYear(year) ? 30 : 29;
      }
      return month % 2 === 1 ? 30 : 29;

    case 'gregorian':
    default:
      // Use JavaScript Date API
      return new Date(year, month, 0).getDate();
  }
}

/**
 * Check if a Jalali year is a leap year
 */
function isJalaaliLeapYear(year: number): boolean {
  // Jalali leap year calculation
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  let jp = breaks[0];
  let jump = 0;

  for (let i = 1; i < breaks.length; i++) {
    const jm = breaks[i];
    jump = jm - jp;
    if (year < jm) break;
    jp = jm;
  }

  let n = year - jp;

  if (jump - n < 6) {
    n = n - jump + ((jump + 4) / 33) * 33;
  }

  let leap = ((((n + 1) % 33) - 1) % 4);
  if (leap === -1) leap = 4;

  return leap === 0;
}

/**
 * Check if an Islamic year is a leap year
 * Islamic leap years follow a 30-year cycle
 */
function isIslamicLeapYear(year: number): boolean {
  const cycle = year % 30;
  const leapYears = [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29];
  return leapYears.includes(cycle);
}

/**
 * Format a date number with leading zero
 */
export function padNumber(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

/**
 * Convert numbers to Persian/Arabic numerals if needed
 */
export function convertNumerals(num: number | string, language: string): string {
  const str = String(num);

  if (language === 'fa' || language === 'ps') {
    // Persian numerals
    const persianNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return str.replace(/\d/g, (d) => persianNumerals[parseInt(d)]);
  }

  if (language === 'ar') {
    // Arabic numerals
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return str.replace(/\d/g, (d) => arabicNumerals[parseInt(d)]);
  }

  return str;
}
