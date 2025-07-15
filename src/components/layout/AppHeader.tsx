import { useState } from "react";
import { Bell, Search, User, LogOut, Settings, Moon, Sun, Languages, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";

// Mock data - in real app, this would come from context/API
const notifications = [
  { id: 1, title: "New student admission", time: "2 min ago", unread: true },
  { id: 2, title: "Fee payment received", time: "1 hour ago", unread: true },
  { id: 3, title: "Exam results published", time: "3 hours ago", unread: false },
];

const currentUser = {
  name: "Ahmed Khan",
  email: "ahmed.khan@nazimschool.edu",
  role: "Admin",
  profilePhoto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
};

interface AppHeaderProps {
  title?: string;
  showBreadcrumb?: boolean;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
}

export function AppHeader({ title, showBreadcrumb = false, breadcrumbItems = [] }: AppHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState("en");

  const unreadNotifications = notifications.filter(n => n.unread).length;

  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "ps", name: "پښتو", flag: "🇦🇫" },
    { code: "ar", name: "العربية", flag: "🇸🇦" }
  ];

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    // In real app, this would update theme context
    document.documentElement.classList.toggle('dark');
  };

  const changeLanguage = (langCode: string) => {
    setCurrentLanguage(langCode);
    // In real app, this would update i18n context
  };

  const handleLogout = () => {
    // In real app, this would call auth service
    console.log("Logging out...");
  };

  return (
    <header className="h-16 bg-card border-b border-border sticky top-0 z-50">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left Section - Mobile menu trigger + Title/Breadcrumb */}
        <div className="flex items-center gap-4">
          <SidebarTrigger className="lg:hidden" />
          
          <div className="hidden lg:block">
            {showBreadcrumb && breadcrumbItems.length > 0 ? (
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
                {breadcrumbItems.map((item, index) => (
                  <div key={index} className="flex items-center">
                    {index > 0 && <span className="mx-2">/</span>}
                    {item.href ? (
                      <a href={item.href} className="hover:text-foreground transition-colors">
                        {item.label}
                      </a>
                    ) : (
                      <span className="text-foreground font-medium">{item.label}</span>
                    )}
                  </div>
                ))}
              </nav>
            ) : title ? (
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            ) : null}
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="search"
              placeholder="Search students, classes, teachers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-0 focus:bg-background"
            />
          </div>
        </div>

        {/* Right Section - Actions & Profile */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                <Languages className="h-4 w-4" />
                <span className="ml-2 text-sm">
                  {languages.find(l => l.code === currentLanguage)?.flag}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Select Language</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={currentLanguage === lang.code ? "bg-accent" : ""}
                >
                  <span className="mr-2">{lang.flag}</span>
                  {lang.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="hidden sm:flex"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
                  >
                    {unreadNotifications}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} className="flex-col items-start p-3">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-sm">{notification.title}</span>
                      {notification.unread && (
                        <Badge variant="secondary" className="text-xs">New</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{notification.time}</span>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem className="text-center text-muted-foreground">
                  No new notifications
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center">
                <span className="text-sm text-primary">View all notifications</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <img
                  src={currentUser.profilePhoto}
                  alt={currentUser.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {currentUser.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {currentUser.role}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}