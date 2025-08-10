// @ts-nocheck
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { vi } from 'vitest';
import { useStudents } from '../hooks/useStudents';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: '1',
              user_id: '1',
              student_id: 'S1',
              admission_date: '2024-01-01',
              status: 'active',
              branch_id: 'B1',
              created_at: '2024-01-01',
              updated_at: '2024-01-01'
            }
          ],
          error: null
        })
      }))
    }))
  }
}));

describe('useStudents', () => {
  it('fetches students', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useStudents(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]).toMatchObject({ student_id: 'S1' });
  });
});
