type TranslateFn = (key: string) => string;

const VALUE_KEYS: Record<string, string> = {
  active: 'admissions.active',
  pending: 'admissions.pending',
  admitted: 'admissions.admitted',
  inactive: 'admissions.inactive',
  withdrawn: 'admissions.withdrawn',
  suspended: 'students.suspended',
  graduated: 'students.graduated',
  male: 'students.male',
  female: 'students.female',
  afghan: 'studentHistory.afghan',
  pashto: 'studentHistory.pashto',
  ps: 'studentHistory.pashto',
  dari: 'studentHistory.dari',
  fa: 'studentHistory.dari',
  farsi: 'studentHistory.farsi',
  persian: 'studentHistory.farsi',
  arabic: 'studentHistory.arabic',
  ar: 'studentHistory.arabic',
  english: 'studentHistory.english',
  en: 'studentHistory.english',
  guardian: 'students.guardian',
  father: 'students.father',
  mother: 'studentHistory.mother',
  paid: 'studentHistory.paid',
  unpaid: 'studentHistory.unpaid',
  partial: 'studentHistory.partial',
  overdue: 'studentHistory.overdue',
  returned: 'studentHistory.returned',
  borrowed: 'studentHistory.borrowed',
  completed: 'studentHistory.completed',
  enrolled: 'studentHistory.enrolled',
  dropped: 'studentHistory.dropped',
  failed: 'studentHistory.failed',
  fail: 'studentHistory.failed',
  passed: 'studentHistory.passed',
  pass: 'studentHistory.passed',
  conditional: 'studentHistory.conditional',
  boarder: 'studentHistory.boarder',
};

/**
 * Translate stored enum-like student-history values.
 * Free-text names and addresses are returned unchanged.
 */
export function translateStudentHistoryValue(
  value: string | number | boolean | null | undefined,
  t: TranslateFn,
  empty = '—'
): string {
  if (value === null || value === undefined || value === '') {
    return empty;
  }

  if (typeof value === 'boolean') {
    return value ? t('common.yes') : t('common.no');
  }

  const raw = String(value).trim();
  const normalized = raw.toLowerCase().replace(/[-\s]+/g, '_');
  const translationKey = VALUE_KEYS[normalized] ?? VALUE_KEYS[raw.toLowerCase()];

  if (translationKey) {
    return t(translationKey);
  }

  return raw;
}
