import { useEffect, useRef } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { isPublicWebsiteHost, getMainAppUrl } from '@/lib/publicWebsiteHost';
import { LoadingSpinner } from '@/components/ui/loading';

/** Paths that are allowed on school subdomains (public website only). */
function isPublicPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  return (
    p === '/public-site' ||
    p.startsWith('/public-site/') ||
    p === '/page' ||
    p.startsWith('/page/') ||
    p === '/verify' ||
    p.startsWith('/verify/') ||
    p === '/maintenance'
  );
}

/**
 * When on a school subdomain (e.g. gd.nazim.cloud):
 * - "/" → redirect to "/public-site" (school homepage).
 * - Any non-public path (e.g. /dashboard, /auth) → full redirect to main app (nazim.cloud).
 * Otherwise renders children (Outlet) so the app behaves as usual on the main domain.
 */
export function HostAwareRoot() {
  const { pathname, search } = useLocation();
  const onSubdomain = isPublicWebsiteHost();

  // Subdomain root: show school public site (must run first so we don't redirect / to main domain)
  if (onSubdomain && (pathname === '/' || pathname === '')) {
    return <Navigate to="/public-site" replace />;
  }

  const mainOrigin = getMainAppUrl();
  const shouldRedirectToMain = onSubdomain && !isPublicPath(pathname);
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!shouldRedirectToMain || !mainOrigin || didRedirect.current) return;
    didRedirect.current = true;
    window.location.replace(`${mainOrigin}${pathname}${search || ''}`);
  }, [shouldRedirectToMain, mainOrigin, pathname, search]);

  // Subdomain + non-public path (e.g. /dashboard, /auth) → full redirect to main domain
  if (shouldRedirectToMain && mainOrigin) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/30">
        <LoadingSpinner />
      </div>
    );
  }

  return <Outlet />;
}
