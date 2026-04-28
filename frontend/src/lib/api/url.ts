/**
 * API URL helpers.
 *
 * Why: when the app is loaded from `file://` (Electron packaged bundle),
 * relative URLs like `/api/...` resolve to `file:///api/...` and fail.
 * These helpers force an HTTP origin in that case.
 */
export function getBackendOrigin(): string {
  if (typeof window === 'undefined') return 'http://127.0.0.1:8000';
  if (window.location.protocol === 'file:') return 'http://127.0.0.1:8000';
  return window.location.origin;
}

export function apiUrl(pathname: string): string {
  return new URL(pathname, getBackendOrigin()).toString();
}

