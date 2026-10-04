type LeaveSchoolNames = {
  schoolName?: string | null;
  schoolNamePashto?: string | null;
  schoolNameArabic?: string | null;
};

/**
 * Pick the school name for the current UI language.
 * Falls back to the stored English name, and replaces the default
 * "Main School" suffix when a localized label is provided.
 */
export function displayLeaveSchoolName(
  school: LeaveSchoolNames,
  language: string,
  mainSchoolLabel: string,
): string | null {
  const preferred =
    language === 'ps'
      ? school.schoolNamePashto
      : language === 'ar'
        ? school.schoolNameArabic
        : language === 'fa'
          ? school.schoolNameArabic || school.schoolNamePashto
          : school.schoolName;

  const raw = (preferred && preferred.trim()) || school.schoolName || null;
  if (!raw) return null;
  if (language === 'en') return raw;

  if (/^Main School$/i.test(raw)) {
    return mainSchoolLabel;
  }

  if (/-\s*Main School$/i.test(raw)) {
    return raw.replace(/\s*-\s*Main School$/i, ` - ${mainSchoolLabel}`);
  }

  return raw;
}
