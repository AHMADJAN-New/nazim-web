export type RankedStudent<T> = T & {
  computedRank: number;
};

type RankableStudent = {
  percentage?: number | null;
  is_absent?: boolean;
  ranking_eligible?: boolean;
};

/**
 * Returns every student in the requested number of distinct positions.
 * Equal percentages share a dense rank, so 100, 95, 95, 90 becomes
 * positions 1, 2, 2, 3 and all four students are included.
 */
export function getTopStudentsWithTies<T extends RankableStudent>(
  students: T[],
  minimumStudents = 3
): RankedStudent<T>[] {
  const sorted = students
    .filter(
      (student) =>
        !student.is_absent &&
        student.ranking_eligible !== false &&
        student.percentage !== null &&
        student.percentage !== undefined
    )
    .sort((left, right) => (right.percentage ?? 0) - (left.percentage ?? 0));

  let currentRank = 0;
  let previousPercentage: number | null = null;

  return sorted
    .map((student, index) => {
      if (index === 0 || student.percentage !== previousPercentage) {
        currentRank += 1;
      }
      previousPercentage = student.percentage ?? null;
      return { ...student, computedRank: currentRank };
    })
    .filter((student) => student.computedRank <= minimumStudents);
}
