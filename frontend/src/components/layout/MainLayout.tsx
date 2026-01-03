import { Toaster } from "@/components/ui/toaster";

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBreadcrumb?: boolean;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
}

// MainLayout is now just a content wrapper
// The sidebar and header are handled by PersistentLayout at the App level
export function MainLayout({ 
  children, 
  title, 
  showBreadcrumb = false, 
  breadcrumbItems = [] 
}: MainLayoutProps) {
  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
      {children}
      <Toaster />
    </div>
  );
}
