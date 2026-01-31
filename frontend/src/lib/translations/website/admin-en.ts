/**
 * Website admin area translations (English).
 * Used for: Website Manager page, editor UI, sidebar labels in the main app.
 * Edit this file for all website section copy inside the app (sidebar + manager).
 */

import type { WebsiteAdminTranslations } from './types';

export const websiteAdminEn: WebsiteAdminTranslations = {
  websiteManager: {
    title: 'Website Manager',
    subtitle: 'Manage public site content, branding, and domains per school',
    planCompleteEnterprise: 'Complete/Enterprise',
    openPublicSite: 'Open public site',
    settings: 'Settings',
    pages: 'Pages',
    posts: 'Announcements',
    events: 'Events',
    media: 'Media',
    domains: 'Domains',
    brandingSettings: 'Branding & Language',
    schoolSlug: 'School slug',
    defaultLanguage: 'Default language',
    enabledLanguages: 'Enabled languages (comma separated)',
    primaryColor: 'Primary color',
    secondaryColor: 'Secondary color',
    accentColor: 'Accent color',
    fontFamily: 'Font family',
    saveSettings: 'Save settings',
    noPages: 'No pages yet. Create your first page from the builder.',
    noPosts: 'No announcements yet. Publish your first post.',
    noEvents: 'No upcoming events. Add events to the calendar.',
    noMedia: 'No media uploaded yet.',
    noDomains: 'No domains connected yet.',
    public: 'Public',
    private: 'Private'
  },
  website: {
    editor: {
      placeholder: 'Start typing...',
      loading: 'Loading editor...',
      toolbar: {
        bold: 'Bold',
        italic: 'Italic',
        heading1: 'Heading 1',
        heading2: 'Heading 2',
        heading3: 'Heading 3',
        bulletList: 'Bullet List',
        orderedList: 'Ordered List',
        blockquote: 'Quote',
        link: 'Link',
        image: 'Image',
        undo: 'Undo',
        redo: 'Redo'
      },
      link: {
        title: 'Insert Link',
        description: 'Enter the URL for the link',
        url: 'URL',
        insert: 'Insert'
      },
      image: {
        title: 'Insert Image',
        description: 'Enter image URL or upload a file',
        url: 'Image URL',
        or: 'OR',
        upload: 'Upload Image',
        insert: 'Insert'
      }
    }
  },
  /** Sidebar: merged into main nav. Keys must match nav usage (e.g. websiteManager, 'websiteManager.settings'). */
  navWebsite: {
    websiteManager: 'Website Manager',
    'websiteManager.settings': 'Settings',
    'websiteManager.navigation': 'Navigation',
    'websiteManager.pages': 'Pages',
    'websiteManager.announcements': 'Announcements',
    'websiteManager.courses': 'Courses & Programs',
    'websiteManager.articles': 'Articles & Blog',
    'websiteManager.library': 'Library & Books',
    'websiteManager.events': 'Events',
    'websiteManager.admissions': 'Online Admissions',
    'websiteManager.gallery': 'Gallery Albums',
    'websiteManager.media': 'Media Library',
    'websiteManager.scholars': 'Scholars & Staff',
    'websiteManager.graduates': 'Graduates',
    'websiteManager.donations': 'Donations',
    'websiteManager.fatwas': 'Questions & Fatwas',
    'websiteManager.inbox': 'Inbox',
    'websiteManager.seo': 'SEO Tools',
    'websiteManager.users': 'Users & Roles',
    'websiteManager.audit': 'Audit Logs',
    'websiteManager.openPublicSite': 'Open Public Site'
  }
};
