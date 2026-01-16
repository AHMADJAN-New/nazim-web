// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { vi } from 'vitest';

import { useSubscriptionGateStatus } from '../hooks/useSubscription';

const requestMock = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { id: 'user-1', organization_id: 'org-1', role: 'admin' },
  }),
}));

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    request: (...args: any[]) => requestMock(...args),
  },
}));

describe('useSubscriptionGateStatus', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('maps /subscription/status-lite response into gate status domain shape', async () => {
    requestMock.mockResolvedValueOnce({
      data: {
        status: 'active',
        access_level: 'full',
        can_read: true,
        can_write: true,
        trial_ends_at: null,
        grace_period_ends_at: null,
        readonly_period_ends_at: null,
        message: 'Active subscription',
      },
    });

    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSubscriptionGateStatus(), { wrapper });

    await waitFor(() => expect(requestMock).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      status: 'active',
      accessLevel: 'full',
      canRead: true,
      canWrite: true,
      message: 'Active subscription',
    });
  });

  it('returns null (not error) when API returns 403 (no organization)', async () => {
    requestMock.mockRejectedValueOnce({ status: 403 });

    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSubscriptionGateStatus(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});

