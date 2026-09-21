export type TopStudentGroupableRow = {
  classId: string;
  className: string;
};

export type TopStudentClassGroup<T extends TopStudentGroupableRow> = {
  classId: string;
  className: string;
  rows: T[];
};

/**
 * Groups top-student rows by class, preserving first-seen class order.
 */
export function groupTopStudentsByClass<T extends TopStudentGroupableRow>(
  rows: T[]
): TopStudentClassGroup<T>[] {
  const groups = new Map<string, TopStudentClassGroup<T>>();

  for (const row of rows) {
    const existing = groups.get(row.classId);
    if (existing) {
      existing.rows.push(row);
      continue;
    }

    groups.set(row.classId, {
      classId: row.classId,
      className: row.className || row.classId,
      rows: [row],
    });
  }

  return Array.from(groups.values());
}
