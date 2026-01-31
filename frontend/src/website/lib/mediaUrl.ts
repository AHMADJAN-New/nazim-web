const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : '');

/**
 * Full base URL for API (origin + path), e.g. https://example.com/api or http://localhost:8000/api.
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  if (API_URL && (API_URL.startsWith('http://') || API_URL.startsWith('https://'))) {
    const u = new URL(API_URL);
    return u.origin + u.pathname.replace(/\/?$/, '');
  }
  return window.location.origin + (API_URL || '/api');
}

/**
 * Base URL for storage (Laravel serves /storage from same origin as API).
 * Use when frontend is on a different origin (e.g. Vite dev) so images load correctly.
 */
export function getStorageBaseUrl(): string {
  if (API_URL && (API_URL.startsWith('http://') || API_URL.startsWith('https://'))) {
    return new URL(API_URL).origin;
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
}

/**
 * Full URL for public scholar photo (no auth). Pass school_id from sessionStorage for public page.
 */
export function getPublicScholarPhotoUrl(scholarId: string, schoolId: string | null): string {
  const base = getApiBaseUrl();
  const path = `/public/website/scholars/${encodeURIComponent(scholarId)}/photo`;
  const qs = schoolId ? `?school_id=${encodeURIComponent(schoolId)}` : '';
  return base + path + qs;
}

/**
 * Full URL for admin scholar photo (auth required; use with fetch + credentials for img).
 * schoolId is required so the backend can resolve school context (current_school_id).
 */
export function getWebsiteScholarPhotoUrl(scholarId: string, schoolId: string | null): string {
  const base = getApiBaseUrl();
  const path = `${base}/website/scholars/${encodeURIComponent(scholarId)}/photo`;
  const qs = schoolId ? `?current_school_id=${encodeURIComponent(schoolId)}` : '';
  return path + qs;
}

/**
 * Resolve website media file path to a URL for display.
 * Handles storage paths (e.g. organizations/.../website/images/...) and absolute URLs.
 */
export function resolveMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
    return path;
  }
  return `/storage/${path}`;
}

/**
 * Full URL for storage paths (for img src when frontend may be on different origin).
 */
export function resolveMediaFullUrl(path: string | null | undefined): string {
  const relative = resolveMediaUrl(path);
  if (!relative) return '';
  if (relative.startsWith('http')) return relative;
  return getStorageBaseUrl() + relative;
}
