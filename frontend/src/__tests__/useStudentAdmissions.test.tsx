// @vitest-environment jsdom
// @ts-nocheck
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import { studentAdmissionsApi } from '@/lib/api/client';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { id: 'user-1', organization_id: 'org-1', default_school_id: 'school-1' },
  }),
}));

vi.mock('@/lib/api/client', () => ({
  studentAdmissionsApi: {
    list: vi.fn(() => Promise.resolve([])),
  },
}));

describe('useStudentAdmissions', () => {
  it('passes original province filter to admissions API', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useStudentAdmissions('org-1', false, { orig_province: 'Kabul' } as any), { wrapper });

    await waitFor(() => {
      expect(studentAdmissionsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org-1',
          orig_province: 'Kabul',
        })
      );
    });
  });
});
