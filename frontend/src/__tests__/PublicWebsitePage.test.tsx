// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PublicWebsitePage from '@/pages/website/PublicWebsitePage';

const getSite = vi.fn();

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/api/client', () => ({
  publicWebsiteApi: {
    getSite: (...args: unknown[]) => getSite(...args),
  },
}));

describe('PublicWebsitePage', () => {
  it('renders public site content from the API', async () => {
    getSite.mockResolvedValueOnce({
      settings: { school_slug: 'alhuda' },
      school: { school_name: 'Al Huda School' },
      posts: [{ id: 'post-1', title: 'Welcome', excerpt: 'Hello families' }],
      events: [{ id: 'event-1', title: 'Open Day', starts_at: '2024-02-01', summary: 'Join us' }],
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PublicWebsitePage />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Al Huda School')).toBeTruthy();
    expect(screen.getByText('Welcome')).toBeTruthy();
    expect(screen.getByText('Open Day')).toBeTruthy();
  });
});
