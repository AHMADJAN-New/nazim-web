import { afterEach, describe, expect, it, vi } from 'vitest';

import { calendarState } from '@/lib/calendarState';
import {
  getReportLocaleOptions,
  mapCalendarToReportPreference,
  mapLanguageToReportCode,
} from '@/lib/reporting/reportLocaleOptions';

describe('reportLocaleOptions', () => {
  afterEach(() => {
    calendarState.set('gregorian');
  });

  describe('mapLanguageToReportCode', () => {
    it.each([
      ['en', 'en'],
      ['ps', 'ps'],
      ['fa', 'fa'],
      ['ar', 'ar'],
      ['unknown', 'en'],
    ] as const)('maps %s to %s', (input, expected) => {
      expect(mapLanguageToReportCode(input)).toBe(expected);
    });
  });

  describe('mapCalendarToReportPreference', () => {
    it.each([
      ['gregorian', 'gregorian'],
      ['hijri_shamsi', 'jalali'],
      ['hijri_qamari', 'qamari'],
    ] as const)('maps %s to %s', (input, expected) => {
      expect(mapCalendarToReportPreference(input)).toBe(expected);
    });
  });

  describe('getReportLocaleOptions', () => {
    it('combines UI language with current calendar preference', () => {
      calendarState.set('hijri_shamsi');

      expect(getReportLocaleOptions('ps')).toEqual({
        language: 'ps',
        calendarPreference: 'jalali',
      });
    });
  });
});
