/**
 * Host-based routing: school subdomains (e.g. gd.nazim.cloud) show only the public
 * school website; main app (login, dashboard) lives on the main domain (nazim.cloud).
 */

const BASE_DOMAIN = (import.meta.env.VITE_PUBLIC_SITE_DOMAIN as string) || '';
const MAIN_APP_URL = (import.meta.env.VITE_APP_URL as string) || '';

/**
 * True when the current host is a school subdomain (e.g. gd.nazim.cloud, demo.nazim.cloud),
 * i.e. not the main app domain (nazim.cloud or www.nazim.cloud).
 * In dev (localhost) or when BASE_DOMAIN is unset, returns false so the full app is shown.
 */
export function isPublicWebsiteHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  if (!BASE_DOMAIN || host === 'localhost' || host === '127.0.0.1') return false;
  const base = BASE_DOMAIN.toLowerCase().replace(/^\.+/, '');
  // Subdomain: host ends with .nazim.cloud and is not exactly nazim.cloud or www.nazim.cloud
  if (!host.endsWith('.' + base) && host !== base) return false;
  if (host === base || host === 'www.' + base) return false;
  return true;
}

/**
 * Origin (scheme + host) of the main app, for redirecting login/dashboard from subdomains.
 * E.g. https://nazim.cloud. Falls back to current origin in dev when VITE_APP_URL is unset.
 */
export function getMainAppUrl(): string {
  if (MAIN_APP_URL) return MAIN_APP_URL.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

/**
 * Full URL to the main app login page. Use for "Login" links on the public school website
 * so users are sent to nazim.cloud/auth instead of staying on the subdomain.
 */
export function getMainAppLoginUrl(): string {
  return `${getMainAppUrl()}/auth`;
}
