import type { LibraryBook, LibraryCategory } from '@/types/domain/library';

/** API may send legacy string `category`, nested relation object, or only `category_id`. */
export type LibraryBookCategorySource = LibraryBook & {
    category?: string | { name?: string | null } | null;
    categoryId?: string | null;
};

/**
 * Resolve display name for a library book category (table, sheet, filters).
 * `categories` may come from React Query (`unknown` until narrowed).
 */
export function getLibraryBookCategoryName(
    book: LibraryBookCategorySource,
    categories?: unknown,
): string | null {
    const cid = book.category_id ?? book.categoryId ?? null;
    const rel = book.category;

    if (rel && typeof rel === 'object' && rel !== null && 'name' in rel) {
        const n = (rel as { name?: string | null }).name;
        if (typeof n === 'string' && n.trim()) return n.trim();
    }
    if (typeof rel === 'string' && rel.trim()) return rel.trim();

    const list = Array.isArray(categories) ? (categories as LibraryCategory[]) : null;
    if (cid != null && cid !== '' && list?.length) {
        const idStr = String(cid);
        const hit = list.find((c) => String(c.id) === idStr);
        if (hit?.name?.trim()) return hit.name.trim();
    }

    return null;
}
