import { useState, useEffect } from "react";
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

export function SmartSidebar() {
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
    const baseItems: NavigationItem[] = [
      {
        titleKey: "dashboard",
        url: "/",
        icon: Home,
        badge: null,
        roles: ["super_admin", "admin", "teacher", "accountant", "librarian", "parent", "student", "hostel_manager", "asset_manager"],
        priority: 1
      }
    ];

    // Role-specific navigation
    const roleSpecificItems: Record<UserRole, NavigationItem[]> = {
      parent: [
        {
          titleKey: "children",
          icon: Users,
          roles: ["parent"],
          priority: 2,
          children: [
            { title: "My Children", url: "/parent/children", icon: Users },
            { title: "Attendance", url: "/parent/attendance", icon: UserCheck },
            { title: "Results", url: "/parent/results", icon: Trophy },
            { title: "Fee Payment", url: "/parent/fees", icon: CreditCard }
          ]
        },
        {
          titleKey: "communication",
          icon: MessageSquare,
          roles: ["parent"],
          priority: 3,
          children: [
            { title: "Messages", url: "/parent/messages", icon: MessageSquare },
            { title: "Announcements", url: "/parent/announcements", icon: Bell },
            { title: "Events", url: "/parent/events", icon: Calendar }
          ]
        }
      ],
      student: [
        {
          titleKey: "academics",
          icon: BookOpen,
          roles: ["student"],
          priority: 2,
          children: [
            { title: "Timetable", url: "/student/timetable", icon: Calendar },
            { title: "Results", url: "/student/results", icon: Trophy },
            { title: "Assignments", url: "/student/assignments", icon: Clock },
            { title: "Attendance", url: "/student/attendance", icon: UserCheck }
          ]
        },
        {
          titleKey: "library",
          url: "/library",
          icon: BookOpen,
          roles: ["student"],
          priority: 3
        }
      ],
      teacher: [
        {
          titleKey: "classes",
          icon: GraduationCap,
          roles: ["teacher"],
          priority: 2,
          children: [
            { title: "My Classes", url: "/teacher/classes", icon: School },
            { title: "Attendance", url: "/attendance", icon: UserCheck, contextual: true },
            { title: "Timetable", url: "/academic/timetable", icon: Calendar }
          ]
        },
        {
          titleKey: "exams",
          icon: Trophy,
          roles: ["teacher"],
          priority: 3,
          children: [
            { title: "Results Entry", url: "/exams/results", icon: FileText, contextual: true },
            { title: "Exam Setup", url: "/exams/setup", icon: Settings }
          ]
        }
      ],
      admin: [
        {
          titleKey: "students",
          icon: Users,
          roles: ["admin"],
          priority: 2,
          children: [
            { title: "All Students", url: "/students", icon: Users },
            { title: "Admissions", url: "/students/admissions", icon: UserCheck },
            { title: "Bulk Import", url: "/students/import", icon: FileText }
          ]
        },
        {
          titleKey: "academic",
          icon: GraduationCap,
          roles: ["admin"],
          priority: 3,
          children: [
            { title: "Classes", url: "/academic/classes", icon: School },
            { title: "Subjects", url: "/academic/subjects", icon: BookOpen },
            { title: "Timetable", url: "/academic/timetable", icon: Calendar }
          ]
        }
      ],
      super_admin: [
        {
          titleKey: "administration",
          icon: Settings,
          roles: ["super_admin"],
          priority: 2,
          children: [
            { title: "User Management", url: "/super-admin/users", icon: Users },
            { title: "System Settings", url: "/settings/system", icon: Settings },
            { title: "Security Monitoring", url: "/super-admin/security", icon: Target }
          ]
        }
      ],
      // Add other roles as needed
      accountant: [],
      librarian: [],
      hostel_manager: [],
      asset_manager: []
    };

    // Combine base items with role-specific items
    const items = [...baseItems, ...(roleSpecificItems[userRole] || [])];
    
    // Sort by priority and add contextual badges
    return items
      .sort((a, b) => (a.priority || 99) - (b.priority || 99))
      .map(item => {
        // Add contextual badges based on current context
        if (context.currentModule === 'attendance' && item.titleKey === 'classes') {
          return { ...item, badge: { text: "Active", variant: 'default' as const } };
        }
        return item;
      });
  };

  // Update navigation context based on current path and user activity
  useEffect(() => {
    let module = 'dashboard';
    if (currentPath.includes('/attendance')) module = 'attendance';
    else if (currentPath.includes('/exams')) module = 'exams';
    else if (currentPath.includes('/students')) module = 'students';
    else if (currentPath.includes('/parent')) module = 'parent';
    else if (currentPath.includes('/teacher')) module = 'teacher';

    if (!user) {
      setNavigationContext({ currentModule: module, recentTasks: [], quickActions: [] });
      return;
    }

    const fetchContext = async () => {
      const { data, error } = await supabase
        .from('user_navigation_context')
        .select('recent_tasks')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching recent tasks', error);
      }

      const tasks: DbRecentTask[] = (data?.recent_tasks as DbRecentTask[]) || [];

      const filteredTasks = tasks.filter(
        task => (!task.role || task.role === role) && (!task.context || task.context === module)
      );

      const mappedTasks = filteredTasks.map(task => ({
        title: task.title,
        url: task.url,
        icon: (LucideIcons as unknown as Record<string, LucideIcon>)[task.icon] || FileText,
        timestamp: task.timestamp
      }));

      setNavigationContext({
        currentModule: module,
        recentTasks: mappedTasks,
        quickActions: []
      });
    };

    fetchContext();

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
  }, [currentPath, role, user?.id]);

  const filteredItems = role ? getNavigationItems(role as UserRole, navigationContext) : [];

  const isActive = (path: string) => currentPath === path;
  const isChildActive = (children?: Array<{ url: string }>) => 
    children?.some(child => currentPath.startsWith(child.url)) || false;

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50";

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

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
            to={item.url} 
            className={getNavCls({ isActive: isActive(item.url) })}
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

  if (loading) {
    return <div className="w-64 h-screen bg-sidebar border-r animate-pulse" />;
  }

  return (
    <Sidebar
      className={`${collapsed ? "w-14" : "w-64"} transition-all duration-300`}
      collapsible="icon"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Logo Section */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <School className="h-5 w-5 text-primary-foreground" />
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
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-primary-foreground">
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
}