// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { useFeeStructures } from '@/hooks/useFees';

const listMock = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { id: 'user-1', organization_id: 'org-1', role: 'admin' },
  }),
}));

vi.mock('@/lib/api/client', () => ({
  feeStructuresApi: {
    list: (...args: any[]) => listMock(...args),
  },
}));

describe('useFeeStructures (pagination)', () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  it('maps paginated response and exposes pagination meta', async () => {
    listMock.mockResolvedValueOnce({
      data: [
        {
          id: 'fs-1',
          organization_id: 'org-1',
          school_id: null,
          academic_year_id: 'ay-1',
          class_id: null,
          class_academic_year_id: null,
          name: 'Grade 1 Monthly Fee',
          code: 'G1_MONTHLY',
          description: null,
          fee_type: 'monthly',
          amount: 500,
          currency_id: null,
          due_date: '2024-01-31',
          start_date: '2024-01-01',
          end_date: null,
          is_active: true,
          is_required: true,
          display_order: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          deleted_at: null,
        },
      ],
      current_page: 1,
      from: 1,
      last_page: 1,
      per_page: 25,
      to: 1,
      total: 1,
      path: '',
      first_page_url: '',
      last_page_url: '',
      next_page_url: null,
      prev_page_url: null,
    });

    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useFeeStructures(undefined, true), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(listMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org-1',
        page: 1,
        per_page: 25,
      })
    );
    expect(result.current.data).toHaveLength(1);
    expect(result.current.pagination).toMatchObject({
      current_page: 1,
      per_page: 25,
      total: 1,
    });
  });
});
