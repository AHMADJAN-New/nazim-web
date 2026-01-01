import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Users,
  Package,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  TrendingUp,
  Clock,
  RefreshCw,
  Ticket,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

interface PlatformAdminLayoutProps {
  children: React.ReactNode;
}

export function PlatformAdminLayout({ children }: PlatformAdminLayoutProps) {
  const { t } = useLanguage();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    // CRITICAL: Before logging out, restore main app token if it existed
    const mainAppTokenBackup = localStorage.getItem('main_app_token_backup');
    const isPlatformAdminSession = localStorage.getItem('is_platform_admin_session') === 'true';
    
    // Log out from platform admin
    await signOut();
    
    // Restore main app token if it existed
    if (isPlatformAdminSession && mainAppTokenBackup) {
      localStorage.setItem('api_token', mainAppTokenBackup);
      localStorage.removeItem('main_app_token_backup');
    }
    
    // Clear platform admin session flag
    localStorage.removeItem('is_platform_admin_session');
    
    navigate('/platform/login');
  };

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/platform/dashboard', 
      icon: TrendingUp,
      description: 'Platform overview and statistics'
    },
    { 
      name: 'Organizations', 
      href: '/platform/organizations', 
      icon: Building2,
      description: 'Manage all organizations'
    },
    { 
      name: 'Organization Admins', 
      href: '/platform/admins', 
      icon: Users,
      description: 'View organization administrators'
    },
    { 
      name: 'Permission Groups', 
      href: '/platform/permission-groups', 
      icon: Shield,
      description: 'Manage permission groups'
    },
    { 
      name: 'Subscriptions', 
      href: '/platform/subscriptions', 
      icon: Package,
      description: 'Manage organization subscriptions'
    },
    { 
      name: 'Subscription Plans', 
      href: '/platform/plans', 
      icon: CreditCard,
      description: 'Manage subscription plans'
    },
    { 
      name: 'Pending Actions', 
      href: '/platform/pending', 
      icon: Clock,
      description: 'Review pending payments and renewals'
    },
    { 
      name: 'Discount Codes', 
      href: '/platform/discount-codes', 
      icon: Ticket,
      description: 'Manage discount codes'
    },
    { 
      name: 'Settings', 
      href: '/platform/settings', 
      icon: Settings,
      description: 'Platform settings'
    },
    { 
      name: 'Help Center', 
      href: '/platform/help-center', 
      icon: HelpCircle,
      description: 'Manage help center articles and categories'
    },
  ];

  return (
    <div className="fixed inset-0 flex bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r bg-card transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b px-6">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Platform Admin</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                               (item.href !== '/platform/dashboard' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  onClick={() => setSidebarOpen(false)}
                  title={item.description}
                >
                  <item.icon className={cn(
                    'h-5 w-5 flex-shrink-0 transition-transform',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                  )} />
                  <span className="flex-1 truncate">{item.name}</span>
                  {isActive && (
                    <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="border-t p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{profile?.full_name || user?.email}</p>
                <p className="text-xs text-muted-foreground truncate">Platform Administrator</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // CRITICAL: Clear platform admin session flag to allow access to main app
                localStorage.removeItem('is_platform_admin_session');
                // Restore main app token if it was backed up
                const mainAppTokenBackup = localStorage.getItem('main_app_token_backup');
                if (mainAppTokenBackup) {
                  localStorage.setItem('api_token', mainAppTokenBackup);
                  localStorage.removeItem('main_app_token_backup');
                }
                // Navigate to main app dashboard
                window.location.href = '/dashboard';
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Main App
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Debug: Log when children render */}
          {children}
        </main>
      </div>
    </div>
  );
}

