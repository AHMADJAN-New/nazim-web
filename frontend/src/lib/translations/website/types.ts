/**
 * Type definitions for website translations.
 * Used by public (marketing + school public site) and admin (main app website section + sidebar).
 * Keep keys in sync with public-*.ts and admin-*.ts files.
 */

/** Public website: marketing landing, about us, school public portal (websitePublic) */
export interface WebsitePublicTranslations {
  aboutUs: Record<string, unknown>;
  landing: Record<string, unknown>;
  websitePublic: Record<string, unknown>;
}

/** Admin area: Website Manager page, editor UI, sidebar labels (nav) */
export interface WebsiteAdminTranslations {
  websiteManager: Record<string, unknown>;
  website: Record<string, unknown>;
  /** Keys merged into main nav for sidebar (e.g. websiteManager, 'websiteManager.settings') */
  navWebsite: Record<string, string>;
}
