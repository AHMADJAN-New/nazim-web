import { describe, expect, it, vi } from 'vitest';

import { fetchAllClassSubjectMarkSheetRows } from '@/lib/reporting/classSubjectMarkSheetExport';

describe('fetchAllClassSubjectMarkSheetRows', () => {
  it('merges students from all pages', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          exam: { id: 'e1', name: 'Exam' },
          class: { id: 'c1', name: 'Class 10' },
          subject: { id: 's1', name: 'Math' },
          students: [{ id: 'st1' }, { id: 'st2' }],
        },
        current_page: 1,
        last_page: 2,
      })
      .mockResolvedValueOnce({
        data: {
          exam: { id: 'e1', name: 'Exam' },
          class: { id: 'c1', name: 'Class 10' },
          subject: { id: 's1', name: 'Math' },
          students: [{ id: 'st3' }],
        },
        current_page: 2,
        last_page: 2,
      });

    const report = await fetchAllClassSubjectMarkSheetRows(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 1);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2);
    expect(report.students?.map((student: { id: string }) => student.id)).toEqual(['st1', 'st2', 'st3']);
  });
});
