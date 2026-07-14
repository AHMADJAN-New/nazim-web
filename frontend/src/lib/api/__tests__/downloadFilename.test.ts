import { describe, expect, it } from 'vitest';

import {
  parseContentDispositionFilename,
  sanitizeBrowserDownloadFilename,
} from '@/lib/api/client';

describe('sanitizeBrowserDownloadFilename', () => {
  it('strips leading hyphen produced by non-Latin title sanitization', () => {
    expect(
      sanitizeBrowserDownloadFilename(
        '-__________1_2026-07-14_203417_44f2724c-6972-412c-9eec-0bc765dec4cc.xlsx'
      )
    ).toBe('1_2026-07-14_203417_44f2724c-6972-412c-9eec-0bc765dec4cc.xlsx');
  });

  it('falls back when name is only underscores/hyphens', () => {
    expect(sanitizeBrowserDownloadFilename('----------.xlsx', 'exam_seating_map')).toBe(
      'exam_seating_map.xlsx'
    );
  });
});

describe('parseContentDispositionFilename', () => {
  it('parses unquoted Content-Disposition with leading hyphen', () => {
    const header =
      'attachment; filename=-__________1_2026-07-14_203417_44f2724c-6972-412c-9eec-0bc765dec4cc.xlsx';
    expect(parseContentDispositionFilename(header)).toBe(
      '1_2026-07-14_203417_44f2724c-6972-412c-9eec-0bc765dec4cc.xlsx'
    );
  });

  it('parses quoted filename', () => {
    expect(parseContentDispositionFilename('attachment; filename="seat-map.xlsx"')).toBe(
      'seat-map.xlsx'
    );
  });
});
