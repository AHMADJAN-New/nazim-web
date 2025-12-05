import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { type LucideIcon } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
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
  Building2,
  DoorOpen,
  Package,
  MessageSquare,
  BarChart3,
  School,
  Moon,
  Sun,
  Languages,
  ChevronDown,
  ChevronRight,
  Bell
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface NavigationChild {
  title: string;
  url: string;
  icon: LucideIcon;
}

interface NavigationItem {
  titleKey: string;
  url?: string;
  icon: LucideIcon;
  badge?: { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } | null;
  roles: UserRole[];
  children?: NavigationChild[];
}

const currentUser: { name: string; role: UserRole; profilePhoto: string } = {
  name: "Ahmed Khan",
  role: "admin",
  profilePhoto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
};


const navigationItems: NavigationItem[] = [
  {
    titleKey: "dashboard",
    url: "/dashboard",
    icon: Home,
    badge: null,
    roles: ["admin", "teacher", "accountant", "librarian", "parent", "student", "hostel_manager", "asset_manager"]
  },
  {
    titleKey: "attendance",
    url: "/attendance",
    icon: UserCheck,
    badge: null,
    roles: ["admin", "teacher", "staff"]
  },
  {
    titleKey: "settings",
    icon: Settings,
    badge: null,
    roles: ["admin"],
    children: [
      {
        title: "Buildings Management",
        url: "/settings/buildings",
        icon: Building2,
      },
      {
        title: "Rooms Management",
        url: "/settings/rooms",
        icon: DoorOpen,
      },
    ],
  }
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { t, isRTL } = useLanguage();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  
  const collapsed = state === "collapsed";

  const currentPath = location.pathname;

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

  const filteredItems = navigationItems.filter(item =>
    item.roles.includes(currentUser.role)
  );

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
      {!collapsed && (
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img 
              src={currentUser.profilePhoto} 
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-sidebar-foreground truncate">
                {currentUser.name}
              </h3>
              <p className="text-xs text-sidebar-foreground/70 capitalize">
                {typeof currentUser.role === 'string' ? currentUser.role.replace('_', ' ') : 'User'}
              </p>
            </div>
          </div>
        </div>
      )}

      <SidebarContent className="custom-scrollbar">
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