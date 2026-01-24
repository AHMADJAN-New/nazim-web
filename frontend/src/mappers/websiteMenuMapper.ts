import type * as WebsiteMenuApi from '@/types/api/websiteMenu';
import type { WebsiteMenu } from '@/types/domain/websiteMenu';

/**
 * Convert API WebsiteMenu model to Domain WebsiteMenu model
 */
export function mapWebsiteMenuApiToDomain(api: WebsiteMenuApi.WebsiteMenu): WebsiteMenu {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    parentId: api.parent_id,
    label: api.label,
    url: api.url,
    sortOrder: api.sort_order,
    isVisible: api.is_visible,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Build tree structure from flat menu array
 */
export function buildMenuTree(menus: WebsiteMenu[]): WebsiteMenu[] {
  const menuMap = new Map<string, WebsiteMenu>();
  const rootMenus: WebsiteMenu[] = [];

  // First pass: create map and initialize children
  menus.forEach(menu => {
    menuMap.set(menu.id, { ...menu, children: [] });
  });

  // Second pass: build tree
  menus.forEach(menu => {
    const menuNode = menuMap.get(menu.id)!;
    if (menuNode) {
      if (menuNode.parentId) {
        const parent = menuMap.get(menuNode.parentId);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(menuNode);
        }
      } else {
        rootMenus.push(menuNode);
      }
    }
  });

  // Sort by sortOrder
  const sortMenus = (menus: WebsiteMenu[]) => {
    menus.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    menus.forEach(menu => {
      if (menu.children) {
        sortMenus(menu.children);
      }
    });
  };

  sortMenus(rootMenus);
  return rootMenus;
}

/**
 * Flatten tree structure to array
 */
export function flattenMenuTree(menus: WebsiteMenu[]): WebsiteMenu[] {
  const result: WebsiteMenu[] = [];
  
  const traverse = (menu: WebsiteMenu) => {
    const { children, ...menuWithoutChildren } = menu;
    result.push(menuWithoutChildren);
    if (children) {
      children.forEach(traverse);
    }
  };

  menus.forEach(traverse);
  return result;
}

/**
 * Convert Domain WebsiteMenu model to API WebsiteMenuInsert payload
 */
export function mapWebsiteMenuDomainToInsert(domain: Partial<WebsiteMenu>): WebsiteMenuApi.WebsiteMenuInsert {
  return {
    parent_id: domain.parentId,
    label: domain.label || '',
    url: domain.url || '',
    sort_order: domain.sortOrder,
    is_visible: domain.isVisible,
  };
}

/**
 * Convert Domain WebsiteMenu model to API WebsiteMenuUpdate payload
 */
export function mapWebsiteMenuDomainToUpdate(domain: Partial<WebsiteMenu>): WebsiteMenuApi.WebsiteMenuUpdate {
  return {
    parent_id: domain.parentId,
    label: domain.label,
    url: domain.url,
    sort_order: domain.sortOrder,
    is_visible: domain.isVisible,
  };
}

