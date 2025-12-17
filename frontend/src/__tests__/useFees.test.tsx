// @ts-nocheck
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { vi } from 'vitest';
import { useFeeStructures } from '../hooks/useFees';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { id: 'user-1', organization_id: 'org-1', role: 'admin' },
  }),
}));

vi.mock('@/lib/api/client', () => {
  const sampleStructure = {
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
    created_at: '2024-01-01',
    updated_at: '2024-01-02',
    deleted_at: null,
  };

  return {
    feeStructuresApi: {
      list: vi.fn(() => Promise.resolve([sampleStructure])),
    },
  };
});

describe('useFeeStructures', () => {
  it('fetches fee structures', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useFeeStructures(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]).toMatchObject({ name: 'Grade 1 Monthly Fee', fee_type: 'monthly' });
  });
});

