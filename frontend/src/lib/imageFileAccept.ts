/**
 * `accept` value for profile-style image file inputs.
 *
 * Android Chrome/WebView often opens the camera for `image/*` even without `capture`
 * (unlike Safari on iOS). Listing concrete MIME types and extensions steers the OS
 * toward gallery / file picker while matching our usual allowlist (jpg, png, gif, webp).
 */
export const IMAGE_UPLOAD_ACCEPT =
  'image/jpeg,image/jpg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp';

const PROFILE_PICTURE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const PROFILE_PICTURE_EXT = /\.(jpe?g|png|gif|webp)$/i;

/**
 * Client-side check aligned with profile picture uploads. Android sometimes returns
 * `application/octet-stream` or an empty `type` for gallery picks; fall back to extension.
 */
export function isAllowedProfilePictureFile(file: File): boolean {
  const t = (file.type || '').toLowerCase();
  if (PROFILE_PICTURE_MIME.has(t)) return true;
  if (t === '' || t === 'application/octet-stream') {
    return PROFILE_PICTURE_EXT.test(file.name);
  }
  return false;
}
