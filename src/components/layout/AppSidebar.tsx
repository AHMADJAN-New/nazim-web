import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
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

// Mock user data - in real app, this would come from auth context
const currentUser = {
  name: "Ahmed Khan",
  role: "admin",
  profilePhoto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
};

const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    badge: null,
    roles: ["super_admin", "admin", "teacher", "accountant", "librarian", "parent", "student", "hostel_manager", "asset_manager"]
  },
  {
    title: "Students",
    icon: Users,
    roles: ["super_admin", "admin", "teacher", "parent"],
    children: [
      { title: "All Students", url: "/students", icon: Users },
      { title: "Admissions", url: "/students/admissions", icon: UserCheck },
      { title: "Bulk Import", url: "/students/import", icon: FileText },
      { title: "ID Cards", url: "/students/id-cards", icon: CreditCard }
    ]
  },
  {
    title: "Academic",
    icon: GraduationCap,
    roles: ["super_admin", "admin", "teacher"],
    children: [
      { title: "Classes & Sections", url: "/academic/classes", icon: School },
      { title: "Subjects", url: "/academic/subjects", icon: BookOpen },
      { title: "Timetable", url: "/academic/timetable", icon: Calendar },
      { title: "Hifz Progress", url: "/academic/hifz-progress", icon: BookOpen }
    ]
  },
  {
    title: "Attendance",
    url: "/attendance",
    icon: UserCheck,
    badge: { text: "5", variant: "destructive" },
    roles: ["super_admin", "admin", "teacher", "hostel_manager"]
  },
  {
    title: "Examinations",
    icon: Trophy,
    roles: ["super_admin", "admin", "teacher"],
    children: [
      { title: "Exam Setup", url: "/exams/setup", icon: Settings },
      { title: "Results Entry", url: "/exams/results", icon: FileText },
      { title: "Report Cards", url: "/exams/reports", icon: Trophy }
    ]
  },
  {
    title: "Finance",
    icon: CreditCard,
    roles: ["super_admin", "admin", "accountant"],
    children: [
      { title: "Fee Management", url: "/finance/fees", icon: CreditCard },
      { title: "Payments", url: "/finance/payments", icon: FileText },
      { title: "Donations", url: "/finance/donations", icon: Building }
    ]
  },
  {
    title: "Staff",
    url: "/staff",
    icon: Users,
    roles: ["super_admin", "admin"]
  },
  {
    title: "Hostel",
    icon: Building,
    roles: ["super_admin", "admin", "hostel_manager"],
    children: [
      { title: "Room Management", url: "/hostel/rooms", icon: Building },
      { title: "Student Assignment", url: "/hostel/students", icon: Users },
      { title: "Attendance", url: "/hostel/attendance", icon: UserCheck }
    ]
  },
  {
    title: "Library",
    url: "/library",
    icon: BookOpen,
    roles: ["super_admin", "admin", "librarian", "teacher", "student"]
  },
  {
    title: "Assets",
    url: "/assets",
    icon: Package,
    roles: ["super_admin", "admin", "asset_manager"]
  },
  {
    title: "Communication",
    icon: MessageSquare,
    roles: ["super_admin", "admin", "teacher"],
    children: [
      { title: "Announcements", url: "/communication/announcements", icon: Bell },
      { title: "Messages", url: "/communication/messages", icon: MessageSquare },
      { title: "Events", url: "/communication/events", icon: Calendar }
    ]
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
    roles: ["super_admin", "admin", "teacher", "accountant", "librarian", "hostel_manager", "asset_manager"]
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    roles: ["super_admin", "admin"]
  }
];

export function AppSidebar() {
  const { state } = useSidebar();
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
    item.roles.includes(currentUser.role as any)
  );

  const renderMenuItem = (item: any) => {
    if (item.children) {
      const isExpanded = expandedItems.includes(item.title) || isChildActive(item.children);
      
      return (
        <Collapsible key={item.title} open={isExpanded} onOpenChange={() => toggleExpanded(item.title)}>
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className={getNavCls({ isActive: isChildActive(item.children) })}>
                <item.icon className="h-4 w-4" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.title}</span>
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
                <SidebarMenu className="ml-4 border-l border-sidebar-border">
                  {item.children.map((child: any) => (
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
                <span className="flex-1">{item.title}</span>
                {item.badge && (
                  <Badge variant={item.badge.variant as any} className="text-xs">
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
                {currentUser.role.replace('_', ' ')}
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