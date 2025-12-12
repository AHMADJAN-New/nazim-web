import type { Grade } from '@/types/domain/grade';
import type { Language } from '@/lib/i18n';

/**
 * Find the grade that matches a given percentage
 * @param percentage - The percentage to match (0-100)
 * @param grades - Array of grades sorted by order (descending)
 * @returns The matching grade or null if no match found
 */
export function findGradeByPercentage(percentage: number | null | undefined, grades: Grade[]): Grade | null {
  if (percentage === null || percentage === undefined || !grades || grades.length === 0) {
    return null;
  }

  // Find the first grade where percentage falls within the range
  // Grades are sorted by order (descending), so we check from highest to lowest
  for (const grade of grades) {
    if (percentage >= grade.minPercentage && percentage <= grade.maxPercentage) {
      return grade;
    }
  }

  return null;
}

/**
 * Get the localized grade name
 * @param grade - The grade object
 * @param language - Current language ('en', 'ar', 'ps', 'fa')
 * @returns The localized grade name
 */
export function getGradeName(grade: Grade | null, language: Language = 'en'): string {
  if (!grade) return '-';

  switch (language) {
    case 'ar':
      return grade.nameAr;
    case 'ps':
      return grade.namePs;
    case 'fa':
      return grade.nameFa;
    case 'en':
    default:
      return grade.nameEn;
  }
}

/**
 * Calculate grade from percentage with localized name
 * @param percentage - The percentage to match (0-100)
 * @param grades - Array of grades sorted by order (descending)
 * @param language - Current language ('en', 'ar', 'ps', 'fa')
 * @returns Object with grade details or null
 */
export function calculateGrade(
  percentage: number | null | undefined,
  grades: Grade[],
  language: Language = 'en'
): { grade: Grade; name: string; isPass: boolean } | null {
  const grade = findGradeByPercentage(percentage, grades);
  
  if (!grade) return null;

  return {
    grade,
    name: getGradeName(grade, language),
    isPass: grade.isPass,
  };
}

