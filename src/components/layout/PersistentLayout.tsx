import { SmartSidebar } from "@/components/navigation/SmartSidebar";
import { AppHeader } from "./AppHeader";
import { Outlet, useLocation } from "react-router-dom";
import { useMemo } from "react";

export function PersistentLayout() {
  const location = useLocation();
  
  // Extract page title from path (optional - can be enhanced)
  const pageTitle = useMemo(() => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return 'Dashboard';
    // Add more title mappings as needed
    return '';
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <SmartSidebar />
      
      <div className="flex-1 flex flex-col">
        <AppHeader 
          title={pageTitle}
          showBreadcrumb={false}
          breadcrumbItems={[]}
        />
        
        <div className="flex-1 overflow-auto custom-scrollbar">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

