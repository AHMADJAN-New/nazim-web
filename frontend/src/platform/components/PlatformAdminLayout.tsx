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
  History,
  Languages,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Lock,
  Mail,
  MessageSquare,
  Key,
  AlertCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';
import { platformApi } from '@/platform/lib/platformApi';
import { usePlatformDashboard, usePlatformPendingPayments, usePlatformPendingRenewals } from '@/platform/hooks/usePlatformAdmin';

interface PlatformAdminLayoutProps {
  children: React.ReactNode;
}

// Language Switcher Component (without Arabic)
function LanguageSwitcherButton() {
  const { language, setLanguage } = useLanguage();
  // Filter out Arabic since translations are not complete
  const languages = [
    { code: 'en' as const, name: 'English', flag: '🇺🇸' },
    { code: 'ps' as const, name: 'پښتو', flag: '🇦🇫' },
    { code: 'fa' as const, name: 'دری', flag: '🇮🇷' },
    // Arabic temporarily hidden until translations are complete
    // { code: 'ar' as const, name: 'العربية', flag: '🇸🇦' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex-shrink-0">
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={language === lang.code ? "bg-accent" : ""}
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PlatformAdminLayout({ children }: PlatformAdminLayoutProps) {
  const { t } = useLanguage();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['Settings']);

  // Fetch stats for badge counts
  const { data: dashboardData } = usePlatformDashboard();
  const { data: pendingPaymentsData } = usePlatformPendingPayments();
  const { data: pendingRenewalsData } = usePlatformPendingRenewals();

  // Fetch contact messages stats
  const { data: contactMessagesStats } = useQuery({
    queryKey: ['platform-contact-messages-stats'],
    queryFn: async () => {
      const response = await platformApi.contactMessages.stats();
      return (response as { data: any }).data;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch plan requests count
  const { data: planRequestsData } = useQuery({
    queryKey: ['platform-plan-requests-count'],
    queryFn: async () => {
      const response = await platformApi.planRequests.list({ per_page: 1 });
      return response as { pagination?: { total?: number }; data?: any[] };
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Calculate counts
  const pendingActionsCount = (dashboardData?.pendingPayments || 0) + (dashboardData?.pendingRenewals || 0);
  const contactMessagesCount = contactMessagesStats?.new || 0;
  const planRequestsCount = planRequestsData?.pagination?.total || 0;
  const expiringSoonCount = dashboardData?.expiringSoon || 0;
  const recentlyExpiredCount = dashboardData?.recentlyExpired || 0;
  const subscriptionsIssuesCount = expiringSoonCount + recentlyExpiredCount;

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
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/10',
      description: 'Platform overview and statistics',
      badge: null,
    },
    { 
      name: 'Organizations', 
      href: '/platform/organizations', 
      icon: Building2,
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-500/10',
      description: 'Manage all organizations',
      badge: null,
    },
    { 
      name: 'Organization Admins', 
      href: '/platform/admins', 
      icon: Users,
      iconColor: 'text-indigo-500',
      iconBg: 'bg-indigo-500/10',
      description: 'View organization administrators',
      badge: null,
    },
    { 
      name: 'Permission Groups', 
      href: '/platform/permission-groups', 
      icon: Shield,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-500/10',
      description: 'Manage permission groups',
      badge: null,
    },
    { 
      name: 'Subscriptions', 
      href: '/platform/subscriptions', 
      icon: Package,
      iconColor: 'text-green-500',
      iconBg: 'bg-green-500/10',
      description: 'Manage organization subscriptions',
      badge: subscriptionsIssuesCount > 0 ? subscriptionsIssuesCount : null,
      badgeVariant: 'destructive' as const,
    },
    { 
      name: 'Subscription Plans', 
      href: '/platform/plans', 
      icon: CreditCard,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10',
      description: 'Manage subscription plans',
      badge: null,
    },
    { 
      name: 'Plan Requests', 
      href: '/platform/plan-requests', 
      icon: Mail,
      iconColor: 'text-cyan-500',
      iconBg: 'bg-cyan-500/10',
      description: 'Enterprise plan contact requests',
      badge: planRequestsCount > 0 ? planRequestsCount : null,
      badgeVariant: 'default' as const,
    },
    { 
      name: 'Contact Messages', 
      href: '/platform/contact-messages', 
      icon: MessageSquare,
      iconColor: 'text-pink-500',
      iconBg: 'bg-pink-500/10',
      description: 'Manage contact form submissions from landing page',
      badge: contactMessagesCount > 0 ? contactMessagesCount : null,
      badgeVariant: 'default' as const,
    },
    { 
      name: 'Pending Actions', 
      href: '/platform/pending', 
      icon: Clock,
      iconColor: 'text-orange-500',
      iconBg: 'bg-orange-500/10',
      description: 'Review pending payments and renewals',
      badge: pendingActionsCount > 0 ? pendingActionsCount : null,
      badgeVariant: 'destructive' as const,
    },
    { 
      name: 'Discount Codes', 
      href: '/platform/discount-codes', 
      icon: Ticket,
      iconColor: 'text-teal-500',
      iconBg: 'bg-teal-500/10',
      description: 'Manage discount codes',
      badge: null,
    },
    { 
      name: 'Maintenance Fees', 
      href: '/platform/maintenance-fees', 
      icon: RefreshCw,
      iconColor: 'text-slate-500',
      iconBg: 'bg-slate-500/10',
      description: 'Manage maintenance fees across all organizations',
      badge: null,
    },
    { 
      name: 'License Fees', 
      href: '/platform/license-fees', 
      icon: Lock,
      iconColor: 'text-gray-500',
      iconBg: 'bg-gray-500/10',
      description: 'Manage license fee payments across all organizations',
      badge: null,
    },
    { 
      name: 'Revenue History', 
      href: '/platform/revenue-history', 
      icon: DollarSign,
      iconColor: 'text-yellow-500',
      iconBg: 'bg-yellow-500/10',
      description: 'View organization revenue history and breakdown',
      badge: null,
    },
    { 
      name: 'Settings', 
      href: '/platform/settings',
      icon: Settings,
      iconColor: 'text-slate-600',
      iconBg: 'bg-slate-600/10',
      description: 'Platform settings',
      badge: null,
      children: [
        {
          name: 'General Settings',
          href: '/platform/settings',
          icon: Settings,
        },
        {
          name: 'Translations',
          href: '/platform/settings/translations',
          icon: Languages,
        },
      ]
    },
    { 
      name: 'Help Center', 
      href: '/platform/help-center', 
      icon: HelpCircle,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-600/10',
      description: 'Manage help center articles and categories',
      badge: null,
    },
    { 
      name: 'Maintenance History', 
      href: '/platform/maintenance-history', 
      icon: History,
      iconColor: 'text-gray-600',
      iconBg: 'bg-gray-600/10',
      description: 'View maintenance mode history',
      badge: null,
    },
    { 
      name: 'Desktop Licenses', 
      href: '/platform/desktop-licenses', 
      icon: Key,
      iconColor: 'text-violet-500',
      iconBg: 'bg-violet-500/10',
      description: 'Generate and manage desktop application licenses',
      badge: null,
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
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
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedItems.includes(item.name);
              
              const toggleExpanded = () => {
                setExpandedItems(prev => 
                  prev.includes(item.name) 
                    ? prev.filter(name => name !== item.name)
                    : [...prev, item.name]
                );
              };
              
              return (
                <div key={item.name}>
                  {hasChildren ? (
                    <>
                      <button
                        onClick={toggleExpanded}
                        className={cn(
                          'group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                        title={item.description}
                      >
                        <div className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 transition-colors',
                          isActive ? 'bg-primary-foreground/20' : item.iconBg
                        )}>
                          <item.icon className={cn(
                            'h-4 w-4',
                            isActive ? 'text-primary-foreground' : item.iconColor
                          )} />
                        </div>
                        <span className="flex-1 truncate text-left">{item.name}</span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 flex-shrink-0" />
                        )}
                      </button>
                      {isExpanded && item.children && (
                        <div className="ml-4 mt-1 space-y-1">
                          {item.children.map((child) => {
                            const isChildActive = location.pathname === child.href;
                            return (
                              <Link
                                key={child.name}
                                to={child.href}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
                                  isChildActive
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                )}
                              >
                                <child.icon className="h-4 w-4 flex-shrink-0" />
                                <span className="flex-1 truncate">{child.name}</span>
                                {isChildActive && (
                                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      to={item.href}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                      onClick={() => setSidebarOpen(false)}
                      title={item.description}
                    >
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 transition-colors',
                        isActive ? 'bg-primary-foreground/20' : item.iconBg
                      )}>
                        <item.icon className={cn(
                          'h-4 w-4',
                          isActive ? 'text-primary-foreground' : item.iconColor
                        )} />
                      </div>
                      <span className="flex-1 truncate">{item.name}</span>
                      {item.badge !== null && item.badge !== undefined && item.badge > 0 && (
                        <Badge 
                          variant={item.badgeVariant || 'default'} 
                          className={cn(
                            'h-5 min-w-5 px-1.5 text-xs font-semibold flex items-center justify-center',
                            isActive && 'bg-primary-foreground/20 text-primary-foreground'
                          )}
                        >
                          {item.badge > 99 ? '99+' : item.badge}
                        </Badge>
                      )}
                      {isActive && (
                        <div className="absolute right-2 h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                      )}
                    </Link>
                  )}
                </div>
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
        <header className="fixed top-0 left-0 lg:left-64 right-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <LanguageSwitcherButton />
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

        {/* Spacer to account for fixed header height */}
        <div className="h-16 flex-shrink-0" aria-hidden="true" />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          {/* Debug: Log when children render */}
          <div className="min-w-0 w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
