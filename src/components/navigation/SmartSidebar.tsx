import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { type LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/types/auth";
import {
  Users,
  GraduationCap,
  Calendar,
  BookOpen,
  FileText,
  CreditCard,
  Settings,
  Home,
  UserCheck,
  Trophy,
  Building,
  Package,
  MessageSquare,
  BarChart3,
  School,
  Moon,
  Sun,
  Languages,
  ChevronDown,
  ChevronRight,
  Bell,
  Star,
  Clock,
  Target
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";

interface NavigationChild {
  title: string;
  url: string;
  icon: LucideIcon;
  contextual?: boolean;
}

interface NavigationItem {
  titleKey: string;
  url?: string;
  icon: LucideIcon;
  badge?: { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } | null;
  roles: UserRole[];
  children?: NavigationChild[];
  priority?: number;
  contextual?: boolean;
}

interface NavigationContext {
  currentModule: string;
  recentTasks: Array<{
    title: string;
    url: string;
    icon: LucideIcon;
    timestamp: string;
  }>;
  quickActions: Array<{
    title: string;
    url: string;
    icon: LucideIcon;
    priority: number;
  }>;
}

interface DbRecentTask {
  title: string;
  url: string;
  icon: string;
  timestamp: string;
  role?: UserRole;
  context?: string;
}

export const SmartSidebar = memo(function SmartSidebar() {
  const { state } = useSidebar();
  const { t, isRTL } = useLanguage();
  const { role, loading } = useUserRole();
  const { user } = useAuth();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [navigationContext, setNavigationContext] = useState<NavigationContext>({
    currentModule: 'dashboard',
    recentTasks: [],
    quickActions: []
  });
  
  const collapsed = state === "collapsed";
  const currentPath = location.pathname;

  // Context-aware navigation items
  const getNavigationItems = (userRole: UserRole, context: NavigationContext): NavigationItem[] => {
    // Only return dashboard for clean startup app
    return [
      {
        titleKey: "dashboard",
        url: "/dashboard",
        icon: Home,
        badge: null,
        roles: ["super_admin", "admin", "teacher", "accountant", "librarian", "parent", "student", "hostel_manager", "asset_manager"],
        priority: 1
      }
    ];
  };

  // Memoize current module to prevent unnecessary updates
  const currentModule = useMemo(() => {
    return 'dashboard';
  }, [currentPath]);

  // Update navigation context based on current path and user activity (non-blocking)
  useEffect(() => {
    // Only update if module actually changed
    setNavigationContext(prev => {
      if (prev.currentModule === currentModule) {
        return prev; // No change, return same object to prevent re-render
      }
      return { ...prev, currentModule };
    });

    // Skip fetching if no user or in dev mode (to avoid unnecessary API calls)
    if (!user || (import.meta.env.DEV && import.meta.env.VITE_DISABLE_AUTH !== 'false')) {
      return;
    }

    // Fetch context asynchronously (non-blocking)
    const fetchContext = async () => {
      try {
      const { data, error } = await supabase
        .from('user_navigation_context')
        .select('recent_tasks')
        .eq('user_id', user.id)
        .single();

      if (error) {
          // Silently fail - don't block UI
          return;
      }

        const tasks: DbRecentTask[] = (data?.recent_tasks as unknown as DbRecentTask[]) || [];

      const filteredTasks = tasks.filter(
          task => (!task.role || task.role === role) && (!task.context || task.context === currentModule)
      );

      const mappedTasks = filteredTasks.map(task => ({
        title: task.title,
        url: task.url,
        icon: (LucideIcons as unknown as Record<string, LucideIcon>)[task.icon] || FileText,
        timestamp: task.timestamp
      }));

        setNavigationContext(prev => ({
          ...prev,
        recentTasks: mappedTasks,
        quickActions: []
        }));
      } catch (error) {
        // Silently fail - don't block UI
      }
    };

    // Fetch in background without blocking
    fetchContext();

    // Only subscribe to real-time updates if not in dev mode
    if (!(import.meta.env.DEV && import.meta.env.VITE_DISABLE_AUTH !== 'false')) {
    const channel = supabase
      .channel('user_navigation_context')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_navigation_context', filter: `user_id=eq.${user.id}` },
        () => fetchContext()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    }
  }, [currentModule, role, user?.id]);

  // Development mode: Use admin role if role is null
  const effectiveRole = useMemo(() => 
    role || (import.meta.env.DEV && import.meta.env.VITE_DISABLE_AUTH !== 'false' ? 'admin' : null),
    [role]
  );
  
  // Memoize navigation items to prevent recalculation on every render
  const filteredItems = useMemo(() => {
    if (!effectiveRole) return [];
    return getNavigationItems(effectiveRole as UserRole, navigationContext);
  }, [effectiveRole, navigationContext]);

  const isActive = useCallback((path: string) => currentPath === path, [currentPath]);
  const isChildActive = useCallback((children?: Array<{ url: string }>) => 
    children?.some(child => currentPath.startsWith(child.url)) || false, [currentPath]);

  const getNavCls = useCallback(({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50", []);

  const toggleExpanded = useCallback((title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  }, []);

  const renderMenuItem = (item: NavigationItem) => {
    const label = t(`nav.${item.titleKey}`);
    if (item.children) {
      const isExpanded = expandedItems.includes(item.titleKey) || isChildActive(item.children);
      
      return (
        <Collapsible key={item.titleKey} open={isExpanded} onOpenChange={() => toggleExpanded(item.titleKey)}>
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className={getNavCls({ isActive: isChildActive(item.children) })}>
                <item.icon className="h-4 w-4" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{label}</span>
                    {item.badge && (
                      <Badge variant={item.badge.variant} className="text-xs mr-2">
                        {item.badge.text}
                      </Badge>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </>
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            {!collapsed && (
              <CollapsibleContent>
                <SidebarMenu className={`${isRTL ? 'mr-4 border-r' : 'ml-4 border-l'} border-sidebar-border`}>
                  {item.children.map((child: NavigationChild) => (
                    <SidebarMenuItem key={child.url}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={child.url} 
                          className={getNavCls({ isActive: isActive(child.url) })}
                          end={child.url === '/'}
                        >
                          <child.icon className="h-4 w-4" />
                          <span>{child.title}</span>
                          {child.contextual && navigationContext.currentModule.includes('attendance') && (
                            <Star className="h-3 w-3 text-warning ml-auto" />
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </CollapsibleContent>
            )}
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild>
          <NavLink 
            to={item.url || '/'}
            className={getNavCls({ isActive: isActive(item.url || '/') })}
          >
            <item.icon className="h-4 w-4" />
            {!collapsed && (
              <>
                <span className="flex-1">{label}</span>
                {item.badge && (
                  <Badge variant={item.badge.variant} className="text-xs">
                    {item.badge.text}
                  </Badge>
                )}
              </>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  // Don't show loading state - render immediately with available data
  // The sidebar will update when role is available

  return (
    <Sidebar
      className={`${collapsed ? "w-14" : "w-64"} transition-all duration-300`}
      collapsible="icon"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Logo Section */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <School className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">Nazim</h1>
              <p className="text-xs text-sidebar-foreground/70">School Management</p>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Section */}
      {!collapsed && user && (
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sidebar-primary rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-sidebar-primary-foreground">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-sidebar-foreground truncate">
                {user.email?.split('@')[0]}
              </h3>
              <p className="text-xs text-sidebar-foreground/70 capitalize">
                {role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      )}

      <SidebarContent className="custom-scrollbar">
        {/* Recent Tasks (Contextual) */}
        {!collapsed && navigationContext.recentTasks.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Tasks
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-2 px-2">
                {navigationContext.recentTasks.slice(0, 3).map((task, index) => (
                  <Card key={index} className="p-2 cursor-pointer hover:bg-sidebar-accent/50">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-2">
                        <task.icon className="h-3 w-3 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground">{task.timestamp}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {filteredItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Quick Actions */}
      {!collapsed && (
        <div className="p-4 border-t border-sidebar-border mt-auto">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1">
              <Sun className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="flex-1">
              <Languages className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="flex-1">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Sidebar>
  );
});