import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { type LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useIsSuperAdmin } from "@/hooks/useProfiles";
import { useCurrentOrganization } from "@/hooks/useOrganizations";
import { useHasPermission } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/types/auth";
import {
  Users,
  GraduationCap,
  Calendar,
  Clock,
  BookOpen,
  FileText,
  CreditCard,
  Settings,
  Home,
  UserCheck,
  Trophy,
  Building,
  Building2,
  DoorOpen,
  Package,
  Shield,
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
  Target,
  UserCog,
  Lock,
  AlertTriangle,
  KeyRound,
  UserPlus
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavigationChild {
  title: string;
  titleKey?: string; // Translation key for the title
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

// Language Switcher Component
function LanguageSwitcherButton() {
  const { language, setLanguage } = useLanguage();
  const languages = [
    { code: 'en' as const, name: 'English', flag: '🇺🇸' },
    { code: 'ps' as const, name: 'پښتو', flag: '🇦🇫' },
    { code: 'fa' as const, name: 'فارسی', flag: '🇮🇷' },
    { code: 'ar' as const, name: 'العربية', flag: '🇸🇦' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex-1">
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
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const SmartSidebar = memo(function SmartSidebar() {
  const { state } = useSidebar();
  const { t, isRTL } = useLanguage();
  const { user, profile } = useAuth();
  const { data: currentProfile } = useProfile();
  const isSuperAdmin = useIsSuperAdmin();
  // Use profile role directly from useAuth (most reliable) instead of useUserRole
  const roleFromAuth = profile?.role || currentProfile?.role || null;
  const { role: roleFromHook } = useUserRole();
  // Prefer role from auth/profile over hook (hook might have dev mode fallback)
  const role = roleFromAuth || roleFromHook;
  const { data: currentOrg } = useCurrentOrganization();
  const hasSettingsPermission = useHasPermission('settings.read');
  const hasBuildingsPermission = useHasPermission('buildings.read');
  const hasRoomsPermission = useHasPermission('rooms.read');
  const hasOrganizationsPermission = useHasPermission('organizations.read');
  const hasProfilesPermission = useHasPermission('profiles.read');
  const hasUsersPermission = useHasPermission('users.read');
  const hasAuthMonitoringPermission = useHasPermission('auth_monitoring.read');
  const hasSecurityMonitoringPermission = useHasPermission('security_monitoring.read');
  const hasBrandingPermission = useHasPermission('branding.read');
  const hasReportsPermission = useHasPermission('reports.read');
  const hasBackupPermission = useHasPermission('backup.read');
  const hasResidencyTypesPermission = useHasPermission('academic.residency_types.read');
  const hasAcademicYearsPermission = useHasPermission('academic.academic_years.read');
  const hasClassesPermission = useHasPermission('academic.classes.read');
  const hasSubjectsPermission = useHasPermission('academic.subjects.read');
  const hasStaffPermission = useHasPermission('staff.read');
  const hasStudentsPermission = useHasPermission('students.read');
  const hasStudentAdmissionsPermission = useHasPermission('student_admissions.read');
  const hasStaffTypesPermission = useHasPermission('staff.types.read');
  const hasScheduleSlotsPermission = useHasPermission('academic.schedule_slots.read');
  const hasTeacherSubjectAssignmentsPermission = useHasPermission('academic.teacher_subject_assignments.read');
  const hasTimetablesPermission = useHasPermission('academic.timetables.read');

  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [navigationContext, setNavigationContext] = useState<NavigationContext>({
    currentModule: 'dashboard',
    recentTasks: [],
    quickActions: []
  });

  const collapsed = state === "collapsed";
  const currentPath = location.pathname;

  // Permission checks for specific child items
  const hasPermissionsPermission = useHasPermission('permissions.read'); // Assuming this permission exists for permissions management

  // Context-aware navigation items - computed with useMemo to avoid hook order issues
  const allNavigationItems = useMemo((): NavigationItem[] => {
    const allItems: NavigationItem[] = [
      {
        titleKey: "dashboard",
        url: "/dashboard",
        icon: Home,
        badge: null,
        roles: ["super_admin", "admin", "teacher", "accountant", "librarian", "parent", "student", "hostel_manager", "asset_manager"] as UserRole[],
        priority: 1
      },
      ...(hasStaffPermission ? [{
        titleKey: "staff",
        url: "/staff",
        icon: Users,
        badge: null,
        roles: ["super_admin", "admin", "teacher", "accountant", "librarian", "hostel_manager", "asset_manager"] as UserRole[],
        priority: 3
      }] : []),
      ...(hasStudentsPermission ? [{
        titleKey: "students",
        url: "/students",
        icon: GraduationCap,
        badge: null,
        roles: ["super_admin", "admin", "teacher", "accountant", "librarian", "parent", "hostel_manager", "asset_manager"] as UserRole[],
        priority: 3.05
      }] : []),
      ...(hasStudentAdmissionsPermission ? [{
        titleKey: "admissions",
        url: "/admissions",
        icon: UserCheck,
        badge: null,
        roles: ["super_admin", "admin", "teacher", "accountant", "librarian", "parent", "hostel_manager", "asset_manager"] as UserRole[],
        priority: 3.055
      }] : []),
      ...((hasClassesPermission || hasSubjectsPermission || hasTeacherSubjectAssignmentsPermission || hasTimetablesPermission) ? [{
        titleKey: "academicManagement",
        icon: GraduationCap,
        badge: null,
        roles: ["super_admin", "admin", "teacher"] as UserRole[],
        priority: 3.1,
        children: [
          ...(hasClassesPermission ? [{
            title: "Classes",
            titleKey: "academic.classes.title",
            url: "/settings/classes",
            icon: GraduationCap,
          }] : []),
          ...(hasSubjectsPermission ? [{
            title: "Subjects",
            titleKey: "academic.subjects.title",
            url: "/settings/subjects",
            icon: BookOpen,
          }] : []),
          ...(hasTeacherSubjectAssignmentsPermission ? [{
            title: "Teacher Subject Assignments",
            titleKey: "academic.teacherSubjectAssignments.title",
            url: "/settings/teacher-subject-assignments",
            icon: UserCheck,
          }] : []),
        ],
      }] : []),
      ...((hasTimetablesPermission || hasScheduleSlotsPermission) ? [{
        titleKey: "timetables",
        icon: Calendar,
        badge: null,
        roles: ["super_admin", "admin", "teacher"] as UserRole[],
        priority: 8.4,
        children: [
          ...(hasTimetablesPermission ? [{
            title: "Timetable Generation",
            titleKey: "timetable.title",
            url: "/academic/timetable-generation",
            icon: Calendar,
          }] : []),
          ...(hasScheduleSlotsPermission ? [{
            title: "Schedule Slots",
            titleKey: "academic.scheduleSlots.title",
            url: "/settings/schedule-slots",
            icon: Clock,
          }] : []),
        ],
      }] : []),
      {
        titleKey: "settings",
        icon: Settings,
        badge: null,
        roles: ["super_admin", "admin", "teacher", "accountant", "librarian", "hostel_manager", "asset_manager"] as UserRole[],
        priority: 10,
        children: [
          // Only show child items if user has the required permission
          ...(hasBackupPermission ? [{
            title: "Backup & Restore",
            url: "/settings/backup",
            icon: Package,
          }] : []),
          ...(hasOrganizationsPermission ? [{
            title: "Organizations Management",
            url: "/settings/organizations",
            icon: Shield,
          }] : []),
          ...(hasProfilesPermission ? [{
            title: "Profile Management",
            url: "/settings/profile",
            icon: Users,
          }] : []),
          ...(hasPermissionsPermission ? [{
            title: "Permissions Management",
            url: "/settings/permissions",
            icon: Shield,
          }] : []),
        ],
      },
      {
        titleKey: "academicSettings",
        icon: GraduationCap,
        badge: null,
        roles: ["super_admin", "admin", "teacher"] as UserRole[],
        priority: 8,
        children: [
          // Only show child items if user has the required permission
          ...(hasBuildingsPermission ? [{
            title: "Buildings Management",
            url: "/settings/buildings",
            icon: Building2,
          }] : []),
          ...(hasRoomsPermission ? [{
            title: "Rooms Management",
            url: "/settings/rooms",
            icon: DoorOpen,
          }] : []),
          ...(hasBrandingPermission ? [{
            title: "Schools Management",
            url: "/settings/schools",
            icon: School,
          }] : []),
          ...(hasReportsPermission ? [{
            title: "Report Templates",
            url: "/settings/report-templates",
            icon: FileText,
          }] : []),
          ...(hasResidencyTypesPermission ? [{
            title: "Residency Types",
            titleKey: "academic.residencyTypes.title",
            url: "/settings/residency-types",
            icon: BookOpen,
          }] : []),
          ...(hasAcademicYearsPermission ? [{
            title: "Academic Years",
            titleKey: "academic.academicYears.title",
            url: "/settings/academic-years",
            icon: Calendar,
          }] : []),
          ...(hasStaffTypesPermission ? [{
            title: "Staff Types",
            url: "/settings/staff-types",
            icon: Users,
          }] : []),
        ],
      },
      {
        titleKey: "authentication",
        icon: Lock,
        badge: null,
        roles: ["super_admin", "admin"] as UserRole[],
        priority: 9,
        children: [
          // Only show child items if user has the required permission
          ...(hasUsersPermission ? [{
            title: "User Management",
            url: "/admin/users",
            icon: UserCog,
          }] : []),
          ...(hasProfilesPermission ? [{
            title: "Role Requests",
            url: "/admin/role-requests",
            icon: UserPlus,
          }] : []),
          ...(hasAuthMonitoringPermission ? [{
            title: "Auth Monitoring",
            url: "/admin/auth-monitoring",
            icon: AlertTriangle,
          }] : []),
          ...(hasSecurityMonitoringPermission ? [{
            title: "Security Monitoring",
            url: "/admin/security-monitoring",
            icon: Shield,
          }] : []),
          ...(hasUsersPermission ? [{
            title: "Password Management",
            url: "/admin/password-management",
            icon: KeyRound,
          }] : []),
        ],
      }
    ];

    // Filter children and calculate visible children count
    const itemsWithFilteredChildren = allItems.map(item => {
      if (!item.children) return { ...item, visibleChildrenCount: 0 };

      // Children are already filtered by permission checks above
      const visibleChildren = item.children || [];
      const visibleCount = visibleChildren.length;

      return {
        ...item,
        children: visibleChildren,
        visibleChildrenCount: visibleCount
      };
    });

    // Filter out menus if they have no visible children
    // Show menu only if user has permission for at least one child
    return itemsWithFilteredChildren.filter(item => {
      // Dashboard always shows (no children)
      if (item.titleKey === 'dashboard') {
        return true;
      }

      // For menus with children, only show if there are visible children
      if (item.children && item.children.length > 0) {
        const visibleCount = (item as any).visibleChildrenCount || item.children.length;
        return visibleCount > 0;
      }

      // For menus without children, show based on parent permission
      if (item.titleKey === 'settings') {
        return hasSettingsPermission;
      }

      if (item.titleKey === 'academicSettings') {
        // Show if user has any academic-related permission (excluding classes, subjects, and assignments which are in academicManagement)
        return hasBuildingsPermission || hasRoomsPermission || hasBrandingPermission || hasReportsPermission || hasResidencyTypesPermission || hasAcademicYearsPermission;
      }

      if (item.titleKey === 'academicManagement') {
        // Show if user has any academic management permission
        return hasClassesPermission || hasSubjectsPermission || hasTeacherSubjectAssignmentsPermission;
      }
      
      if (item.titleKey === 'timetables') {
        // Show if user has access to timetables or schedule slots
        return hasTimetablesPermission || hasScheduleSlotsPermission;
      }

      if (item.titleKey === 'authentication') {
        // Show if user has any auth-related permission
        return hasUsersPermission || hasAuthMonitoringPermission || hasSecurityMonitoringPermission;
      }

      return true;
    });
  }, [hasSettingsPermission, hasOrganizationsPermission, hasBuildingsPermission, hasRoomsPermission, hasProfilesPermission, hasUsersPermission, hasAuthMonitoringPermission, hasSecurityMonitoringPermission, hasBrandingPermission, hasReportsPermission, hasBackupPermission, hasPermissionsPermission, hasResidencyTypesPermission, hasAcademicYearsPermission, hasClassesPermission, hasSubjectsPermission, hasScheduleSlotsPermission, hasTeacherSubjectAssignmentsPermission, hasTimetablesPermission]);

  // Helper function to filter navigation items by role
  const getNavigationItems = (userRole: UserRole, context: NavigationContext): NavigationItem[] => {
    // Filter items by user role - only show items that match the user's role
    const filtered = allNavigationItems.filter(item => {
      return item.roles.includes(userRole);
    });

    // Sort by priority (lower number = higher priority)
    return filtered.sort((a, b) => (a.priority || 999) - (b.priority || 999));
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
        // Use type assertion since user_navigation_context table may not exist in types
        const { data, error } = await (supabase as any)
          .from('user_navigation_context')
          .select('recent_tasks')
          .eq('user_id', user.id)
          .single();

        if (error) {
          // Silently fail - don't block UI (table might not exist)
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
    // Note: user_navigation_context table may not exist, so wrap in try-catch
    if (!(import.meta.env.DEV && import.meta.env.VITE_DISABLE_AUTH !== 'false')) {
      try {
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
      } catch (error) {
        // Silently fail if table doesn't exist
        return;
      }
    }
  }, [currentModule, role, user?.id]);

  // Use the role from useUserRole, or fallback to profile role, or use super_admin if isSuperAdmin
  const effectiveRole = useMemo(() => {
    // Priority: 1. role from useUserRole, 2. profile role, 3. super_admin if isSuperAdmin, 4. null
    if (role) return role;
    if (currentProfile?.role) return currentProfile.role as UserRole;
    if (isSuperAdmin) return 'super_admin' as UserRole;
    // Only use admin fallback in dev mode if no user at all
    if (import.meta.env.DEV && import.meta.env.VITE_DISABLE_AUTH !== 'false' && !user) {
      return 'admin' as UserRole;
    }
    return null;
  }, [role, currentProfile?.role, isSuperAdmin, user]);

  // Memoize navigation items to prevent recalculation on every render
  // Always render items if we have a role, even if permissions are still loading
  // This prevents the sidebar from disappearing during background refetches
  const filteredItems = useMemo(() => {
    if (!effectiveRole) {
      return [];
    }
    const items = getNavigationItems(effectiveRole as UserRole, navigationContext);
    return items;
  }, [effectiveRole, navigationContext, allNavigationItems]);

  // Don't show loading state - always render with available data
  // The sidebar will update when permissions are available, but won't disappear

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
    // Always show parent items even if they have no children (they might have children that load later)
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
      side={isRTL ? "right" : "left"}
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
                {currentProfile?.full_name || user.email?.split('@')[0]}
              </h3>
              <p className="text-xs text-sidebar-foreground/70 capitalize">
                {currentProfile?.role || role?.replace('_', ' ')}
              </p>
            </div>
          </div>
          {/* Organization Context */}
          {currentOrg && (
            <div className="mt-2 pt-2 border-t border-sidebar-border">
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3 text-sidebar-foreground/70" />
                <p className="text-xs text-sidebar-foreground/70 truncate">
                  {currentOrg.name}
                </p>
              </div>
            </div>
          )}
          {isSuperAdmin && !currentOrg && (
            <div className="mt-2 pt-2 border-t border-sidebar-border">
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-sidebar-foreground/70" />
                <p className="text-xs text-sidebar-foreground/70">
                  Super Admin
                </p>
              </div>
            </div>
          )}
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
            <LanguageSwitcherButton />
            <Button variant="ghost" size="sm" className="flex-1">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Sidebar>
  );
});