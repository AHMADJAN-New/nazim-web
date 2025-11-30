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
    <div className="p-6">
      {children}
      <Toaster />
    </div>
  );
}