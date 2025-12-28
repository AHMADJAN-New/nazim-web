import { SmartSidebar } from "@/components/navigation/SmartSidebar";
import { AppHeader } from "./AppHeader";
import { Outlet, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useUserPermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/loading";

export function PersistentLayout() {
  const location = useLocation();
  const { isRTL } = useLanguage();
  const { profile } = useAuth();
  const { data: permissions, isLoading } = useUserPermissions();
  
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

  return (
    <div className="min-h-screen flex w-full bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <SmartSidebar />
      
      <div className="flex-1 flex flex-col">
        <AppHeader 
          title={pageTitle}
          showBreadcrumb={false}
          breadcrumbItems={[]}
        />
        
        <div className="flex-1 overflow-auto custom-scrollbar">
          {showLoading ? (
            <div className="flex items-center justify-center h-full">
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

