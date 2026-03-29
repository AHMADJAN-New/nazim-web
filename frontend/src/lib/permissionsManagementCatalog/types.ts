export interface RoleCatalogEntry {
  title: string;
  description: string;
}

export interface PermissionCatalogEntry {
  actionLabel: string;
  description: string;
}

export interface PermissionsManagementCatalog {
  roles: Record<string, RoleCatalogEntry>;
  featureSections: Record<string, string>;
  permissions: Record<string, PermissionCatalogEntry>;
}
