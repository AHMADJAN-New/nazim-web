import type { Language } from '@/lib/i18n';

import { permissionsManagementCatalogAr } from './ar';
import { permissionsManagementCatalogEn } from './en';
import { permissionsManagementCatalogFa } from './fa';
import { permissionsManagementCatalogPs } from './ps';
import type { PermissionsManagementCatalog } from './types';

const CATALOGS: Record<Language, PermissionsManagementCatalog> = {
  en: permissionsManagementCatalogEn,
  ps: permissionsManagementCatalogPs,
  fa: permissionsManagementCatalogFa,
  ar: permissionsManagementCatalogAr,
};

export function getPermissionsManagementCatalog(lang: Language): PermissionsManagementCatalog {
  return CATALOGS[lang] ?? CATALOGS.en;
}

export type { PermissionCatalogEntry, PermissionsManagementCatalog, RoleCatalogEntry } from './types';
