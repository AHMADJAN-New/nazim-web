/**
 * Website translations: public (marketing + school portal) and admin (main app website section).
 * Two files per language for easy editing:
 * - public-{lang}.ts  → aboutUs, landing, websitePublic
 * - admin-{lang}.ts   → websiteManager, website (editor), navWebsite (sidebar)
 */

export { websitePublicEn } from './public-en';
export { websiteAdminEn } from './admin-en';
export { websitePublicPs } from './public-ps';
export { websiteAdminPs } from './admin-ps';
export { websitePublicFa } from './public-fa';
export { websiteAdminFa } from './admin-fa';
export { websitePublicAr } from './public-ar';
export { websiteAdminAr } from './admin-ar';

export type { WebsitePublicTranslations, WebsiteAdminTranslations } from './types';
