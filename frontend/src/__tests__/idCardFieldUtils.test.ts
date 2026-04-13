import { describe, expect, it } from 'vitest';

import {
  deriveExpiryDateFromCreatedDate,
  formatIdCardFontFamilyForCanvas,
  formatIdCardFontFamilyToken,
  formatIdCardDateValue,
  ID_CARD_RTL_FONT_FALLBACK_STACK,
  resolveIdCardDefaultFontFamily,
  resolveIdCardFieldValue,
  scaleUniformImageDimensions,
} from '@/lib/idCards/idCardFieldUtils';

describe('idCardFieldUtils', () => {
  const student = {
    id: 'student-utils-1',
    fullName: 'Latest Student',
    fatherName: 'Latest Father',
    studentCode: 'STD-001',
    admissionNumber: 'ADM-001',
    cardNumber: null,
    roomNumber: 'Room 7',
    notes: 'Live notes',
    createdAt: new Date('2026-04-13T00:00:00.000Z'),
    currentClass: { id: 'class-1', name: 'Grade 9' },
    school: { id: 'school-1', schoolName: 'Nazim School' },
  } as any;

  it('resolves live preview values from the latest student record', () => {
    const layout = { fieldValues: {} };

    expect(resolveIdCardFieldValue('studentName', layout, { student })).toBe('Latest Student');
    expect(resolveIdCardFieldValue('fatherName', layout, { student })).toBe('Latest Father');
    expect(resolveIdCardFieldValue('studentCode', layout, { student })).toBe('STD-001');
    expect(resolveIdCardFieldValue('admissionNumber', layout, { student })).toBe('ADM-001');
    expect(resolveIdCardFieldValue('class', layout, { student })).toBe('Grade 9');
    expect(resolveIdCardFieldValue('room', layout, { student })).toBe('Room 7');
    expect(resolveIdCardFieldValue('schoolName', layout, { student })).toBe('Nazim School');
    expect(resolveIdCardFieldValue('cardNumber', layout, { student })).toBe('ADM-001');
  });

  it('formats created date and derives expiry from created date when needed', () => {
    const createdDate = student.createdAt;
    const expectedCreatedDate = formatIdCardDateValue(createdDate, 'en-US');
    const expectedExpiryDate = formatIdCardDateValue(
      deriveExpiryDateFromCreatedDate(createdDate),
      'en-US'
    );

    expect(
      resolveIdCardFieldValue('createdDate', { fieldValues: {} }, { student, locale: 'en-US' })
    ).toBe(expectedCreatedDate);
    expect(
      resolveIdCardFieldValue('expiryDate', { fieldValues: {} }, { student, locale: 'en-US' })
    ).toBe(expectedExpiryDate);
  });

  it('prefers saved layout overrides for editable date values', () => {
    expect(
      resolveIdCardFieldValue(
        'expiryDate',
        { fieldValues: { expiryDate: '2030-01-01' } },
        { student, locale: 'en-US' }
      )
    ).toBe(formatIdCardDateValue('2030-01-01', 'en-US'));
  });

  it('scales photo dimensions proportionally from a single size control', () => {
    expect(scaleUniformImageDimensions(8, 12, 10)).toEqual({ width: 10, height: 15 });
  });

  it('quotes multi-word font tokens and resolves RTL default stack with global font', () => {
    expect(formatIdCardFontFamilyToken('Bahij Titr')).toBe('"Bahij Titr"');
    expect(formatIdCardFontFamilyToken('Arial')).toBe('Arial');
    expect(resolveIdCardDefaultFontFamily(true, 'Bahij Titr')).toBe(
      `"Bahij Titr", ${ID_CARD_RTL_FONT_FALLBACK_STACK}`
    );
    expect(resolveIdCardDefaultFontFamily(true, null)).toBe(ID_CARD_RTL_FONT_FALLBACK_STACK);
    expect(resolveIdCardDefaultFontFamily(false, 'Bahij Titr')).toBe('"Bahij Titr"');
    expect(resolveIdCardDefaultFontFamily(false, undefined)).toBe('Arial');
  });

  it('formats font family for canvas (quote single multi-word family)', () => {
    expect(formatIdCardFontFamilyForCanvas('Bahij Titr')).toBe('"Bahij Titr"');
    expect(formatIdCardFontFamilyForCanvas(`"Bahij Titr", ${ID_CARD_RTL_FONT_FALLBACK_STACK}`)).toBe(
      `"Bahij Titr", ${ID_CARD_RTL_FONT_FALLBACK_STACK}`
    );
  });
});
