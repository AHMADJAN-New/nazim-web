// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import ProtectedRoute from '@/components/ProtectedRoute';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    loading: false,
    profile: { id: 'user-1', organization_id: 'org-1', role: 'admin' },
    profileLoading: false,
  }),
}));

vi.mock('@/hooks/useProfiles', () => ({
  useProfile: () => ({ data: null, isLoading: false }),
}));

vi.mock('@/hooks/useSubscription', async () => {
  const actual = await vi.importActual<any>('@/hooks/useSubscription');
  return {
    ...actual,
    useSubscriptionGateStatus: () => ({
      data: {
        status: 'expired',
        accessLevel: 'none',
        canRead: false,
        canWrite: false,
        trialEndsAt: null,
        gracePeriodEndsAt: null,
        readonlyPeriodEndsAt: null,
        message: 'Expired',
      },
      isLoading: false,
    }),
  };
});

describe('ProtectedRoute subscription gating', () => {
  it('hard-redirects to /subscription when gate status is blocked/expired', async () => {
    // Make window.location writable so we can assert on href changes.
    const originalLocation = window.location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = { pathname: '/dashboard', href: '/dashboard' };

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireOrganization>
                <div>Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route path="/subscription" element={<div>Subscription</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(window.location.href).toBe('/subscription');
    });

    // Restore
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = originalLocation;
  });
});

