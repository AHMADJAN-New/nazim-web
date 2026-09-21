import { describe, expect, it } from 'vitest';

import { getTopStudentsWithTies } from './studentRanking';

describe('getTopStudentsWithTies', () => {
  it('includes every student tied with the third student', () => {
    const result = getTopStudentsWithTies([
      { name: 'A', percentage: 100 },
      { name: 'B', percentage: 95 },
      { name: 'C', percentage: 90 },
      { name: 'D', percentage: 90 },
      { name: 'E', percentage: 80 },
    ]);

    expect(result.map((student) => student.name)).toEqual(['A', 'B', 'C', 'D']);
    expect(result.map((student) => student.computedRank)).toEqual([1, 2, 3, 3]);
  });

  it('returns three distinct positions instead of only three students', () => {
    const result = getTopStudentsWithTies([
      { name: 'A', percentage: 100 },
      { name: 'B', percentage: 95 },
      { name: 'C', percentage: 95 },
      { name: 'D', percentage: 90 },
      { name: 'E', percentage: 85 },
    ]);

    expect(result.map((student) => student.name)).toEqual(['A', 'B', 'C', 'D']);
    expect(result.map((student) => student.computedRank)).toEqual([1, 2, 2, 3]);
  });

  it('excludes absent students and students without a percentage', () => {
    const result = getTopStudentsWithTies([
      { name: 'A', percentage: 100 },
      { name: 'Absent', percentage: 99, is_absent: true },
      { name: 'Missing', percentage: null },
      { name: 'B', percentage: 90 },
    ]);

    expect(result.map((student) => student.name)).toEqual(['A', 'B']);
  });

  it('excludes students explicitly marked ineligible for ranking', () => {
    const result = getTopStudentsWithTies([
      { name: 'No configured total', percentage: 0, ranking_eligible: false },
      { name: 'No entered marks', percentage: 0, ranking_eligible: false },
      { name: 'Valid result', percentage: 75, ranking_eligible: true },
    ]);

    expect(result.map((student) => student.name)).toEqual(['Valid result']);
    expect(result[0].computedRank).toBe(1);
  });
});
