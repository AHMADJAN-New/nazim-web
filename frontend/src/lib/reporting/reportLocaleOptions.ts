import type { CalendarType } from '@/lib/datePreferences';
import { calendarState } from '@/lib/calendarState';
import type { ServerReportOptions } from '@/lib/reporting/serverReportTypes';

export type ReportLanguage = NonNullable<ServerReportOptions<Record<string, unknown>>['language']>;
export type ReportCalendarPreference = NonNullable<ServerReportOptions<Record<string, unknown>>['calendarPreference']>;

export function mapLanguageToReportCode(language: string): ReportLanguage {
  if (language === 'ps') return 'ps';
  if (language === 'fa') return 'fa';
  if (language === 'ar') return 'ar';
  return 'en';
}

export function mapCalendarToReportPreference(calendar: CalendarType): ReportCalendarPreference {
  if (calendar === 'hijri_shamsi') return 'jalali';
  if (calendar === 'hijri_qamari') return 'qamari';
  return 'gregorian';
}

export function getReportLocaleOptions(language: string): {
  language: ReportLanguage;
  calendarPreference: ReportCalendarPreference;
} {
  return {
    language: mapLanguageToReportCode(language),
    calendarPreference: mapCalendarToReportPreference(calendarState.get()),
  };
}
