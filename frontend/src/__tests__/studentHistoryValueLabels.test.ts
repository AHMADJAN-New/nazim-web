import { describe, expect, it, vi } from 'vitest';

import { translateStudentHistoryValue } from '@/lib/studentHistoryValueLabels';

describe('translateStudentHistoryValue', () => {
  const t = vi.fn((key: string) => key);

  it.each([
    ['active', 'admissions.active'],
    ['pending', 'admissions.pending'],
    ['male', 'students.male'],
    ['Afghan', 'studentHistory.afghan'],
    ['Pashto', 'studentHistory.pashto'],
    ['guardian', 'students.guardian'],
    ['paid', 'studentHistory.paid'],
    ['returned', 'studentHistory.returned'],
    ['completed', 'studentHistory.completed'],
  ])('maps %s to a translation key', (value, expectedKey) => {
    t.mockClear();
    expect(translateStudentHistoryValue(value, t)).toBe(expectedKey);
    expect(t).toHaveBeenCalledWith(expectedKey);
  });

  it('leaves free-text names unchanged', () => {
    expect(translateStudentHistoryValue('Ahmad Jan', t)).toBe('Ahmad Jan');
    expect(t).not.toHaveBeenCalledWith('Ahmad Jan');
  });

  it('returns a dash for empty values', () => {
    expect(translateStudentHistoryValue(null, t)).toBe('—');
    expect(translateStudentHistoryValue('', t)).toBe('—');
  });
});
