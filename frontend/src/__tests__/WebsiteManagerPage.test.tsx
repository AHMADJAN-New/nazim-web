// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WebsiteManagerPage from '@/pages/website/WebsiteManagerPage';

const updateSettings = {
  mutate: vi.fn(),
  isPending: false,
};

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/useWebsiteManager', () => ({
  useWebsiteSettings: () => ({
    data: {
      school_slug: 'alhuda',
      default_language: 'en',
      enabled_languages: ['en', 'ar'],
      theme: {
        primary_color: '#0b0b56',
        secondary_color: '#0056b3',
        accent_color: '#ff6b35',
        font_family: 'Bahij Nassim',
      },
    },
  }),
  useUpdateWebsiteSettings: () => updateSettings,
  useWebsitePages: () => ({
    data: [{ id: 'page-1', title: 'Home', slug: 'home', status: 'published' }],
  }),
  useWebsitePosts: () => ({
    data: [{ id: 'post-1', title: 'Welcome', slug: 'welcome', status: 'published' }],
  }),
  useWebsiteEvents: () => ({
    data: [{ id: 'event-1', title: 'Open Day', starts_at: '2024-02-01', is_public: true }],
  }),
  useWebsiteMedia: () => ({
    data: [{ id: 'media-1', file_name: 'hero.jpg', type: 'image' }],
  }),
  useWebsiteDomains: () => ({
    data: [{ id: 'domain-1', domain: 'school.example.com', ssl_status: 'active', verification_status: 'verified' }],
  }),
}));

describe('WebsiteManagerPage', () => {
  beforeEach(() => {
    updateSettings.mutate.mockClear();
  });

  it('renders website manager sections with data', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <WebsiteManagerPage />
      </MemoryRouter>
    );

    expect(screen.getByText('websiteManager.title')).toBeTruthy();

    await user.click(screen.getByRole('tab', { name: 'websiteManager.pages' }));
    expect(screen.getByText('Home')).toBeTruthy();

    await user.click(screen.getByRole('tab', { name: 'websiteManager.posts' }));
    expect(screen.getByText('Welcome')).toBeTruthy();

    await user.click(screen.getByRole('tab', { name: 'websiteManager.events' }));
    expect(screen.getByText('Open Day')).toBeTruthy();

    await user.click(screen.getByRole('tab', { name: 'websiteManager.media' }));
    expect(screen.getByText('hero.jpg')).toBeTruthy();

    await user.click(screen.getByRole('tab', { name: 'websiteManager.domains' }));
    expect(screen.getByText('school.example.com')).toBeTruthy();
  });

  it('submits updated settings with parsed languages', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <WebsiteManagerPage />
      </MemoryRouter>
    );

    const slugInput = screen.getByLabelText('websiteManager.schoolSlug');
    await user.clear(slugInput);
    await user.type(slugInput, 'new-school');

    const languagesInput = screen.getByLabelText('websiteManager.enabledLanguages');
    await user.clear(languagesInput);
    await user.type(languagesInput, 'en, ar, ps');

    const [saveButton] = screen.getAllByRole('button', { name: 'websiteManager.saveSettings' });
    await user.click(saveButton);

    expect(updateSettings.mutate).toHaveBeenCalledWith({
      school_slug: 'new-school',
      default_language: 'en',
      enabled_languages: ['en', 'ar', 'ps'],
      theme: {
        primary_color: '#0b0b56',
        secondary_color: '#0056b3',
        accent_color: '#ff6b35',
        font_family: 'Bahij Nassim',
      },
      is_public: true,
    });
  });
});
