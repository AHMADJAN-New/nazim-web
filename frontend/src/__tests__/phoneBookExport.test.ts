import { describe, expect, it, vi } from 'vitest';

import { fetchAllPhoneBookEntriesForExport } from '@/lib/reporting/phoneBookExport';
import type { PhoneBookEntry } from '@/types/domain/phoneBook';

const makeEntry = (id: string): PhoneBookEntry => ({
  id,
  name: `Name ${id}`,
  phone: `07000000${id}`,
  email: null,
  category: 'staff',
  relation: null,
  student_name: null,
  admission_no: null,
  employee_id: null,
  donor_id: null,
  guest_id: null,
  contact_person: null,
  address: null,
  notes: null,
});

describe('fetchAllPhoneBookEntriesForExport', () => {
  it('fetches and combines all paginated phonebook pages', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        data: [makeEntry('1'), makeEntry('2')],
        current_page: 1,
        last_page: 2,
      })
      .mockResolvedValueOnce({
        data: [makeEntry('3')],
        current_page: 2,
        last_page: 2,
      });

    const result = await fetchAllPhoneBookEntriesForExport(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 1);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2);
    expect(result.map((entry) => entry.id)).toEqual(['1', '2', '3']);
  });

  it('returns empty array when no rows are returned', async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      data: [],
      current_page: 1,
      last_page: 1,
    });

    const result = await fetchAllPhoneBookEntriesForExport(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });
});
