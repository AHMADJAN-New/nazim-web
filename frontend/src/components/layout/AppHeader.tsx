import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, User, LogOut, Settings, Moon, Sun, Languages, School, Shield } from "lucide-react";
import { ContextualHelpButton } from "@/components/help/ContextualHelpButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { GlobalSearchCommand } from "@/components/search/GlobalSearchCommand";
import { InlineSearchDropdown } from "@/components/search/InlineSearchDropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationCount } from "@/hooks/useNotifications";
import { useLanguage } from "@/hooks/useLanguage";
import { useSchools } from "@/hooks/useSchools";
import { useSchoolContext } from "@/contexts/SchoolContext";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { authApi, apiClient } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import { NotificationDrawer } from "@/components/notifications/NotificationDrawer";

interface UserProfile {
  full_name: string;
  email: string;
  role: string;
  avatar_url: string | null;
}

interface AppHeaderProps {
  title?: string;
  showBreadcrumb?: boolean;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
}

export function AppHeader({ title, showBreadcrumb = false, breadcrumbItems = [] }: AppHeaderProps) {
  const { user, signOut, profile: authProfile, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isInlineDropdownOpen, setIsInlineDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { data: unreadCount } = useNotificationCount();

  const queryClient = useQueryClient();
  const { data: schools = [] } = useSchools(authProfile?.organization_id ?? undefined);
  const { selectedSchoolId, setSelectedSchoolId, hasSchoolsAccessAll } = useSchoolContext();

  // Check if user is platform admin (for main app context)
  // Only check if we're NOT on platform routes (we're in main app)
  // Uses backend endpoint that returns boolean - no 403 errors for regular users
  const isOnPlatformRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/platform');
  const { data: platformAdminStatus } = useQuery<{ is_platform_admin: boolean }>({
    queryKey: ['user-is-platform-admin', user?.id],
    queryFn: async () => {
      if (!user) return { is_platform_admin: false };
      try {
        const res = await apiClient.get<{ is_platform_admin: boolean }>('/auth/is-platform-admin');
        return res || { is_platform_admin: false };
      } catch (error: any) {
        // If check fails, assume not a platform admin
        // This endpoint should never return 403, but handle gracefully just in case
        if (import.meta.env.DEV && error?.status !== 403) {
          console.warn('[AppHeader] Error checking platform admin status:', error);
        }
        return { is_platform_admin: false };
      }
    },
    enabled: !!user && !isOnPlatformRoute, // Only check in main app, not on platform routes
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on mount if we have cached data
    refetchOnReconnect: false,
    retry: false,
    throwOnError: false,
  });

  const isPlatformAdmin = platformAdminStatus?.is_platform_admin ?? false;

  // Auto-select default school if user has one and no school is selected
  useEffect(() => {
    if (authProfile?.default_school_id && !selectedSchoolId) {
      setSelectedSchoolId(authProfile.default_school_id);
    }
  }, [authProfile?.default_school_id, selectedSchoolId, setSelectedSchoolId]);

  // Only show school switcher if:
  // 1. User has schools_access_all AND multiple schools, OR
  // 2. User has a default school (to show current school even if they can't switch)
  const showSchoolSwitcher = (hasSchoolsAccessAll && schools.length > 1) || 
                             (authProfile?.default_school_id && schools.length > 0);

  // For users with schools_access_all: just update context (temporary switch)
  // For other users: update default_school_id permanently (only if they have permission)
  const handleSchoolChange = (schoolId: string) => {
    // Prevent reload if same school is selected
    if (schoolId === selectedSchoolId) {
      return;
    }

    if (hasSchoolsAccessAll) {
      // Temporary switch - update context and do hard reload
      // Update localStorage synchronously first
      setSelectedSchoolId(schoolId);
      
      // Clear all React Query cache to ensure fresh data
      queryClient.clear();
      
      // Show success message briefly before reload
      showToast.success(t("common.schoolSwitched"));
      
      // Hard reload after a short delay to ensure localStorage is updated and toast is visible
      // This ensures all data is refreshed with the new school context
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } else {
      // Permanent switch - update default_school_id
      // This will also trigger a hard reload after the API call succeeds
      updateMySchool.mutate(schoolId);
    }
  };

  const updateMySchool = useMutation({
    mutationFn: async (schoolId: string) => {
      // Update current user's default_school_id (backend validates org membership)
      await authApi.updateProfile({ default_school_id: schoolId });
    },
    onSuccess: (_data, schoolId) => {
      // Clear all React Query cache to ensure fresh data
      queryClient.clear();
      
      // Update selected school in context to match new default
      setSelectedSchoolId(schoolId);
      
      // Show success message briefly before reload
      showToast.success(t("toast.profileUpdated"));
      
      // Hard reload to ensure all data is refreshed with new school context
      // This ensures all components re-initialize with the new default_school_id
      // No need to call refreshAuth() since hard reload will fetch fresh profile
      setTimeout(() => {
        window.location.reload();
      }, 300);
    },
    onError: (error: any) => {
      showToast.error(error?.message || t("toast.profileUpdateFailed"));
    },
  });
  
  // Map auth profile to UserProfile format
  const profile: UserProfile | null = authProfile ? {
    full_name: authProfile.full_name,
    email: authProfile.email,
    role: authProfile.role,
    avatar_url: authProfile.avatar_url,
  } : null;

  const unreadNotifications = unreadCount?.count ?? 0;

  const languages = [
    { code: "en" as const, name: "English", flag: "🇺🇸" },
    { code: "ps" as const, name: "پښتو", flag: "🇦🇫" },
    { code: "fa" as const, name: "فارسی", flag: "🇮🇷" },
    { code: "ar" as const, name: "العربية", flag: "🇸🇦" }
  ];

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    // In real app, this would update theme context
    document.documentElement.classList.toggle('dark');
  };

  // Keyboard shortcut handler for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+K (Windows/Linux) or Cmd+K (Mac) - case insensitive
      // Only trigger if modifier key is pressed (not just typing 'k')
      if ((event.ctrlKey || event.metaKey) && (event.key === 'k' || event.key === 'K')) {
        const target = event.target as HTMLElement;
        const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        
        // Always allow Ctrl+K / Cmd+K to work, even in input fields
        // This is the standard behavior for command palettes
        event.preventDefault();
        setIsCommandPaletteOpen(true);
        setIsInlineDropdownOpen(false);
        // Don't clear search query - keep it so user can continue searching
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Handle search input focus to show inline dropdown
  const handleSearchFocus = () => {
    if (searchQuery.trim().length >= 2) {
      setIsInlineDropdownOpen(true);
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Ensure we update the search query state - no restrictions on length
    setSearchQuery(value);
    
    // Show dropdown if query is 2+ characters, hide if less
    if (value.trim().length >= 2) {
      setIsInlineDropdownOpen(true);
    } else {
      setIsInlineDropdownOpen(false);
    }
  };

  // Handle search input blur (with delay to allow clicks on dropdown items)
  const handleSearchBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Check if focus is moving to the dropdown
    const relatedTarget = e.relatedTarget as HTMLElement;
    const isMovingToDropdown = relatedTarget && (
      relatedTarget.closest('[cmdk-list]') !== null ||
      relatedTarget.closest('[cmdk-item]') !== null
    );
    
    // Only close if not moving to dropdown
    if (!isMovingToDropdown) {
      // Delay closing to allow clicks on dropdown items
      setTimeout(() => {
        // Double-check that focus hasn't returned to input
        if (document.activeElement !== searchInputRef.current) {
          setIsInlineDropdownOpen(false);
        }
      }, 200);
    }
  };

  // Handle clicking search bar to show dropdown
  const handleSearchClick = () => {
    if (searchQuery.trim().length >= 2) {
      setIsInlineDropdownOpen(true);
    }
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
        <div className="flex-1 max-w-md mx-4" ref={searchContainerRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              onClick={handleSearchClick}
              onKeyDown={(e) => {
                // Allow Ctrl+K / Cmd+K to work in search input
                if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsCommandPaletteOpen(true);
                  setIsInlineDropdownOpen(false);
                  // Keep search query so user can continue searching in command palette
                }
                // Don't prevent other keys - allow normal typing
                // Allow all other keys to work normally
              }}
              className="pl-10 pr-16 bg-muted/50 border-0 focus:bg-background"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">{typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '⌘' : 'Ctrl'}</span>K
            </kbd>
            <InlineSearchDropdown
              open={isInlineDropdownOpen}
              onOpenChange={setIsInlineDropdownOpen}
              searchQuery={searchQuery}
              anchorEl={searchInputRef.current}
            />
          </div>
        </div>

        {/* Global Search Command Palette */}
        <GlobalSearchCommand
          open={isCommandPaletteOpen}
          onOpenChange={(open) => {
            setIsCommandPaletteOpen(open);
            // Clear search query when closing
            if (!open) {
              setSearchQuery('');
            }
          }}
          searchQuery={searchQuery}
          onSearchQueryChange={(value) => {
            // Update search query immediately for normal typing
            setSearchQuery(value);
          }}
        />

        {/* Right Section - Actions & Profile */}
        <div className="flex items-center gap-2">
          {/* Platform Admin Button */}
          {isPlatformAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/platform/dashboard')}
              className="hidden md:flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              <span className="text-sm">Platform Admin</span>
            </Button>
          )}

          {/* School Switcher */}
          {showSchoolSwitcher && (
            <Select
              value={selectedSchoolId ?? authProfile?.default_school_id ?? 'none'}
              onValueChange={(value) => {
                if (value && value !== 'none') {
                  handleSchoolChange(value);
                }
              }}
              disabled={updateMySchool.isPending && !hasSchoolsAccessAll}
            >
              <SelectTrigger className="hidden md:flex w-[200px]">
                <School className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t("common.selectSchool") || "Select School"} />
              </SelectTrigger>
              <SelectContent>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.schoolName}
                    {s.id === authProfile?.default_school_id && !hasSchoolsAccessAll && (
                      <span className="ml-2 text-xs text-muted-foreground">(Default)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                <Languages className="h-4 w-4" />
                <span className="ml-2 text-sm">
                  {languages.find(l => l.code === language)?.flag}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('common.selectLanguage')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
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

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="hidden sm:flex"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Contextual Help */}
          <ContextualHelpButton
            contextKey={undefined} // Will use current route automatically
            variant="ghost"
            size="sm"
          />

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="relative"
            onClick={() => setIsNotificationsOpen(true)}
          >
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

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={profile?.avatar_url || undefined}
                    alt={profile?.full_name || 'User'}
                  />
                  <AvatarFallback className="bg-muted">
                    {profile?.full_name ? (
                      <span className="text-xs font-medium">
                        {profile.full_name
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </span>
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile?.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile?.role}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings/user')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <NotificationDrawer
        open={isNotificationsOpen}
        onOpenChange={setIsNotificationsOpen}
      />
    </header>
  );
}
