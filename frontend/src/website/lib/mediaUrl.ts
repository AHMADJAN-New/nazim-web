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
