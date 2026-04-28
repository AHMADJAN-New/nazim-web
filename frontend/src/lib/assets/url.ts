/**
 * Asset URL helper.
 *
 * Why: when the app is loaded from `file://` (Electron packaged bundle),
 * absolute URLs like `/nazim_logo.webp` resolve to `file:///D:/nazim_logo.webp`
 * and fail. Using Vite's BASE_URL keeps paths correct for both dev and bundled builds.
 */
export function assetUrl(relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, '');
  // In dev this is usually '/', in our packaged build (vite --base=./) it's './'
  return `${import.meta.env.BASE_URL}${clean}`;
}

