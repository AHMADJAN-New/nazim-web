import { describe, expect, it } from 'vitest';

import { displayLeaveSchoolName } from './leaveSchoolName';

describe('displayLeaveSchoolName', () => {
  it('keeps the English name when the UI language is English', () => {
    expect(
      displayLeaveSchoolName(
        { schoolName: 'zia ul madaris - Main School' },
        'en',
        'Main School',
      ),
    ).toBe('zia ul madaris - Main School');
  });

  it('translates the default Main School suffix for Pashto', () => {
    expect(
      displayLeaveSchoolName(
        { schoolName: 'zia ul madaris - Main School' },
        'ps',
        'اصلي ښوونځی',
      ),
    ).toBe('zia ul madaris - اصلي ښوونځی');
  });

  it('prefers the Pashto school name when one is stored', () => {
    expect(
      displayLeaveSchoolName(
        {
          schoolName: 'zia ul madaris - Main School',
          schoolNamePashto: 'ضیا العلوم مدارس',
        },
        'ps',
        'اصلي ښوونځی',
      ),
    ).toBe('ضیا العلوم مدارس');
  });

  it('uses the Arabic name for Arabic and Dari when available', () => {
    expect(
      displayLeaveSchoolName(
        { schoolName: 'Main School', schoolNameArabic: 'المدرسة الرئيسية' },
        'ar',
        'المدرسة الرئيسية',
      ),
    ).toBe('المدرسة الرئيسية');
  });
});
