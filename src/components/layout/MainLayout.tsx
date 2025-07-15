import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { Toaster } from "@/components/ui/toaster";

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBreadcrumb?: boolean;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
}

export function MainLayout({ 
  children, 
  title, 
  showBreadcrumb = false, 
  breadcrumbItems = [] 
}: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <AppHeader 
            title={title}
            showBreadcrumb={showBreadcrumb}
            breadcrumbItems={breadcrumbItems}
          />
          
          <main className="flex-1 p-6 custom-scrollbar overflow-auto">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}