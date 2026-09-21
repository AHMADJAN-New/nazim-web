import { describe, expect, it } from 'vitest';

import { groupTopStudentsByClass } from '@/lib/reporting/topStudentsGrouping';

describe('groupTopStudentsByClass', () => {
  it('groups rows by classId and preserves first-seen class order', () => {
    const groups = groupTopStudentsByClass([
      { classId: 'c1', className: 'Class 10A', studentName: 'Ahmad' },
      { classId: 'c2', className: 'Class 10B', studentName: 'Omar' },
      { classId: 'c1', className: 'Class 10A', studentName: 'Ali' },
    ]);

    expect(groups.map((group) => group.classId)).toEqual(['c1', 'c2']);
    expect(groups[0].rows.map((row) => row.studentName)).toEqual(['Ahmad', 'Ali']);
    expect(groups[1].rows.map((row) => row.studentName)).toEqual(['Omar']);
  });

  it('returns an empty array for empty input', () => {
    expect(groupTopStudentsByClass([])).toEqual([]);
  });
});
