import { useMemo, useState, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { AppHeader } from "./AppHeader";

import { SmartSidebar } from "@/components/navigation/SmartSidebar";
import { SubscriptionStatusBanner } from "@/components/subscription/SubscriptionStatusBanner";
import { LoadingSpinner } from "@/components/ui/loading";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useUserPermissions } from "@/hooks/usePermissions";
import { useSubscriptionErrorHandler } from "@/hooks/useSubscriptionErrorHandler";

export function PersistentLayout() {
  const location = useLocation();
  const { isRTL } = useLanguage();
  const { profile } = useAuth();
  const { data: permissions, isLoading } = useUserPermissions();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  
  // Handle global subscription errors (shows toasts and redirects as needed)
  useSubscriptionErrorHandler();
  
  // Extract page title from path (optional - can be enhanced)
  const pageTitle = useMemo(() => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return 'Dashboard';
    // Add more title mappings as needed
    return '';
  }, [location.pathname]);

  // Wait for permissions to load before rendering routes
  // This prevents the flash of "Access Denied" messages
  // All users need permissions loaded
  
  // Permissions are ready if:
  // 1. We have a profile with organization_id (query can run)
  // 2. Query is not loading (has completed or is disabled)
  // 3. We have permissions data (even if empty array)
  const hasProfile = profile?.organization_id !== undefined && profile !== null;
  const queryCanRun = hasProfile && !isLoading;
  // With placeholderData and initialData, permissions should always be an array, never undefined
  const hasPermissionsData = Array.isArray(permissions);
  const permissionsReady = hasProfile && queryCanRun && hasPermissionsData;
  
  // Show loading state if permissions are not ready
  // This blocks ALL routes from rendering until permissions are ready
  const showLoading = !permissionsReady;
  
  // Don't show banner on the subscription page itself
  const isSubscriptionPage = location.pathname.startsWith('/subscription');
  const showBanner = !bannerDismissed && !isSubscriptionPage;
  
  const handleDismissBanner = useCallback(() => {
    setBannerDismissed(true);
    // Auto-show again after 1 hour
    setTimeout(() => setBannerDismissed(false), 60 * 60 * 1000);
  }, []);

  return (
    <div className="min-h-screen flex w-full bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="relative z-50 flex-shrink-0 isolate bg-sidebar" style={{ contain: 'layout style paint' }}>
        <SmartSidebar />
      </div>
      
      <div className="flex-1 min-w-0 min-h-0 flex flex-col relative z-10">
        <AppHeader 
          title={pageTitle}
          showBreadcrumb={false}
          breadcrumbItems={[]}
        />
        
        {/* Spacer to account for fixed header height on mobile only */}
        <div className="h-14 sm:h-16 md:hidden flex-shrink-0" aria-hidden="true" />
        
        {/* Subscription status banner - shows for trial, grace, readonly, blocked */}
        {showBanner && permissionsReady && (
          <div className="px-4 py-2 border-b bg-background flex-shrink-0">
            <SubscriptionStatusBanner 
              compact={true}
              onDismiss={handleDismissBanner}
              showUsageWarnings={true}
            />
          </div>
        )}
        
        <div className={`flex-1 min-h-0 custom-scrollbar min-w-0 relative ${showLoading ? 'overflow-clip' : 'overflow-y-auto overflow-x-hidden'}`} style={{ contain: 'layout style' }}>
          {showLoading ? (
            <div className="absolute left-0 right-0 top-0 bottom-0 flex items-center justify-center bg-background z-10" style={{ contain: 'strict', clipPath: 'inset(0)' }}>
              <LoadingSpinner size="lg" text="Loading permissions..." />
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  );
}
