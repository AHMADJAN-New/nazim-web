import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { formatDate as adapterFormatDate, formatDateTime as adapterFormatDateTime } from './calendarAdapter';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as currency
 * @param amount The amount to format
 * @param currency The currency code (default: 'AFN' for Afghan Afghani)
 * @param locale The locale to use for formatting (default: 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = 'AFN',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Resolve currency code for an account: use account's currency when set, otherwise base.
 * Use this so account currency is kept intact wherever amounts are account-scoped.
 */
export function getAccountCurrencyCode(
  account: { currency?: { code: string } | null } | null | undefined,
  baseCode: string
): string {
  return account?.currency?.code ?? baseCode;
}

/**
 * Format a date for display
 * Now uses the calendar adapter to respect user's calendar preference
 * @param date The date to format (Date object or string)
 * @param locale The locale to use for formatting (default: 'en-US')
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  locale: string = 'en-US'
): string {
  // Delegate to calendar adapter which handles calendar conversion
  return adapterFormatDate(date, locale);
}

/**
 * Format a date and time for display
 * Now uses the calendar adapter to respect user's calendar preference
 * @param date The date to format (Date object or string)
 * @param locale The locale to use for formatting (default: 'en-US')
 * @returns Formatted date and time string
 */
export function formatDateTime(
  date: Date | string,
  locale: string = 'en-US'
): string {
  // Delegate to calendar adapter which handles calendar conversion
  return adapterFormatDateTime(date, locale);
}
