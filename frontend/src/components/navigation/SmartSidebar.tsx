import { type LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import {
  Users,
  GraduationCap,
  Calendar,
  Clock,
  BookOpen,
  BookCheck,
  ClipboardList,
  FileText,
  CreditCard,
  Settings,
  Home,
  UserCheck,
  Trophy,
  Building,
  Building2,
  DoorOpen,
  BedDouble,
  Boxes,
  Shield,
  ShieldCheck,
  MessageSquare,
  School,
  ChevronDown,
  ChevronRight,
  Star,
  Target,
  Search,
  X,
  Pin,
  PinOff,
  UserCog,
  Lock,
  AlertTriangle,
  User,
  Package,
  NotebookPen,
  UserPlus,
  BarChart3,
  Hash,
  KeyRound,
  Printer,
  Tag,
  Phone,
  HelpCircle,
  // New unique icons
  FileSpreadsheet,
  FileBarChart,
  FileUser,
  FileCheck,
  FilePlus,
  FileStack,
  FileQuestion,
  FileCode,
  Inbox,
  Send,
  Brain,
  Receipt,
  ClipboardCheck,
  PenTool,
  Timer,
  ListChecks,
  IdCard,
  ScanLine,
  CalendarOff,
  CalendarClock,
  CalendarRange,
  CalendarCheck,
  Settings2,
  Tags,
  Wrench,
  HeartHandshake,
  UserRound,
  UsersRound,
  UserSquare,
  BookMarked,
  Book,
  BookText,
  BookType,
  PieChart,
  DollarSign,
  Table,
  ShieldAlert,
  Medal,
  FileImage,
  Archive,
  Folder,
  UserRoundPlus,
  Grid3x3,
  Library,
  ChartBar,
  BarChart,
  BarChart2,
  LineChart,
  // Additional unique icons for remaining duplicates
  CalendarDays,
  CalendarPlus,
  Landmark,
  ScrollText,
  FileOutput,
  FilePen,
  FilePieChart,
  Layers,
  LayoutGrid,
  Presentation,
  BadgeCheck,
  BadgeDollarSign,
  Gauge,
  Activity,
  ChartLine,
  ChartSpline,
  ChartNoAxesCombined,
  Shapes,
  Component,
  Blocks,
  SquareStack,
  GalleryVerticalEnd,
  Ticket,
  CalendarHeart,
  PartyPopper
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback, useRef, memo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useCurrentOrganization } from "@/hooks/useOrganizations";
import { useHasPermissionAndFeature, useUserPermissions } from "@/hooks/usePermissions";
import { useProfile } from "@/hooks/useProfiles";
import { useSubscriptionGateStatus, type SubscriptionGateStatus } from "@/hooks/useSubscription";
import { useUserRole } from "@/hooks/useUserRole";
import type { UserRole } from "@/types/auth";
import { SecondarySidebar } from "./SecondarySidebar";

/**
 * Helper function to determine if subscription access is blocked
 * CRITICAL: This is the single source of truth for subscription access gating (shared with ProtectedRoute)
 */
function isSubscriptionBlocked(gateStatus: SubscriptionGateStatus | null): boolean {
  if (!gateStatus) return false;

  const { status, accessLevel, trialEndsAt } = gateStatus;

  // Check if trial is expired (trial_ends_at is in the past and status is 'trial')
  const isTrialExpired = status === 'trial' &&
    trialEndsAt &&
    trialEndsAt < new Date();

  // Blocked when:
  // - status is suspended, expired, or cancelled
  // - accessLevel is 'blocked' or 'none'
  // - trial has expired
  return status === 'suspended' ||
    status === 'expired' ||
    status === 'cancelled' ||
    isTrialExpired ||
    accessLevel === 'blocked' ||
    accessLevel === 'none';
}

export interface NavigationChild {
  title: string;
  titleKey?: string; // Translation key for the title
  url?: string; // URL for navigation (optional if it has children)
  icon: LucideIcon;
  contextual?: boolean;
  children?: NavigationChild[]; // Support nested children for submenus
}

type NavigationCategory = 'core' | 'operations' | 'academic' | 'finance' | 'admin';

export interface NavigationItem {
  titleKey: string;
  url?: string;
  icon: LucideIcon;
  badge?: { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } | null;
  roles?: UserRole[]; // Optional - deprecated, using permission-based filtering instead
  children?: NavigationChild[];
  priority?: number;
  contextual?: boolean;
  category?: NavigationCategory;
  iconColor?: string;
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
  const { state, setOpen } = useSidebar();
  const { t, tUnsafe, isRTL } = useLanguage();
  const { user, profile } = useAuth();
  const { data: currentProfile } = useProfile();
  // Use profile role directly from useAuth (most reliable) instead of useUserRole
  const roleFromAuth = profile?.role || currentProfile?.role || null;
  const { role: roleFromHook } = useUserRole();
  // Prefer role from auth/profile over hook (hook might have dev mode fallback)
  const role = roleFromAuth || roleFromHook;
  const { data: currentOrg } = useCurrentOrganization();
  const { data: permissions, isLoading: permissionsLoading } = useUserPermissions();
  // CRITICAL: Use the lite gate status hook (no permission required) for access gating
  const { data: gateStatus, isLoading: gateStatusLoading } = useSubscriptionGateStatus();
  const location = useLocation();
  const flyoutCloseTimerRef = useRef<number | null>(null);
  const [openFlyoutKey, setOpenFlyoutKey] = useState<string | null>(null);

  // CRITICAL: Check if subscription is blocked (expired, suspended, trial ended, etc.)
  // When blocked, sidebar should show NO navigation items
  const subscriptionBlocked = isSubscriptionBlocked(gateStatus);

  // Check if user is on the subscription page (allowed even when blocked)
  const isOnSubscriptionPage = location.pathname.startsWith('/subscription');
  const hasSettingsPermission = useHasPermissionAndFeature('settings.read');
  const hasHelpCenterPermission = useHasPermissionAndFeature('help_center.read');
  const hasBuildingsPermission = useHasPermissionAndFeature('buildings.read');
  const hasRoomsPermission = useHasPermissionAndFeature('rooms.read');
  const hasHostelPermission = useHasPermissionAndFeature('hostel.read');
  const hasOrganizationsPermission = useHasPermissionAndFeature('organizations.read');
  const hasProfilesPermission = useHasPermissionAndFeature('profiles.read');
  const hasUsersPermission = useHasPermissionAndFeature('users.read');
  const hasAuthMonitoringPermission = useHasPermissionAndFeature('auth_monitoring.read');
  const hasSecurityMonitoringPermission = useHasPermissionAndFeature('security_monitoring.read');
  const hasBrandingPermission = useHasPermissionAndFeature('school_branding.read');
  const hasReportsPermission = useHasPermissionAndFeature('reports.read');
  const hasReportTemplatesPermission = useHasPermissionAndFeature('report_templates.read');
  const hasResidencyTypesPermission = useHasPermissionAndFeature('residency_types.read');
  const hasAcademicYearsPermission = useHasPermissionAndFeature('academic_years.read');
  const hasExamTypesPermission = useHasPermissionAndFeature('exam_types.read');
  const hasClassesPermission = useHasPermissionAndFeature('classes.read');
  const hasSubjectsPermission = useHasPermissionAndFeature('subjects.read');
  const hasAssetsPermission = useHasPermissionAndFeature('assets.read');
  const hasStaffPermission = useHasPermissionAndFeature('staff.read');
  const hasStaffReportsPermission = useHasPermissionAndFeature('staff_reports.read');
  const hasAttendanceSessionsPermission = useHasPermissionAndFeature('attendance_sessions.read');
  const hasAttendanceReportsPermission = useHasPermissionAndFeature('attendance_sessions.report');
  const hasLeaveRequestsPermission = useHasPermissionAndFeature('leave_requests.read');
  const hasStudentsPermission = useHasPermissionAndFeature('students.read');
  const hasStudentsImportPermission = useHasPermissionAndFeature('students.import');
  const hasStudentAdmissionsPermission = useHasPermissionAndFeature('student_admissions.read');
  const hasStudentReportsPermission = useHasPermissionAndFeature('student_reports.read');
  const hasStudentAdmissionsReportPermission = useHasPermissionAndFeature('student_admissions.report');
  const hasShortTermCoursesPermission = useHasPermissionAndFeature('short_term_courses.read');
  const hasCourseStudentsPermission = useHasPermissionAndFeature('course_students.read');
  const hasCourseReportsPermission = useHasPermissionAndFeature('course_students.report');
  const hasCourseAttendancePermission = useHasPermissionAndFeature('course_attendance.read');
  const hasCertificateTemplatesPermission = useHasPermissionAndFeature('certificate_templates.read');
  const hasGraduationBatchesPermission = useHasPermissionAndFeature('graduation_batches.read');
  const hasIssuedCertificatesPermission = useHasPermissionAndFeature('issued_certificates.read');
  const hasIdCardsPermission = useHasPermissionAndFeature('id_cards.read');
  const hasIdCardsExportPermission = useHasPermissionAndFeature('id_cards.export');
  const hasCourseDocumentsPermission = useHasPermissionAndFeature('course_documents.read');
  const hasExamDocumentsPermission = useHasPermissionAndFeature('exam_documents.read');
  const hasStaffTypesPermission = useHasPermissionAndFeature('staff_types.read');
  const hasScheduleSlotsPermission = useHasPermissionAndFeature('schedule_slots.read');
  const hasTeacherSubjectAssignmentsPermission = useHasPermissionAndFeature('teacher_subject_assignments.read');
  const hasTimetablesPermission = useHasPermissionAndFeature('timetables.read');
  const hasExamsPermission = useHasPermissionAndFeature('exams.read');
  const hasExamsManagePermission = useHasPermissionAndFeature('exams.manage');
  const hasExamsTimetablePermission = useHasPermissionAndFeature('exams.manage_timetable');
  const hasExamsEnrollPermission = useHasPermissionAndFeature('exams.enroll_students');
  const hasExamsMarksPermission = useHasPermissionAndFeature('exams.enter_marks');
  const hasExamsReportsPermission = useHasPermissionAndFeature('exams.view_reports');
  const hasExamsViewGradeCardsPermission = useHasPermissionAndFeature('exams.view_grade_cards');
  const hasExamsViewConsolidatedReportsPermission = useHasPermissionAndFeature('exams.view_consolidated_reports');
  const hasExamsViewClassReportsPermission = useHasPermissionAndFeature('exams.view_class_reports');
  const hasExamsViewStudentReportsPermission = useHasPermissionAndFeature('exams.view_student_reports');
  const hasExamsAttendancePermission = useHasPermissionAndFeature('exams.manage_attendance');
  const hasExamsViewAttendancePermission = useHasPermissionAndFeature('exams.view_attendance_reports');
  const hasExamsRollNumbersReadPermission = useHasPermissionAndFeature('exams.roll_numbers.read');
  const hasExamsRollNumbersAssignPermission = useHasPermissionAndFeature('exams.roll_numbers.assign');
  const hasExamsSecretNumbersReadPermission = useHasPermissionAndFeature('exams.secret_numbers.read');
  const hasExamsSecretNumbersAssignPermission = useHasPermissionAndFeature('exams.secret_numbers.assign');
  const hasExamsNumbersPrintPermission = useHasPermissionAndFeature('exams.numbers.print');
  const hasExamsQuestionsPermission = useHasPermissionAndFeature('exams.questions.read');
  const hasExamsPapersPermission = useHasPermissionAndFeature('exams.papers.read');
  // Legacy compatibility
  const hasExamsAssignPermission = hasExamsManagePermission || hasExamsEnrollPermission;
  const hasExamsUpdatePermission = hasExamsMarksPermission;
  const hasGradesPermission = useHasPermissionAndFeature('grades.read');
  const hasLibraryBooksPermission = useHasPermissionAndFeature('library_books.read');
  const hasLibraryCategoriesPermission = useHasPermissionAndFeature('library_categories.read');
  const hasLibraryLoansPermission = useHasPermissionAndFeature('library_loans.read');
  const hasLibraryPermission = hasLibraryBooksPermission || hasLibraryCategoriesPermission || hasLibraryLoansPermission;

  // Finance permissions
  const hasFinanceAccountsPermission = useHasPermissionAndFeature('finance_accounts.read');
  const hasIncomeCategoriesPermission = useHasPermissionAndFeature('income_categories.read');
  const hasIncomeEntriesPermission = useHasPermissionAndFeature('income_entries.read');
  const hasExpenseCategoriesPermission = useHasPermissionAndFeature('expense_categories.read');
  const hasExpenseEntriesPermission = useHasPermissionAndFeature('expense_entries.read');
  const hasFinanceProjectsPermission = useHasPermissionAndFeature('finance_projects.read');
  const hasDonorsPermission = useHasPermissionAndFeature('donors.read');
  const hasFinanceReportsPermission = useHasPermissionAndFeature('finance_reports.read');
  const hasCurrenciesPermission = useHasPermissionAndFeature('currencies.read');
  const hasExchangeRatesPermission = useHasPermissionAndFeature('exchange_rates.read');
  const hasFeesPermission = useHasPermissionAndFeature('fees.read');
  const hasFeePaymentsPermission = useHasPermissionAndFeature('fees.payments.create');
  const hasFeeExceptionsPermission = useHasPermissionAndFeature('fees.exceptions.create');
  const hasFinanceDocumentsPermission = useHasPermissionAndFeature('finance_documents.read');
  const hasFinancePermission = hasFinanceAccountsPermission || hasIncomeEntriesPermission || hasExpenseEntriesPermission || hasFinanceProjectsPermission || hasDonorsPermission || hasFinanceReportsPermission || hasCurrenciesPermission || hasExchangeRatesPermission || hasFeesPermission || hasFeePaymentsPermission || hasFeeExceptionsPermission || hasFinanceDocumentsPermission;

  // DMS (Document Management System) permissions
  const hasDmsIncomingPermission = useHasPermissionAndFeature('dms.incoming.read');
  const hasDmsOutgoingPermission = useHasPermissionAndFeature('dms.outgoing.read');
  const hasDmsTemplatesPermission = useHasPermissionAndFeature('dms.templates.read');
  const hasDmsLetterheadsPermission = useHasPermissionAndFeature('dms.letterheads.read');
  const hasDmsLetterTypesPermission = useHasPermissionAndFeature('dms.letter_types.read');
  const hasDmsDepartmentsPermission = useHasPermissionAndFeature('dms.departments.read');
  const hasDmsReportsPermission = useHasPermissionAndFeature('dms.reports.read');
  const hasDmsSettingsPermission = useHasPermissionAndFeature('dms.settings.read');
  const hasDmsArchivePermission = useHasPermissionAndFeature('dms.archive.read');
  const hasDmsPermission = hasDmsIncomingPermission || hasDmsOutgoingPermission || hasDmsTemplatesPermission || hasDmsLetterheadsPermission || hasDmsLetterTypesPermission || hasDmsDepartmentsPermission || hasDmsReportsPermission || hasDmsSettingsPermission || hasDmsArchivePermission;

  // Events permissions
  const hasEventsPermission = useHasPermissionAndFeature('events.read');
  const hasEventTypesPermission = useHasPermissionAndFeature('event_types.read');
  const hasEventGuestsPermission = useHasPermissionAndFeature('event_guests.read');
  const hasEventGuestsCreatePermission = useHasPermissionAndFeature('event_guests.create');
  const hasEventCheckinsCreatePermission = useHasPermissionAndFeature('event_checkins.create');
  const hasEventCheckinsReadPermission = useHasPermissionAndFeature('event_checkins.read');
  const hasEventUpdatePermission = useHasPermissionAndFeature('events.update');
  const hasWebsiteSettingsPermission = useHasPermissionAndFeature('website_settings.read');
  // Show events navigation if user has ANY event-related permission
  const hasEventsNavigation = hasEventsPermission || hasEventTypesPermission || hasEventGuestsPermission || hasEventGuestsCreatePermission || hasEventCheckinsCreatePermission || hasEventCheckinsReadPermission || hasEventUpdatePermission;

  // Phone Book permission - user needs at least one of these permissions
  const hasPhoneBookPermission = hasStudentsPermission || hasStaffPermission || hasDonorsPermission || hasEventGuestsPermission;

  // NOTE: 'location' is already declared above at line 177 - do not redeclare
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    const saved = localStorage.getItem('sidebar-expanded-items');
    return saved ? JSON.parse(saved) : [];
  });
  const [navigationContext, setNavigationContext] = useState<NavigationContext>({
    currentModule: 'dashboard',
    recentTasks: [],
    quickActions: []
  });

  // Secondary sidebar state for website menu
  const [secondarySidebarOpen, setSecondarySidebarOpen] = useState(false);
  const [secondarySidebarItem, setSecondarySidebarItem] = useState<NavigationItem | null>(null);

  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Favorites/Pinned items - now tracking sub-menu items (children) only
  // Format: "childTitleKey" or "parentTitleKey:childTitleKey" for nested items
  const [pinnedItems, setPinnedItems] = useState<string[]>(() => {
    const saved = localStorage.getItem('sidebar-pinned-items');
    return saved ? JSON.parse(saved) : [];
  });

  // Recent items tracking - now tracking sub-menu items (children) only
  const [recentItems, setRecentItems] = useState<Array<{ titleKey: string, url: string, timestamp: number, parentTitleKey?: string }>>(() => {
    const saved = localStorage.getItem('sidebar-recent-items');
    return saved ? JSON.parse(saved) : [];
  });

  // Collapse/expand state for pinned and recent sections
  const [isPinnedSectionExpanded, setIsPinnedSectionExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebar-pinned-expanded');
    return saved ? JSON.parse(saved) : true; // Default expanded
  });

  const [isRecentSectionExpanded, setIsRecentSectionExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebar-recent-expanded');
    return saved ? JSON.parse(saved) : true; // Default expanded
  });

  // Track last clicked menu item to prevent auto-rearrange on same item
  const [lastClickedMenuItem, setLastClickedMenuItem] = useState<{ titleKey: string, parentTitleKey?: string } | null>(null);

  // Collapsible state for category sections
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('sidebar-expanded-categories');
    return saved ? new Set(JSON.parse(saved)) : new Set(['core', 'operations', 'academic', 'finance', 'admin']); // Default all expanded
  });

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const updated = new Set(prev);
      if (updated.has(category)) {
        updated.delete(category);
      } else {
        updated.add(category);
      }
      localStorage.setItem('sidebar-expanded-categories', JSON.stringify(Array.from(updated)));
      return updated;
    });
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Save expanded items to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-expanded-items', JSON.stringify(expandedItems));
  }, [expandedItems]);

  // Save pinned/recent section expanded state
  useEffect(() => {
    localStorage.setItem('sidebar-pinned-expanded', JSON.stringify(isPinnedSectionExpanded));
  }, [isPinnedSectionExpanded]);

  useEffect(() => {
    localStorage.setItem('sidebar-recent-expanded', JSON.stringify(isRecentSectionExpanded));
  }, [isRecentSectionExpanded]);


  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('[data-sidebar-search]') as HTMLInputElement;
        searchInput?.focus();
      }

      // Escape to clear search
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  // Toggle pin functionality - for sub-menu items only
  const togglePin = useCallback((titleKey: string, parentTitleKey?: string) => {
    // Create composite key for nested items, or use titleKey directly for top-level children
    const pinKey = parentTitleKey ? `${parentTitleKey}:${titleKey}` : titleKey;
    setPinnedItems(prev => {
      const updated = prev.includes(pinKey)
        ? prev.filter(k => k !== pinKey)
        : [...prev, pinKey];
      localStorage.setItem('sidebar-pinned-items', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Check if a sub-menu item is pinned
  const isItemPinned = useCallback((titleKey: string, parentTitleKey?: string) => {
    const pinKey = parentTitleKey ? `${parentTitleKey}:${titleKey}` : titleKey;
    return pinnedItems.includes(pinKey);
  }, [pinnedItems]);

  const collapsed = state === "collapsed";
  const currentPath = location.pathname;

  // Note: We no longer auto-close secondary sidebar when main collapses
  // Instead, we control main sidebar state when secondary opens/closes

  // Preserve sidebar scroll position (do NOT auto-scroll on route changes)
  const sidebarScrollRestoredRef = useRef(false);
  useEffect(() => {
    if (collapsed) return;
    if (sidebarScrollRestoredRef.current) return;

    const sidebarContent = document.querySelector('[data-sidebar-content]') as HTMLElement | null;
    if (!sidebarContent) return;

    const scrollEl =
      (sidebarContent.closest('[data-radix-scroll-area-viewport]') as HTMLElement | null) || sidebarContent;

    const saved = Number(localStorage.getItem('sidebar-scroll-top') ?? '0');
    if (!Number.isNaN(saved) && saved > 0) {
      scrollEl.scrollTop = saved;
    }

    const onScroll = () => {
      localStorage.setItem('sidebar-scroll-top', String(scrollEl.scrollTop));
    };
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    sidebarScrollRestoredRef.current = true;

    return () => {
      scrollEl.removeEventListener('scroll', onScroll);
    };
  }, [collapsed]);

  // Permission checks for specific child items
  const hasPermissionsPermission = useHasPermissionAndFeature('permissions.read'); // Assuming this permission exists for permissions management
  const hasRolesPermission = useHasPermissionAndFeature('roles.read'); // Permission for roles management
  const hasAttendanceNavigation = hasAttendanceSessionsPermission || hasAttendanceReportsPermission;

  // Check if user is event user (profile already declared above)
  const isEventUser = profile?.is_event_user === true;

  // Define category colors for icons
  const categoryColors = {
    core: 'text-blue-600 dark:text-blue-400',
    operations: 'text-green-600 dark:text-green-400',
    academic: 'text-purple-600 dark:text-purple-400',
    finance: 'text-emerald-600 dark:text-emerald-400',
    admin: 'text-orange-600 dark:text-orange-400',
    default: 'text-sidebar-foreground/70',
  };

  // Context-aware navigation items - computed with useMemo to avoid hook order issues
  const allNavigationItems = useMemo((): NavigationItem[] => {
    // Type assertion helper to ensure category types are correct
    const asNavItem = <T extends NavigationItem>(item: T): T => item;
    // CRITICAL: When subscription is blocked and user is NOT on subscription page,
    // show NO navigation items. This forces them to stay on the subscription page.
    if (subscriptionBlocked && !isOnSubscriptionPage) {
      return [];
    }

    // CRITICAL: Event users should only see event-related navigation
    if (isEventUser) {
      const eventItems: NavigationItem[] = [];

      // Only add event-related items
      if (hasEventsNavigation) {
        eventItems.push({
          titleKey: "events",
          icon: Calendar,
          badge: null,
          priority: 1,
          category: 'operations' as NavigationCategory,
          iconColor: categoryColors.operations,
          children: [
            ...(hasEventsPermission ? [{
              title: "All Events",
              titleKey: "subjects.all",
              url: "/events",
              icon: CalendarRange,
            }] : []),
            ...(hasEventCheckinsCreatePermission ? [{
              title: "Check-in",
              titleKey: "events.checkin",
              url: "/events",
              icon: ScanLine,
            }] : []),
            ...(hasEventGuestsCreatePermission ? [{
              title: "Add Guest",
              titleKey: "events.addGuest",
              url: "/events",
              icon: UserPlus,
            }] : []),
          ],
        });
      }

      // For event users, return early with only event items
      // No need to filter children - they're already filtered by permissions
      return eventItems.map(item => ({
        ...item,
        visibleChildrenCount: item.children?.length || 0
      }));
    }

    const allItems: NavigationItem[] = [
      {
        titleKey: "dashboard",
        url: "/dashboard",
        icon: Home,
        badge: null,
        priority: 0.5,
        category: 'core' as NavigationCategory,
        iconColor: categoryColors.core,
      },
      ...((hasStaffPermission || hasStaffReportsPermission) ? [asNavItem({
        titleKey: "staffManagement",
        icon: Users,
        badge: null,
        priority: 2,
        category: 'operations' as NavigationCategory,
        iconColor: categoryColors.operations,
        children: [
          ...(hasStaffPermission ? [{
            title: "Staff",
            titleKey: "staff",
            url: "/staff",
            icon: UserRound,
          }] : []),
          ...(hasStaffReportsPermission ? [{
            title: "Staff Reports",
            titleKey: "staffReports",
            url: "/reports/staff-registrations",
            icon: FileSpreadsheet,
          }] : []),
        ],
      })] : []),
      ...(hasPhoneBookPermission ? [asNavItem({
        titleKey: "phoneBook",
        url: "/phonebook",
        icon: Phone,
        badge: null,
        priority: 2.1,
        category: 'operations' as NavigationCategory,
        iconColor: categoryColors.operations,
      })] : []),
      ...(hasAttendanceNavigation ? [asNavItem({
        titleKey: "attendance",
        url: "/attendance",
        icon: UserCheck,
        badge: null,
        priority: 2.2,
        category: 'operations' as NavigationCategory,
        iconColor: categoryColors.operations,
        children: [
          ...(hasAttendanceSessionsPermission ? [{
            title: "Attendance",
            titleKey: "attendance",
            url: "/attendance",
            icon: ClipboardCheck,
          }] : []),
          ...(hasAttendanceSessionsPermission ? [{
            title: "Mark Attendance",
            titleKey: "markAttendance",
            url: "/attendance/marking",
            icon: PenTool,
          }] : []),
          ...(hasAttendanceSessionsPermission ? [{
            title: "Attendance Reports",
            titleKey: "attendanceReports",
            url: "/attendance/reports",
            icon: FileCheck,
          }] : []),
          ...(hasAttendanceReportsPermission ? [{
            title: "Attendance Totals",
            titleKey: "attendanceTotalsReport",
            url: "/attendance/reports/totals",
            icon: ChartNoAxesCombined,
          }] : []),
        ],
      })] : []),
      ...(hasLeaveRequestsPermission ? [asNavItem({
        titleKey: "leaveRequests",
        icon: CalendarOff,
        badge: null,
        priority: 2.3,
        category: 'operations' as NavigationCategory,
        iconColor: categoryColors.operations,
        children: [
          {
            title: "Leave Requests",
            titleKey: "leaveRequests",
            url: "/leave-requests",
            icon: CalendarClock,
          },
          {
            title: "Leave Reports",
            titleKey: "leaveReports",
            url: "/leave-requests/reports",
            icon: BarChart,
          },
        ],
      })] : []),
      ...((hasShortTermCoursesPermission || hasCourseStudentsPermission || hasCourseReportsPermission || hasCourseAttendancePermission || hasCertificateTemplatesPermission || hasCourseDocumentsPermission) ? [asNavItem({
        titleKey: "shortTermCourses",
        icon: Presentation,
        badge: null,
        priority: 4.1,
        category: 'academic' as NavigationCategory,
        iconColor: categoryColors.academic,
        children: [
          ...(hasShortTermCoursesPermission ? [{
            title: "Course Dashboard",
            titleKey: "courseDashboard",
            url: "/course-dashboard",
            icon: LucideIcons.LayoutDashboard,
          }] : []),
          ...(hasShortTermCoursesPermission ? [{
            title: "Courses",
            titleKey: "courses",
            url: "/short-term-courses",
            icon: LucideIcons.BookOpen,
          }] : []),
          ...(hasCourseStudentsPermission ? [{
            title: "Course Students",
            titleKey: "courseStudents",
            url: "/course-students",
            icon: Ticket,
          }] : []),
          ...(hasCourseAttendancePermission ? [{
            title: "Course Attendance",
            titleKey: "courseAttendance",
            url: "/course-attendance",
            icon: Timer,
          }] : []),
          ...(hasCourseStudentsPermission ? [{
            title: "Course Certificates",
            titleKey: "courseCertificates",
            url: "/course-certificates",
            icon: BadgeCheck,
          }] : []),
          ...(hasCertificateTemplatesPermission ? [{
            title: "Certificate Templates",
            titleKey: "certificateTemplates",
            url: "/certificate-templates",
            icon: ScrollText,
          }] : []),
          ...(hasCourseDocumentsPermission ? [{
            title: "Course Documents",
            titleKey: "courseDocuments",
            url: "/course-documents",
            icon: FileStack,
          }] : []),
          ...(hasCourseReportsPermission ? [{
            title: "Course Reports",
            titleKey: "courseReports",
            url: "/course-students/reports",
            icon: PieChart,
          }] : []),
        ],
      })] : []),
      ...((hasGraduationBatchesPermission || hasCertificateTemplatesPermission || hasIssuedCertificatesPermission) ? [asNavItem({
        titleKey: "graduationCertificates",
        icon: LucideIcons.GraduationCap,
        badge: null,
        priority: 4.2,
        category: 'academic' as NavigationCategory,
        iconColor: categoryColors.academic,
        children: [
          ...(hasGraduationBatchesPermission ? [{
            title: "Dashboard",
            titleKey: "dashboard",
            url: "/graduation",
            icon: Grid3x3,
          }] : []),
          ...(hasGraduationBatchesPermission ? [{
            title: "Graduation Batches",
            titleKey: "graduation.batches",
            url: "/graduation/batches",
            icon: LucideIcons.Users,
          }] : []),
          ...(hasCertificateTemplatesPermission ? [{
            title: "Certificate Templates",
            titleKey: "certificates.templates",
            url: "/graduation/certificate-templates",
            icon: LucideIcons.Award,
          }] : []),
          ...(hasIssuedCertificatesPermission ? [{
            title: "Issued Certificates",
            titleKey: "certificates.issued",
            url: "/certificates/issued",
            icon: LucideIcons.Printer,
          }] : []),
        ],
      })] : []),
      ...(hasIdCardsPermission || hasIdCardsExportPermission ? [asNavItem({
        titleKey: "idCards",
        icon: LucideIcons.CreditCard,
        badge: null,
        priority: 4.3,
        category: 'academic' as NavigationCategory,
        iconColor: categoryColors.academic,
        children: [
          ...(hasIdCardsPermission ? [{
            title: "ID Card Templates",
            titleKey: "idCards.templates",
            url: "/id-cards/templates",
            icon: LayoutGrid,
          }] : []),
          ...(hasIdCardsPermission ? [{
            title: "ID Card Assignment",
            titleKey: "idCards.assignment",
            url: "/id-cards/assignment",
            icon: IdCard,
          }] : []),
          ...(hasIdCardsExportPermission ? [{
            title: "ID Card Export",
            titleKey: "events.export",
            url: "/id-cards/export",
            icon: LucideIcons.Download,
          }] : []),
        ],
      })] : []),
      ...((hasStudentsPermission || hasStudentsImportPermission || hasStudentAdmissionsPermission || hasStudentReportsPermission || hasStudentAdmissionsReportPermission) ? [asNavItem({
        titleKey: "studentManagement",
        icon: GraduationCap,
        badge: null,
        priority: 4,
        category: 'academic' as NavigationCategory,
        iconColor: categoryColors.academic,
        children: [
          ...(hasStudentsPermission ? [{
            title: "Students",
            titleKey: "students",
            url: "/students",
            icon: User,
          }] : []),
          ...(hasStudentsImportPermission ? [{
            title: "Bulk Import Students",
            titleKey: "studentsImport",
            url: "/students/import",
            icon: LucideIcons.Upload,
          }] : []),
          ...(hasStudentAdmissionsPermission ? [{
            title: "Admissions",
            titleKey: "admissions",
            url: "/admissions",
            icon: UserRoundPlus,
          }] : []),
          ...(hasStudentReportsPermission ? [{
            title: "Student Reports",
            titleKey: "studentReports",
            url: "/reports/student-registrations",
            icon: FileUser,
          }] : []),
          ...(hasStudentAdmissionsReportPermission ? [{
            title: "Admissions Report",
            titleKey: "admissionsReport",
            url: "/admissions/report",
            icon: FilePlus,
          }] : []),
          ...(hasStudentsPermission ? [{
            title: "Student History",
            titleKey: "studentHistory",
            url: "/students/history",
            icon: LucideIcons.History,
          }] : []),
        ],
      })] : []),
      ...(hasExamsPermission ? [asNavItem({
        titleKey: "exams",
        icon: Trophy,
        badge: null,
        priority: 5,
        category: 'academic' as NavigationCategory,
        iconColor: categoryColors.academic,
        children: [
          ...(hasExamsPermission ? [{
            title: "Exams",
            titleKey: "exams",
            url: "/exams",
            icon: Medal,
          }] : []),
          ...(hasExamsMarksPermission ? [{
            title: "Exam Marks",
            titleKey: "examMarks",
            url: "/exams/marks",
            icon: NotebookPen,
          }] : []),
          ...((hasExamsAttendancePermission || hasExamsViewAttendancePermission) ? [{
            title: "Exam Attendance",
            titleKey: "examAttendance",
            url: "/exams/attendance",
            icon: ListChecks,
          }] : []),
          ...(hasExamsTimetablePermission ? [{
            title: "Exam Timetables",
            titleKey: "examTimetables",
            url: "/exams/timetables",
            icon: Clock,
          }] : []),
          // Exam Management Submenu (Enrollment, Student Enrollment, Roll Numbers, Secret Numbers)
          ...((hasExamsManagePermission || hasExamsEnrollPermission || hasExamsRollNumbersReadPermission || hasExamsRollNumbersAssignPermission || hasExamsSecretNumbersReadPermission || hasExamsSecretNumbersAssignPermission) ? [{
            title: "Exam Management",
            titleKey: "examManagement",
            icon: Wrench,
            children: [
              ...(hasExamsManagePermission ? [{
                title: "Exam Enrollment",
                titleKey: "examEnrollment",
                url: "/exams/enrollment",
                icon: BadgeCheck,
              }] : []),
              ...(hasExamsEnrollPermission ? [{
                title: "Student Enrollment",
                titleKey: "examStudentEnrollment",
                url: "/exams/student-enrollment",
                icon: GalleryVerticalEnd,
              }] : []),
              ...((hasExamsRollNumbersReadPermission || hasExamsRollNumbersAssignPermission) ? [{
                title: "Roll Numbers",
                titleKey: "examRollNumbers",
                url: "/exams/roll-numbers",
                icon: Hash,
              }] : []),
              ...((hasExamsSecretNumbersReadPermission || hasExamsSecretNumbersAssignPermission) ? [{
                title: "Secret Numbers",
                titleKey: "examSecretNumbers",
                url: "/exams/secret-numbers",
                icon: KeyRound,
              }] : []),
            ],
          }] : []),
          // Questions & Papers Submenu
          ...((hasExamsQuestionsPermission || hasExamsPapersPermission) ? [{
            title: "Questions & Papers",
            titleKey: "questionsAndPapers",
            icon: LucideIcons.BookOpen,
            children: [
              ...(hasExamsQuestionsPermission ? [{
                title: "Question Bank",
                titleKey: "questionBank",
                url: "/exams/question-bank",
                icon: LucideIcons.HelpCircle,
              }] : []),
              ...(hasExamsPapersPermission ? [{
                title: "Exam Papers",
                titleKey: "examPapers",
                url: "/exams/papers",
                icon: FileQuestion,
              }] : []),
              ...(hasExamsPapersPermission ? [{
                title: "Print Tracking",
                titleKey: "examPaperPrintTracking",
                url: "/exams/papers/print-tracking",
                icon: LucideIcons.Scan,
              }] : []),
            ],
          }] : []),
          ...(hasExamDocumentsPermission ? [{
            title: "Exam Documents",
            titleKey: "examDocuments",
            url: "/exam-documents",
            icon: FileOutput,
          }] : []),
          // Reports Submenu - at the end
          ...((hasExamsReportsPermission || hasExamsViewGradeCardsPermission || hasExamsViewConsolidatedReportsPermission || hasExamsViewClassReportsPermission || hasExamsViewStudentReportsPermission || hasExamsNumbersPrintPermission) ? [{
            title: "Reports",
            titleKey: "examReports",
            icon: FileBarChart,
            children: [
              ...(hasExamsReportsPermission ? [{
                title: "Exam Insights",
                titleKey: "examInsights",
                url: "/exams/reports",
                icon: Brain,
              }] : []),
              ...(hasExamsReportsPermission ? [{
                title: "Exam Analytics",
                titleKey: "examAnalytics",
                url: "/exams/analytics",
                icon: ChartSpline,
              }] : []),
              ...(hasExamsViewConsolidatedReportsPermission ? [{
                title: "Consolidated Mark Sheet",
                titleKey: "consolidatedMarkSheet",
                url: "/exams/reports/consolidated",
                icon: Table,
              }] : []),
              ...(hasExamsViewClassReportsPermission ? [{
                title: "Class Subject Mark Sheet",
                titleKey: "classSubjectMarkSheet",
                url: "/exams/reports/class-subject",
                icon: FilePen,
              }] : []),
              ...(hasExamsViewStudentReportsPermission ? [{
                title: "Student Report Card",
                titleKey: "studentReportCard",
                url: "/exams/reports/student",
                icon: LucideIcons.User,
              }] : []),
              ...((hasExamsRollNumbersReadPermission || hasExamsNumbersPrintPermission) ? [{
                title: "Number Reports",
                titleKey: "examNumberReports",
                url: "/exams/number-reports",
                icon: Printer,
              }] : []),
            ],
          }] : []),
        ],
      })] : []),
      ...(hasHostelPermission || hasBuildingsPermission || hasRoomsPermission ? [asNavItem({
        titleKey: "hostel",
        icon: BedDouble,
        badge: null,
        priority: 6,
        category: 'operations' as NavigationCategory,
        iconColor: categoryColors.operations,
        children: [
          ...(hasHostelPermission ? [{
            title: "Hostel overview",
            titleKey: "hostel.overview",
            url: "/hostel",
            icon: BedDouble,
          }] : []),
          ...(hasBuildingsPermission ? [{
            title: "Buildings Management",
            titleKey: "buildingsManagement",
            url: "/settings/buildings",
            icon: Building2,
          }] : []),
          ...(hasRoomsPermission ? [{
            title: "Rooms Management",
            titleKey: "roomsManagement",
            url: "/settings/rooms",
            icon: DoorOpen,
          }] : []),
          ...((hasReportsPermission && hasHostelPermission) ? [{
            title: "Hostel reports",
            titleKey: "hostel.reports",
            url: "/hostel/reports",
            icon: BarChart2,
          }] : []),
        ],
      })] : []),
      ...(hasLibraryPermission ? [asNavItem({
        titleKey: "library",
        icon: BookOpen,
        badge: null,
        priority: 7,
        category: 'operations' as NavigationCategory,
        iconColor: categoryColors.operations,
        children: [
          ...(hasLibraryBooksPermission ? [{
            title: "Dashboard",
            titleKey: "library.dashboard",
            url: "/library/dashboard",
            icon: Library,
          }] : []),
          ...(hasLibraryCategoriesPermission ? [{
            title: "Categories",
            titleKey: "library.categories",
            url: "/library/categories",
            icon: BookMarked,
          }] : []),
          ...(hasLibraryBooksPermission ? [{
            title: "Books",
            titleKey: "library.books",
            url: "/library/books",
            icon: Book,
          }] : []),
          ...(hasLibraryLoansPermission ? [{
            title: "Distribution",
            titleKey: "library.distribution",
            url: "/library/distribution",
            icon: BookCheck,
          }] : []),
          ...(hasLibraryBooksPermission ? [{
            title: "Reports",
            titleKey: "library.reports",
            url: "/library/reports",
            icon: ChartBar,
          }] : []),
        ],
      })] : []),
      ...(hasFinancePermission ? [asNavItem({
        titleKey: "finance",
        icon: CreditCard,
        badge: null,
        priority: 8,
        category: 'finance' as NavigationCategory,
        iconColor: categoryColors.finance,
        children: [
          ...(hasFinanceAccountsPermission ? [{
            title: "Dashboard",
            titleKey: "finance.dashboard",
            url: "/finance/dashboard",
            icon: LucideIcons.TrendingUp,
          }] : []),
          ...(hasFinanceAccountsPermission ? [{
            title: "Accounts",
            titleKey: "finance.accounts",
            url: "/finance/accounts",
            icon: LucideIcons.Wallet,
          }] : []),
          ...(hasIncomeEntriesPermission ? [{
            title: "Income",
            titleKey: "finance.income",
            url: "/finance/income",
            icon: LucideIcons.ArrowUpCircle,
          }] : []),
          ...(hasExpenseEntriesPermission ? [{
            title: "Expenses",
            titleKey: "finance.expenses",
            url: "/finance/expenses",
            icon: LucideIcons.TrendingDown,
          }] : []),
          ...(hasFinanceProjectsPermission ? [{
            title: "Projects",
            titleKey: "finance.projects",
            url: "/finance/projects",
            icon: LucideIcons.FolderKanban,
          }] : []),
          ...(hasDonorsPermission ? [{
            title: "Donors",
            titleKey: "finance.donors",
            url: "/finance/donors",
            icon: HeartHandshake,
          }] : []),
          ...(hasFinanceDocumentsPermission ? [{
            title: "Documents",
            titleKey: "finance.financeDocuments",
            url: "/finance/documents",
            icon: Receipt,
          }] : []),
          ...(hasFinanceReportsPermission ? [{
            title: "Reports",
            titleKey: "finance.reports",
            url: "/finance/reports",
            icon: LineChart,
          }] : []),
          // Settings submenu - only show if user has at least one settings permission
          ...((hasCurrenciesPermission || hasIncomeCategoriesPermission ||
            hasExpenseCategoriesPermission || hasExchangeRatesPermission) ? [{
              title: "Settings",
              titleKey: "finance.settings",
              url: "/finance/settings",
              icon: Settings2,
            }] : []),
        ],
      })] : []),
      ...(hasFeesPermission ? [{
        titleKey: "finance.fees",
        icon: LucideIcons.Banknote,
        badge: null,
        priority: 8.1,
        category: 'finance' as NavigationCategory,
        iconColor: categoryColors.finance,
        children: [
          {
            title: "Dashboard",
            titleKey: "finance.fees.dashboard",
            url: "/finance/fees/dashboard",
            icon: DollarSign,
          },
          {
            title: "Structures",
            titleKey: "finance.fees.structures",
            url: "/finance/fees/structures",
            icon: LucideIcons.ListChecks,
          },
          {
            title: "Assignments",
            titleKey: "finance.fees.assignments",
            url: "/finance/fees/assignments",
            icon: LucideIcons.NotebookPen,
          },
          ...(hasFeePaymentsPermission ? [{
            title: "Payments",
            titleKey: "finance.fees.payments",
            url: "/finance/fees/payments",
            icon: BadgeDollarSign,
          }] : []),
          ...(hasFeeExceptionsPermission ? [{
            title: "Exceptions",
            titleKey: "finance.fees.exceptions",
            url: "/finance/fees/exceptions",
            icon: ShieldAlert,
          }] : []),
          {
            title: "Reports",
            titleKey: "finance.fees.reports",
            url: "/finance/fees/reports",
            icon: FilePieChart,
          },
        ].filter(Boolean) as NavigationChild[],
      }] : []),
      ...(hasDmsPermission ? [asNavItem({
        titleKey: "document-system",
        icon: FileText,
        badge: null,
        priority: 7.5,
        category: 'operations' as NavigationCategory,
        iconColor: categoryColors.operations,
        children: [
          ...(hasDmsIncomingPermission || hasDmsOutgoingPermission ? [{
            title: "DMS Dashboard",
            titleKey: "dms.dashboard",
            url: "/dms/dashboard",
            icon: Gauge,
          }] : []),
          ...(hasDmsIncomingPermission ? [{
            title: "Incoming",
            titleKey: "dms.incoming",
            url: "/dms/incoming",
            icon: Inbox,
          }] : []),
          ...(hasDmsOutgoingPermission ? [{
            title: "Outgoing",
            titleKey: "dms.outgoing",
            url: "/dms/outgoing",
            icon: Send,
          }] : []),
          ...(hasDmsOutgoingPermission ? [{
            title: "Issue Letter",
            titleKey: "dms.issueLetterNav",
            url: "/dms/issue-letter",
            icon: MessageSquare,
          }] : []),
          ...(hasDmsTemplatesPermission ? [{
            title: "Templates",
            titleKey: "dms.templates",
            url: "/dms/templates",
            icon: FileCode,
          }] : []),
          ...(hasDmsLetterheadsPermission ? [{
            title: "Letterheads",
            titleKey: "dms.letterheads",
            url: "/dms/letterheads",
            icon: FileImage,
          }] : []),
          ...(hasDmsLetterTypesPermission ? [{
            title: "Letter Types",
            titleKey: "dms.letterTypes",
            url: "/dms/letter-types",
            icon: Tag,
          }] : []),
          ...(hasDmsDepartmentsPermission ? [{
            title: "Departments",
            titleKey: "dms.departments",
            url: "/dms/departments",
            icon: Building,
          }] : []),
          ...(hasDmsArchivePermission ? [{
            title: "Archive",
            titleKey: "dms.archive",
            url: "/dms/archive",
            icon: Archive,
          }] : []),
          ...(hasDmsReportsPermission ? [{
            title: "Reports",
            titleKey: "dms.reports",
            url: "/dms/reports",
            icon: BarChart2,
          }] : []),
          ...(hasDmsSettingsPermission ? [{
            title: "Settings",
            titleKey: "dms.settings",
            url: "/dms/settings",
            icon: SquareStack,
          }] : []),
        ],
      })] : []),
      ...(hasEventsNavigation ? [asNavItem({
        titleKey: "events",
        icon: Calendar,
        badge: null,
        priority: 6.5,
        category: 'operations' as NavigationCategory,
        iconColor: categoryColors.operations,
        children: [
          ...(hasEventsPermission ? [{
            title: "All Events",
            titleKey: "events.all",
            url: "/events",
            icon: CalendarHeart,
          }] : []),
          ...(hasEventCheckinsCreatePermission ? [{
            title: "Check-in",
            titleKey: "events.checkin",
            url: "/events",
            icon: ScanLine,
          }] : []),
          ...(hasEventGuestsCreatePermission ? [{
            title: "Add Guest",
            titleKey: "events.addGuest",
            url: "/events",
            icon: UserPlus,
          }] : []),
          ...(hasEventTypesPermission ? [{
            title: "Event Types",
            titleKey: "events.types",
            url: "/events/types",
            icon: Tags,
          }] : []),
          ...(hasEventUpdatePermission ? [{
            title: "Event Users",
            titleKey: "events.users",
            url: "/events",
            icon: Shield,
          }] : []),
        ],
      })] : []),
      ...(hasAssetsPermission ? [asNavItem({
        titleKey: "assets",
        icon: Boxes,
        badge: null,
        priority: 7.1,
        category: 'operations' as NavigationCategory,
        iconColor: categoryColors.operations,
        children: [
          {
            title: "Assets Dashboard",
            titleKey: "assets.dashboard",
            url: "/assets/dashboard",
            icon: LucideIcons.LayoutDashboard,
          },
          {
            title: "Asset Categories",
            titleKey: "assets.categories",
            url: "/assets/categories",
            icon: Folder,
          },
          {
            title: "Asset Management",
            titleKey: "students.management",
            url: "/assets",
            icon: Boxes,
          },
          {
            title: "Asset Assignments",
            titleKey: "assets.assignments",
            url: "/assets/assignments",
            icon: ShieldCheck,
          },
          {
            title: "Asset Reports",
            titleKey: "assets.reports",
            url: "/assets/reports",
            icon: BarChart,
          },
        ],
      })] : []),
      ...((hasClassesPermission || hasSubjectsPermission || hasTeacherSubjectAssignmentsPermission || hasTimetablesPermission) ? [asNavItem({
        titleKey: "academicManagement",
        icon: Landmark,
        badge: null,
        priority: 4.5,
        category: 'academic' as NavigationCategory,
        iconColor: categoryColors.academic,
        children: [
          ...(hasClassesPermission ? [{
            title: "Classes",
            titleKey: "academic.classes.title",
            url: "/settings/classes",
            icon: Layers,
          }] : []),
          ...(hasSubjectsPermission ? [{
            title: "Subjects",
            titleKey: "academic.subjects.title",
            url: "/settings/subjects",
            icon: BookText,
          }] : []),
          ...(hasTeacherSubjectAssignmentsPermission ? [{
            title: "Teacher Subject Assignments",
            titleKey: "teacherSubjectAssignments.title",
            url: "/settings/teacher-subject-assignments",
            icon: Component,
          }] : []),
        ],
      })] : []),
      ...((hasTimetablesPermission || hasScheduleSlotsPermission) ? [asNavItem({
        titleKey: "timetables",
        icon: CalendarClock,
        badge: null,
        priority: 4.6,
        category: 'academic' as NavigationCategory,
        iconColor: categoryColors.academic,
        children: [
          ...(hasTimetablesPermission ? [{
            title: "Timetable Generation",
            titleKey: "timetable.title",
            url: "/academic/timetable-generation",
            icon: CalendarCheck,
          }] : []),
          ...(hasScheduleSlotsPermission ? [{
            title: "Schedule Slots",
            titleKey: "academic.scheduleSlots.title",
            url: "/settings/schedule-slots",
            icon: Clock,
          }] : []),
        ],
      })] : []),
      {
        titleKey: "settings",
        icon: Settings,
        badge: null,
        priority: 10,
        category: 'admin' as NavigationCategory,
        iconColor: categoryColors.admin,
        children: [
          // Only show child items if user has the required permission
          // Organizations Management moved to Subscription Admin page
          ...(hasProfilesPermission ? [{
            title: "Profile Management",
            titleKey: "profileManagement",
            url: "/settings/profile",
            icon: UserCog,
          }] : []),
          ...(hasPermissionsPermission ? [{
            title: "Permissions Management",
            titleKey: "permissionsManagement",
            url: "/settings/permissions",
            icon: Shield,
          }] : []),
          ...(hasRolesPermission ? [{
            title: "Roles Management",
            titleKey: "rolesManagement",
            url: "/settings/roles",
            icon: Blocks,
          }] : []),
          ...(hasPermissionsPermission ? [{
            title: "User Permissions",
            titleKey: "userPermissions",
            url: "/settings/user-permissions",
            icon: User,
          }] : []),
          ...(hasUsersPermission ? [{
            title: "User Management",
            titleKey: "userManagement",
            url: "/admin/users",
            icon: UsersRound,
          }] : []),
        ],
      },
      ...(hasWebsiteSettingsPermission ? [asNavItem({
        titleKey: "websiteManager",
        icon: LucideIcons.Globe,
        badge: null,
        priority: 10.2,
        category: 'admin' as NavigationCategory,
        iconColor: categoryColors.admin,
        children: [
          {
            title: "Website Manager",
            titleKey: "websiteManager.settings",
            url: "/website",
            icon: Settings2,
          },
          {
            title: "Navigation",
            titleKey: "websiteManager.navigation",
            url: "/website/navigation",
            icon: ListChecks,
          },
          {
            title: "Pages",
            titleKey: "websiteManager.pages",
            url: "/website/pages",
            icon: FileText,
          },
          {
            title: "Announcements",
            titleKey: "websiteManager.announcements",
            url: "/website/announcements",
            icon: PartyPopper,
          },
          {
            title: "Courses & Programs",
            titleKey: "websiteManager.courses",
            url: "/website/courses",
            icon: BookOpen,
          },
          {
            title: "Articles & Blog",
            titleKey: "websiteManager.articles",
            url: "/website/articles",
            icon: BookText,
          },
          {
            title: "Library & Books",
            titleKey: "websiteManager.library",
            url: "/website/library",
            icon: Library,
          },
          {
            title: "Events",
            titleKey: "websiteManager.events",
            url: "/website/events",
            icon: CalendarClock,
          },
          {
            title: "Online Admissions",
            titleKey: "websiteManager.admissions",
            url: "/website/admissions",
            icon: ClipboardList,
          },
          {
            title: "Gallery Albums",
            titleKey: "websiteManager.gallery",
            url: "/website/gallery",
            icon: GalleryVerticalEnd,
          },
          {
            title: "Media Library",
            titleKey: "websiteManager.media",
            url: "/website/media",
            icon: FileImage,
          },
          {
            title: "Scholars & Staff",
            titleKey: "websiteManager.scholars",
            url: "/website/scholars",
            icon: UserRound,
          },
          {
            title: "Graduates",
            titleKey: "websiteManager.graduates",
            url: "/website/graduates",
            icon: GraduationCap,
          },
          {
            title: "Donations",
            titleKey: "websiteManager.donations",
            url: "/website/donations",
            icon: HeartHandshake,
          },
          {
            title: "Questions & Fatwas",
            titleKey: "websiteManager.fatwas",
            url: "/website/fatwas",
            icon: FileQuestion,
          },
          {
            title: "Inbox",
            titleKey: "websiteManager.inbox",
            url: "/website/inbox",
            icon: Inbox,
          },
          {
            title: "SEO Tools",
            titleKey: "websiteManager.seo",
            url: "/website/seo",
            icon: Search,
          },
          {
            title: "Users & Roles",
            titleKey: "websiteManager.users",
            url: "/website/users",
            icon: UsersRound,
          },
          {
            title: "Audit Logs",
            titleKey: "websiteManager.audit",
            url: "/website/audit",
            icon: ClipboardList,
          },
          {
            title: "Open public site",
            titleKey: "websiteManager.openPublicSite",
            url: "/public-site",
            icon: LucideIcons.ExternalLink,
          },
        ],
      })] : []),
      ...(hasHelpCenterPermission ? [asNavItem({
        titleKey: "helpCenter",
        url: "/help-center",
        icon: HelpCircle,
        badge: null,
        priority: 10.5,
        category: 'admin' as NavigationCategory,
        iconColor: categoryColors.admin,
      })] : []),
      {
        titleKey: "academicSettings",
        icon: Shapes,
        badge: null,
        priority: 9,
        category: 'admin' as NavigationCategory,
        iconColor: categoryColors.admin,
        children: [
          // Only show child items if user has the required permission
          ...(hasBrandingPermission ? [{
            title: "Schools Management",
            titleKey: "schoolsManagement",
            url: "/settings/schools",
            icon: School,
          }] : []),
          ...(hasReportTemplatesPermission ? [{
            title: "Report Templates",
            titleKey: "reportTemplates",
            url: "/settings/report-templates",
            icon: Activity,
          }] : []),
          ...(hasResidencyTypesPermission ? [{
            title: "Residency Types",
            titleKey: "academic.residencyTypes.title",
            url: "/settings/residency-types",
            icon: BookType,
          }] : []),
          ...(hasAcademicYearsPermission ? [{
            title: "Academic Years",
            titleKey: "academic.academicYears.title",
            url: "/settings/academic-years",
            icon: CalendarDays,
          }] : []),
          ...(hasExamTypesPermission ? [{
            title: "Exam Types",
            titleKey: "examTypes",
            url: "/settings/exam-types",
            icon: ClipboardList,
          }] : []),
          ...(hasStaffTypesPermission ? [{
            title: "Staff Types",
            titleKey: "staffTypes",
            url: "/settings/staff-types",
            icon: UserSquare,
          }] : []),
          ...(hasGradesPermission ? [{
            title: "Grades Management",
            titleKey: "grades.management",
            url: "/settings/grades",
            icon: Star,
          }] : []),
        ],
      },
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
      // Dashboard should not show for event users
      if (item.titleKey === 'dashboard') {
        return !isEventUser; // Hide dashboard for event users
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
        // Show if user has any academic-related permission (excluding classes, subjects, assignments, and exams which are in separate menus)
        return hasBuildingsPermission || hasRoomsPermission || hasBrandingPermission || hasReportsPermission || hasResidencyTypesPermission || hasAcademicYearsPermission || hasExamTypesPermission || hasStaffTypesPermission || hasGradesPermission;
      }

      if (item.titleKey === 'exams') {
        // Show if user has any exam-related permission
        return hasExamsPermission || hasExamsManagePermission || hasExamsTimetablePermission ||
          hasExamsEnrollPermission || hasExamsMarksPermission || hasExamsReportsPermission ||
          hasExamsViewGradeCardsPermission || hasExamsViewConsolidatedReportsPermission ||
          hasExamsViewClassReportsPermission || hasExamsViewStudentReportsPermission ||
          hasExamsAttendancePermission || hasExamsViewAttendancePermission ||
          hasExamsRollNumbersReadPermission || hasExamsRollNumbersAssignPermission ||
          hasExamsSecretNumbersReadPermission || hasExamsSecretNumbersAssignPermission ||
          hasExamsNumbersPrintPermission ||
          hasExamsQuestionsPermission || hasExamsPapersPermission ||
          hasExamDocumentsPermission;
        // Note: examManagement submenu visibility is already handled by its permission checks above
      }

      if (item.titleKey === 'hostel') {
        // Show if user has any hostel-related permission (hostel, buildings, or rooms)
        return hasHostelPermission || hasBuildingsPermission || hasRoomsPermission;
      }

      if (item.titleKey === 'academicManagement') {
        // Show if user has any academic management permission
        return hasClassesPermission || hasSubjectsPermission || hasTeacherSubjectAssignmentsPermission;
      }

      if (item.titleKey === 'timetables') {
        // Show if user has access to timetables or schedule slots
        return hasTimetablesPermission || hasScheduleSlotsPermission;
      }

      if (item.titleKey === 'studentManagement') {
        // Show if user has any student-related permission
        return hasStudentsPermission || hasStudentAdmissionsPermission || hasStudentReportsPermission || hasStudentAdmissionsReportPermission;
      }

      if (item.titleKey === 'staffManagement') {
        // Show if user has any staff-related permission
        return hasStaffPermission || hasStaffReportsPermission;
      }

      return true;
    });
  }, [subscriptionBlocked, isOnSubscriptionPage, hasSettingsPermission, hasOrganizationsPermission, hasBuildingsPermission, hasRoomsPermission, hasAssetsPermission, hasProfilesPermission, hasUsersPermission, hasBrandingPermission, hasReportsPermission, hasPermissionsPermission, hasRolesPermission, hasResidencyTypesPermission, hasAcademicYearsPermission, hasExamTypesPermission, hasClassesPermission, hasSubjectsPermission, hasScheduleSlotsPermission, hasTeacherSubjectAssignmentsPermission, hasTimetablesPermission, hasStaffPermission, hasAttendanceSessionsPermission, hasLeaveRequestsPermission, hasStudentsPermission, hasStudentAdmissionsPermission, hasStudentReportsPermission, hasStudentAdmissionsReportPermission, hasHostelPermission, hasShortTermCoursesPermission, hasCourseStudentsPermission, hasCourseReportsPermission, hasCourseAttendancePermission, hasCertificateTemplatesPermission, hasCourseDocumentsPermission, hasExamDocumentsPermission, hasIdCardsPermission, hasFinancePermission, hasFinanceAccountsPermission, hasIncomeCategoriesPermission, hasIncomeEntriesPermission, hasExpenseCategoriesPermission, hasExpenseEntriesPermission, hasFinanceProjectsPermission, hasDonorsPermission, hasFinanceReportsPermission, hasDmsPermission, hasDmsIncomingPermission, hasDmsOutgoingPermission, hasDmsTemplatesPermission, hasDmsLetterheadsPermission, hasDmsDepartmentsPermission, hasDmsReportsPermission, hasDmsSettingsPermission, hasDmsArchivePermission]);

  // NOTE: allNavigationItems already handles subscription blocking via subscriptionBlocked check
  // No additional filtering needed here - the logic is centralized in allNavigationItems useMemo

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
        // TODO: Migrate to Laravel API endpoint for user navigation context
        // For now, return empty array - this feature needs Laravel API implementation
        const tasks: DbRecentTask[] = [];
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

    // Realtime subscriptions disabled - using Laravel API instead
    // If needed, implement polling or use React Query's refetchInterval
  }, [currentModule, role, user?.id]);

  // Use the role from useUserRole, or fallback to profile role
  const effectiveRole = useMemo(() => {
    // Priority: 1. role from useUserRole, 2. profile role, 3. null
    if (role) return role;
    if (currentProfile?.role) return currentProfile.role as UserRole;
    // Only use admin fallback in dev mode if no user at all
    if (import.meta.env.DEV && import.meta.env.VITE_DISABLE_AUTH !== 'false' && !user) {
      return 'admin' as UserRole;
    }
    return null;
  }, [role, currentProfile?.role, user]);

  // Wait for permissions to load before filtering items (prevents flash)
  // All users need permissions loaded
  // Permissions are ready if:
  // 1. We have cached permissions (even if refetching in background)
  // 2. We're not loading (permissions already loaded or failed)
  const permissionsReady = permissions !== undefined || !permissionsLoading;

  // Memoize navigation items to prevent recalculation on every render
  // Always render items if we have a role, even if permissions are still loading
  // This prevents the sidebar from disappearing during background refetches
  const filteredItems = useMemo(() => {
    // If permissions are not ready, return empty array to prevent flash
    if (!permissionsReady) {
      return [];
    }
    if (!effectiveRole) {
      return [];
    }
    // Items are already filtered by permissions and subscription status when building allNavigationItems
    // Just sort by priority (lower number = higher priority)
    return [...allNavigationItems].sort((a, b) => (a.priority || 999) - (b.priority || 999));
  }, [allNavigationItems, permissionsReady, effectiveRole]);

  // Filter items by search query
  const filteredBySearch = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return filteredItems;

    const query = debouncedSearchQuery.toLowerCase();
    return filteredItems.filter(item => {
      const label = tUnsafe(`nav.${item.titleKey}`).toLowerCase();
      const matchesParent = label.includes(query);

      // Also check children
      const matchesChildren = item.children?.some(child => {
        const childLabel = (child.title || tUnsafe(`nav.${child.titleKey || ''}`)).toLowerCase();
        return childLabel.includes(query);
      });

      return matchesParent || matchesChildren;
    });
  }, [debouncedSearchQuery, filteredItems, tUnsafe]);

  // Get all sub-menu items (children) from all navigation items
  const allSubMenuItems = useMemo(() => {
    const items: Array<{
      titleKey: string;
      url: string;
      icon: LucideIcon;
      parentTitleKey?: string;
      parentLabel?: string;
    }> = [];

    filteredBySearch.forEach(item => {
      if (item.children) {
        item.children.forEach(child => {
          if (child.url && child.titleKey) {
            items.push({
              titleKey: child.titleKey,
              url: child.url,
              icon: child.icon,
              parentTitleKey: item.titleKey,
              parentLabel: tUnsafe(`nav.${item.titleKey}`),
            });
          }
          // Also check nested children
          if (child.children) {
            child.children.forEach(grandchild => {
              if (grandchild.url && grandchild.titleKey) {
                items.push({
                  titleKey: grandchild.titleKey,
                  url: grandchild.url,
                  icon: grandchild.icon,
                  parentTitleKey: item.titleKey,
                  parentLabel: tUnsafe(`nav.${item.titleKey}`),
                });
              }
            });
          }
        });
      }
    });

    return items;
  }, [filteredBySearch, tUnsafe]);

  // Separate pinned sub-menu items
  const pinnedItemsList = useMemo(() => {
    return allSubMenuItems.filter(item => {
      const pinKey = item.parentTitleKey ? `${item.parentTitleKey}:${item.titleKey}` : item.titleKey;
      return pinnedItems.includes(pinKey);
    });
  }, [allSubMenuItems, pinnedItems]);

  // Non-pinned items (all top-level items, since we only pin sub-menu items now)
  const nonPinnedItems = useMemo(() => {
    return filteredBySearch;
  }, [filteredBySearch]);

  // Group items by category for better organization
  const groupedItems = useMemo(() => {
    const groups: Record<NavigationCategory, NavigationItem[]> = {
      core: [],
      operations: [],
      academic: [],
      finance: [],
      admin: [],
    };

    nonPinnedItems.forEach(item => {
      const category = item.category || 'operations';
      if (groups[category]) {
        groups[category].push(item);
      } else {
        groups.operations.push(item); // Default fallback
      }
    });

    return groups;
  }, [nonPinnedItems]);

  // Group pinned items by parent category (for display purposes)
  const groupedPinnedItems = useMemo(() => {
    const groups: Record<string, typeof pinnedItemsList> = {};

    pinnedItemsList.forEach(item => {
      const parentKey = item.parentTitleKey || 'other';
      if (!groups[parentKey]) {
        groups[parentKey] = [];
      }
      groups[parentKey].push(item);
    });

    return groups;
  }, [pinnedItemsList]);

  // Auto-collapse other parent menus when navigating to a submenu.
  // Keeps ONLY the currently active parent (and nested parent, if any) expanded.
  useEffect(() => {
    if (collapsed) return;

    const nextExpanded = new Set<string>();

    for (const item of filteredItems) {
      if (!item.children) continue;

      // Direct child match
      const directChildMatch = item.children.find((c) => c.url && currentPath.startsWith(c.url));
      if (directChildMatch) {
        nextExpanded.add(item.titleKey);
        continue;
      }

      // Grandchild match: expand parent + the child group that contains the grandchild
      for (const child of item.children) {
        if (!child.children) continue;
        const grandchildMatch = child.children.find((gc) => gc.url && currentPath.startsWith(gc.url));
        if (grandchildMatch) {
          nextExpanded.add(item.titleKey);
          const childKey = child.url || child.titleKey || child.title;
          nextExpanded.add(childKey);
          break;
        }
      }
    }

    setExpandedItems((prev) => {
      const prevSet = new Set(prev);
      let changed = prevSet.size !== nextExpanded.size;
      if (!changed) {
        for (const key of prevSet) {
          if (!nextExpanded.has(key)) {
            changed = true;
            break;
          }
        }
      }
      return changed ? Array.from(nextExpanded) : prev;
    });
  }, [currentPath, filteredItems, collapsed]);

  // Track recent items on navigation - tracking sub-menu items (children) only
  // Only update if a different menu item is clicked (not the same one)
  useEffect(() => {
    // Find the sub-menu item that matches the current path
    let foundChild: NavigationChild | null = null;
    let parentTitleKey: string | undefined = undefined;

    for (const item of filteredItems) {
      if (item.children) {
        // Check direct children
        const child = item.children.find(c => c.url === location.pathname);
        if (child) {
          foundChild = child;
          parentTitleKey = item.titleKey;
          break;
        }

        // Check nested children (grandchildren)
        for (const directChild of item.children) {
          if (directChild.children) {
            const grandchild = directChild.children.find(gc => gc.url === location.pathname);
            if (grandchild) {
              foundChild = grandchild;
              parentTitleKey = item.titleKey;
              break;
            }
          }
        }
      }
    }

    if (foundChild && foundChild.titleKey) {
      const childTitleKey = foundChild.titleKey;
      const currentMenuItem = { titleKey: childTitleKey, parentTitleKey };

      // Only update if this is a different menu item than the last clicked one
      const isSameItem = lastClickedMenuItem &&
        lastClickedMenuItem.titleKey === currentMenuItem.titleKey &&
        lastClickedMenuItem.parentTitleKey === currentMenuItem.parentTitleKey;

      if (!isSameItem) {
        setLastClickedMenuItem(currentMenuItem);
        setRecentItems(prev => {
          const updated = [
            { titleKey: childTitleKey, url: location.pathname, timestamp: Date.now(), parentTitleKey },
            ...prev.filter(item => !(item.titleKey === childTitleKey && item.parentTitleKey === parentTitleKey))
          ].slice(0, 5); // Keep only 5 most recent
          localStorage.setItem('sidebar-recent-items', JSON.stringify(updated));
          return updated;
        });
      }
    }
  }, [location.pathname, filteredItems, lastClickedMenuItem]);

  // Don't show loading state - always render with available data
  // The sidebar will update when permissions are available, but won't disappear

  const isActive = useCallback((path: string) => currentPath === path, [currentPath]);
  const isChildActive = useCallback((children?: Array<{ url?: string; children?: NavigationChild[] }>) => {
    if (!children) return false;
    const checkChildren = (items: Array<{ url?: string; children?: NavigationChild[] }>): boolean => {
      return items.some(child => {
        // Check if current path matches this child's URL
        if (child.url && currentPath.startsWith(child.url)) return true;
        // Recursively check nested children
        if (child.children && checkChildren(child.children)) return true;
        return false;
      });
    };
    return checkChildren(children);
  }, [currentPath]);

  const getNavCls = useCallback(({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50", []);

  const toggleExpanded = useCallback((title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  }, []);

  // Handle website menu click - open secondary sidebar instead of inline expansion
  const handleWebsiteMenuClick = useCallback((item: NavigationItem, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (item.titleKey === 'websiteManager') {
      // Don't open secondary sidebar if main sidebar is collapsed
      if (collapsed) {
        if (import.meta.env.DEV) {
          console.log('[SmartSidebar] Cannot open secondary sidebar when main sidebar is collapsed');
        }
        return;
      }
      // Open secondary sidebar (don't toggle - keep it persistent)
      // Only open if not already open for this item
      if (!secondarySidebarOpen || secondarySidebarItem?.titleKey !== 'websiteManager') {
        if (import.meta.env.DEV) {
          console.log('[SmartSidebar] Opening secondary sidebar for websiteManager', item);
        }
        // Collapse main sidebar when opening secondary sidebar
        setOpen(false);
        setSecondarySidebarItem(item);
        setSecondarySidebarOpen(true);
      }
      // If already open, do nothing - keep it persistent
    } else {
      // Normal toggle for other menus
      toggleExpanded(item.titleKey);
    }
  }, [secondarySidebarOpen, secondarySidebarItem, toggleExpanded, collapsed]);

  // Get data-tour attribute for menu items
  const getDataTourAttr = (titleKey: string): string | undefined => {
    const tourMap: Record<string, string> = {
      'dashboard': 'sidebar-dashboard',
      'students': 'sidebar-students',
      'studentManagement': 'sidebar-students',
      'staffManagement': 'sidebar-staff',
      'staff': 'sidebar-staff',
      'attendance': 'sidebar-attendance',
      'exams': 'sidebar-exams',
      'examManagement': 'sidebar-exams',
      'finance': 'sidebar-finance',
      'academic': 'sidebar-academic',
      'academicManagement': 'sidebar-academic',
      'academicSettings': 'sidebar-academicSettings',
      'schoolsManagement': 'sidebar-schools-management',
      'settings': 'sidebar-settings',
      'helpCenter': 'sidebar-help',
    };
    return tourMap[titleKey];
  };


  const renderMenuItem = (item: NavigationItem) => {
    const label = tUnsafe(`nav.${item.titleKey}`);
    const iconColorClass = item.iconColor || categoryColors.default;
    const dataTour = getDataTourAttr(item.titleKey);

    // Always show parent items even if they have no children (they might have children that load later)
    if (item.children) {
      const isExpanded = expandedItems.includes(item.titleKey) || isChildActive(item.children);

      // For website menu, create button with click handler
      const menuButton = item.titleKey === 'websiteManager' ? (
        <SidebarMenuButton
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleWebsiteMenuClick(item, e);
          }}
          className={cn(
            "transition-all duration-200",
            "hover:bg-sidebar-accent/50",
            getNavCls({ isActive: (secondarySidebarOpen && secondarySidebarItem?.titleKey === 'websiteManager') || isChildActive(item.children) })
          )}
        >
          <item.icon className={`h-4 w-4 ${iconColorClass}`} />
          {!collapsed && (
            <>
              <span className="flex-1">{label}</span>
              {item.badge && (
                <Badge variant={item.badge.variant} className="text-xs mr-2">
                  {item.badge.text}
                </Badge>
              )}
              {(secondarySidebarOpen && secondarySidebarItem?.titleKey === 'websiteManager') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </>
          )}
        </SidebarMenuButton>
      ) : (
        <SidebarMenuButton
          className={cn(
            "transition-all duration-200",
            "hover:bg-sidebar-accent/50",
            getNavCls({ isActive: isChildActive(item.children) })
          )}
        >
          <item.icon className={`h-4 w-4 ${iconColorClass}`} />
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
      );

      const renderFlyoutChildren = (children: NavigationChild[]): ReactNode[] => {
        return children.map((child) => {
          const childLabel = child.titleKey ? tUnsafe(`nav.${child.titleKey}`) : child.title;
          const hasNested = Array.isArray(child.children) && child.children.length > 0;

          if (hasNested) {
            return (
              <DropdownMenuSub key={child.url || child.titleKey || child.title}>
                <DropdownMenuSubTrigger className={cn("gap-2", isRTL && "text-right")}>
                  <child.icon className="h-4 w-4" />
                  <span className="flex-1 truncate">{childLabel}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  side={isRTL ? "left" : "right"}
                  align="start"
                  sideOffset={8}
                  dir={isRTL ? "rtl" : "ltr"}
                  className={cn("min-w-56", isRTL && "text-right")}
                >
                  {renderFlyoutChildren(child.children!)}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            );
          }

          return (
            <DropdownMenuItem asChild key={child.url || child.titleKey || child.title} className="gap-2">
              <NavLink
                to={child.url || "/"}
                className={cn(
                  "flex w-full items-center gap-2",
                  isRTL && "justify-end text-right"
                )}
              >
                <child.icon className="h-4 w-4" />
                <span className="flex-1 truncate">{childLabel}</span>
              </NavLink>
            </DropdownMenuItem>
          );
        });
      };

      // Collapsed: show a standard flyout menu (submenu list) instead of only a tooltip label.
      // For website menu when collapsed, just show the dropdown (secondary sidebar won't work when collapsed)
      if (collapsed) {
        // Create a regular menuButton for collapsed state (without onClick handler for website menu)
        const collapsedMenuButton = item.titleKey === 'websiteManager' ? (
          <SidebarMenuButton
            className={cn(
              "transition-all duration-200",
              "hover:bg-sidebar-accent/50",
              getNavCls({ isActive: isChildActive(item.children) })
            )}
          >
            <item.icon className={`h-4 w-4 ${iconColorClass}`} />
          </SidebarMenuButton>
        ) : menuButton;

        return (
          <DropdownMenu
            key={item.titleKey}
            open={openFlyoutKey === item.titleKey}
            onOpenChange={(open) => setOpenFlyoutKey(open ? item.titleKey : null)}
          >
            <SidebarMenuItem data-tour={dataTour}>
              <DropdownMenuTrigger asChild>
                <div
                  onMouseEnter={() => {
                    if (flyoutCloseTimerRef.current) {
                      window.clearTimeout(flyoutCloseTimerRef.current);
                      flyoutCloseTimerRef.current = null;
                    }
                    setOpenFlyoutKey(item.titleKey);
                  }}
                  onMouseLeave={() => {
                    if (flyoutCloseTimerRef.current) {
                      window.clearTimeout(flyoutCloseTimerRef.current);
                    }
                    flyoutCloseTimerRef.current = window.setTimeout(() => {
                      setOpenFlyoutKey((current) => (current === item.titleKey ? null : current));
                    }, 120);
                  }}
                >
                  {collapsedMenuButton}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isRTL ? "left" : "right"}
                align="start"
                sideOffset={8}
                collisionPadding={12}
                dir={isRTL ? "rtl" : "ltr"}
                className={cn("min-w-64", isRTL && "text-right")}
                onMouseEnter={() => {
                  if (flyoutCloseTimerRef.current) {
                    window.clearTimeout(flyoutCloseTimerRef.current);
                    flyoutCloseTimerRef.current = null;
                  }
                  setOpenFlyoutKey(item.titleKey);
                }}
                onMouseLeave={() => {
                  if (flyoutCloseTimerRef.current) {
                    window.clearTimeout(flyoutCloseTimerRef.current);
                  }
                  flyoutCloseTimerRef.current = window.setTimeout(() => {
                    setOpenFlyoutKey((current) => (current === item.titleKey ? null : current));
                  }, 120);
                }}
              >
                <DropdownMenuLabel className={cn("flex items-center justify-between gap-2", isRTL && "text-right")}>
                  <span className="flex-1 truncate">{label}</span>
                  {item.badge && (
                    <Badge variant={item.badge.variant}>
                      {item.badge.text}
                    </Badge>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {renderFlyoutChildren(item.children)}
              </DropdownMenuContent>
            </SidebarMenuItem>
          </DropdownMenu>
        );
      }

      // For website menu, use secondary sidebar instead of inline expansion
      if (item.titleKey === 'websiteManager') {
        const isWebsiteMenuActive = secondarySidebarOpen && secondarySidebarItem?.titleKey === 'websiteManager';
        return (
          <SidebarMenuItem key={item.titleKey} data-tour={dataTour}>
            <SidebarMenuButton
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (import.meta.env.DEV) {
                  console.log('[SmartSidebar] Website menu button clicked', { item, collapsed, secondarySidebarOpen });
                }
                handleWebsiteMenuClick(item, e);
              }}
              className={cn(
                "transition-all duration-200 cursor-pointer",
                "hover:bg-sidebar-accent/50",
                getNavCls({ isActive: isWebsiteMenuActive || isChildActive(item.children) })
              )}
            >
              <item.icon className={`h-4 w-4 ${iconColorClass}`} />
              {!collapsed && (
                <>
                  <span className="flex-1">{label}</span>
                  {item.badge && (
                    <Badge variant={item.badge.variant} className="text-xs mr-2">
                      {item.badge.text}
                    </Badge>
                  )}
                  {isWebsiteMenuActive ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      }

      return (
        <Collapsible key={item.titleKey} open={isExpanded} onOpenChange={() => toggleExpanded(item.titleKey)}>
          <SidebarMenuItem data-tour={dataTour}>
            <CollapsibleTrigger asChild>
              {menuButton}
            </CollapsibleTrigger>
            {!collapsed && (
              <CollapsibleContent>
                <SidebarMenu className={`${isRTL ? 'mr-4 border-r' : 'ml-4 border-l'} border-sidebar-border`}>
                  {item.children.map((child: NavigationChild) => {
                    // If child has nested children, render as collapsible submenu
                    if (child.children && child.children.length > 0) {
                      const childKey = child.url || child.titleKey || child.title;
                      const isChildExpanded = expandedItems.includes(childKey) || isChildActive(child.children);
                      const childIsPinned = child.titleKey ? isItemPinned(child.titleKey, item.titleKey) : false;
                      const isChildActiveNow = child.url ? isActive(child.url) : isChildActive(child.children);
                      return (
                        <Collapsible key={childKey} open={isChildExpanded} onOpenChange={() => toggleExpanded(childKey)}>
                          <SidebarMenuItem>
                            <div className="group relative">
                              {child.url ? (
                                // If child has URL, wrap in NavLink
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuButton asChild>
                                    <NavLink
                                      to={child.url}
                                      className={cn(
                                        "transition-all duration-200",
                                        getNavCls({ isActive: isChildActiveNow })
                                      )}
                                      end={child.url === '/'}
                                    >
                                      <child.icon className="h-4 w-4" />
                                      <span className="flex-1">{child.titleKey ? tUnsafe(`nav.${child.titleKey}`) : child.title}</span>
                                      {/* Small star indicator for pinned items */}
                                      {childIsPinned && (
                                        <Star className={cn(
                                          "h-3 w-3 text-yellow-500 fill-yellow-500 opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none",
                                          isRTL ? "mr-1" : "ml-1"
                                        )} />
                                      )}
                                      {isChildExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </NavLink>
                                  </SidebarMenuButton>
                                </CollapsibleTrigger>
                              ) : (
                                // If child has no URL, just collapsible trigger
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuButton className={getNavCls({ isActive: isChildActiveNow })}>
                                    <child.icon className="h-4 w-4" />
                                    <span className="flex-1">{child.titleKey ? tUnsafe(`nav.${child.titleKey}`) : child.title}</span>
                                    {isChildExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </SidebarMenuButton>
                                </CollapsibleTrigger>
                              )}
                              {/* Pin button - only visible on hover, only if child has URL and titleKey */}
                              {child.titleKey && child.url && (
                                <div
                                  role="button"
                                  tabIndex={0}
                                  className={cn(
                                    "absolute top-1/2 -translate-y-1/2 h-5 w-5 p-0 rounded flex items-center justify-center cursor-pointer transition-all opacity-0 group-hover:opacity-100",
                                    "hover:bg-sidebar-accent/80 z-10",
                                    isRTL ? "left-1" : "right-10"
                                  )}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    togglePin(child.titleKey!, item.titleKey);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      togglePin(child.titleKey!, item.titleKey);
                                    }
                                  }}
                                  aria-label={childIsPinned ? t('nav.unpinItem') : t('nav.pinItem')}
                                >
                                  {childIsPinned ? (
                                    <Pin className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                  ) : (
                                    <PinOff className="h-3 w-3 opacity-70" />
                                  )}
                                </div>
                              )}
                              {/* Small star indicator for pinned items (when no URL, show star indicator) */}
                              {childIsPinned && !child.url && (
                                <Star className={cn(
                                  "absolute top-1/2 -translate-y-1/2 h-3 w-3 text-yellow-500 fill-yellow-500 opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none",
                                  isRTL ? "left-1" : "right-10"
                                )} />
                              )}
                            </div>
                            <CollapsibleContent>
                              <SidebarMenu className={`${isRTL ? 'mr-4 border-r' : 'ml-4 border-l'} border-sidebar-border`}>
                                {child.children.map((grandchild: NavigationChild) => {
                                  const grandchildIsPinned = grandchild.titleKey ? isItemPinned(grandchild.titleKey, item.titleKey) : false;
                                  const isGrandchildActiveNow = isActive(grandchild.url || '#');
                                  return (
                                    <SidebarMenuItem
                                      key={grandchild.titleKey || grandchild.url || grandchild.title}
                                      data-sidebar-menu-item
                                      data-active={isGrandchildActiveNow}
                                    >
                                      <div className="group relative">
                                        <SidebarMenuButton asChild>
                                          <NavLink
                                            to={grandchild.url || '#'}
                                            className={cn(
                                              "transition-all duration-200",
                                              getNavCls({ isActive: isGrandchildActiveNow })
                                            )}
                                            end={(grandchild.url || '#') === '/'}
                                          >
                                            <grandchild.icon className="h-4 w-4" />
                                            <span className="flex-1">{grandchild.titleKey ? tUnsafe(`nav.${grandchild.titleKey}`) : grandchild.title}</span>
                                            {/* Small star indicator for pinned items */}
                                            {grandchildIsPinned && (
                                              <Star className={cn(
                                                "h-3 w-3 text-yellow-500 fill-yellow-500 opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none",
                                                isRTL ? "mr-1" : "ml-1"
                                              )} />
                                            )}
                                          </NavLink>
                                        </SidebarMenuButton>
                                        {/* Pin button - only visible on hover */}
                                        {grandchild.titleKey && (
                                          <div
                                            role="button"
                                            tabIndex={0}
                                            className={cn(
                                              "absolute top-1/2 -translate-y-1/2 h-5 w-5 p-0 rounded flex items-center justify-center cursor-pointer transition-all opacity-0 group-hover:opacity-100",
                                              "hover:bg-sidebar-accent/80 z-10",
                                              isRTL ? "left-1" : "right-1"
                                            )}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              togglePin(grandchild.titleKey!, item.titleKey);
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                togglePin(grandchild.titleKey!, item.titleKey);
                                              }
                                            }}
                                            aria-label={grandchildIsPinned ? t('nav.unpinItem') : t('nav.pinItem')}
                                          >
                                            {grandchildIsPinned ? (
                                              <Pin className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                            ) : (
                                              <PinOff className="h-3 w-3 opacity-70" />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </SidebarMenuItem>
                                  );
                                })}
                              </SidebarMenu>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      );
                    }
                    // Regular child item with URL - NOW WITH PIN FUNCTIONALITY
                    // Use titleKey as primary key to avoid duplicate keys when multiple items share the same URL
                    const childDataTour = child.titleKey ? getDataTourAttr(child.titleKey) : undefined;
                    const childIsPinned = child.titleKey ? isItemPinned(child.titleKey, item.titleKey) : false;
                    const isChildActiveNow = isActive(child.url || '#');
                    return (
                      <SidebarMenuItem
                        key={child.titleKey || child.url || child.title}
                        data-tour={childDataTour}
                        data-sidebar-menu-item
                        data-active={isChildActiveNow}
                      >
                        <div className="group relative">
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={child.url || '#'}
                              className={cn(
                                "transition-all duration-200",
                                getNavCls({ isActive: isChildActiveNow })
                              )}
                              end={(child.url || '#') === '/'}
                            >
                              <child.icon className="h-4 w-4" />
                              <span className="flex-1">{child.titleKey ? tUnsafe(`nav.${child.titleKey}`) : child.title}</span>
                              {child.contextual && navigationContext.currentModule.includes('attendance') && (
                                <Star className="h-3 w-3 text-warning" />
                              )}
                              {/* Small star indicator for pinned items */}
                              {childIsPinned && (
                                <Star className={cn(
                                  "h-3 w-3 text-yellow-500 fill-yellow-500 opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none",
                                  isRTL ? "mr-1" : "ml-1"
                                )} />
                              )}
                            </NavLink>
                          </SidebarMenuButton>
                          {/* Pin button - only visible on hover */}
                          {child.titleKey && (
                            <div
                              role="button"
                              tabIndex={0}
                              className={cn(
                                "absolute top-1/2 -translate-y-1/2 h-5 w-5 p-0 rounded flex items-center justify-center cursor-pointer transition-all opacity-0 group-hover:opacity-100",
                                "hover:bg-sidebar-accent/80 z-10",
                                isRTL ? "left-1" : "right-1"
                              )}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                togglePin(child.titleKey!, item.titleKey);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  togglePin(child.titleKey!, item.titleKey);
                                }
                              }}
                              aria-label={childIsPinned ? t('nav.unpinItem') : t('nav.pinItem')}
                            >
                              {childIsPinned ? (
                                <Pin className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                              ) : (
                                <PinOff className="h-3 w-3 opacity-70" />
                              )}
                            </div>
                          )}
                        </div>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </CollapsibleContent>
            )}
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    const isItemActiveNow = isActive(item.url || '/');
    return (
      <SidebarMenuItem
        key={item.url}
        data-tour={dataTour}
        data-sidebar-menu-item
        data-active={isItemActiveNow}
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url || '/'}
                  className={getNavCls({ isActive: isItemActiveNow })}
                >
                  <item.icon className={`h-4 w-4 ${iconColorClass}`} />
                </NavLink>
              </SidebarMenuButton>
            </TooltipTrigger>
            <TooltipContent
              side={isRTL ? "left" : "right"}
              align="center"
              sideOffset={8}
              className="whitespace-nowrap"
            >
              <p className="flex items-center gap-2">
                <span>{label}</span>
                {item.badge && (
                  <Badge variant={item.badge.variant}>
                    {item.badge.text}
                  </Badge>
                )}
              </p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <SidebarMenuButton
            asChild
          >
            <NavLink
              to={item.url || '/'}
              className={cn(
                "transition-all duration-200",
                "hover:bg-sidebar-accent/50",
                getNavCls({ isActive: isItemActiveNow })
              )}
            >
              <item.icon className={`h-4 w-4 ${iconColorClass}`} />
              <span className="flex-1">{label}</span>
              {item.badge && (
                <Badge variant={item.badge.variant} className="text-xs mr-2">
                  {item.badge.text}
                </Badge>
              )}
            </NavLink>
          </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    );
  };

  // Don't show loading state - render immediately with available data
  // The sidebar will update when role is available

  return (
    <>
      <Sidebar
        className={`${collapsed ? "w-14" : "w-72"} transition-all duration-300`}
        collapsible="icon"
        side={isRTL ? "right" : "left"}
        dir={isRTL ? 'rtl' : 'ltr'}
        data-tour="sidebar"
      >
        {/* Logo Section */}
        <div className={cn("border-b border-sidebar-border", collapsed ? "p-2" : "p-4")}>
          <div className="flex items-center justify-center">
            <img
              src="/nazim_logo.webp"
              alt="Nazim Logo"
              className={cn(
                "rounded-lg object-contain ring-2 ring-sidebar-border bg-sidebar-primary/10 p-1.5 flex-shrink-0",
                collapsed ? "w-10 h-10" : "w-12 h-12"
              )}
              loading="lazy"
            />
            {!collapsed && (
              <div className="flex-1 min-w-0 ml-3">
                <h1
                  className="text-lg font-bold text-sidebar-foreground"
                  style={{ fontFamily: "'Bahij Nassim', 'Noto Sans Arabic', 'Amiri', serif" }}
                >
                  {tUnsafe('common.schoolManagement') || 'ناظم – د دیني مدارسو د اداري چارو د مدیریت سیستم'}
                </h1>
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
          </div>
        )}

        <TooltipProvider delayDuration={300}>
          <SidebarContent className="custom-scrollbar overflow-x-hidden overflow-y-auto" data-sidebar-content>
            {/* Search Bar */}
            {!collapsed && (
              <div className="p-2 border-b border-sidebar-border">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/50" />
                  <Input
                    type="text"
                    placeholder={t('nav.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-sidebar-search
                    className="pl-8 h-8 text-sm bg-sidebar-accent/30 border-sidebar-border focus:bg-sidebar-accent/50"
                    aria-label={t('nav.searchPlaceholder')}
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setSearchQuery('')}
                      aria-label={t('nav.clearSearch')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {searchQuery && (
                  <p className="text-xs text-sidebar-foreground/50 mt-1 px-2">
                    {t('nav.keyboardShortcut', { key: navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K' })}
                  </p>
                )}
              </div>
            )}

            {/* Pinned Items Section - Separate and Better Design with Collapse/Expand */}
            {!collapsed && pinnedItemsList.length > 0 && !searchQuery && (
              <SidebarGroup className="bg-yellow-500/10 border-y border-yellow-500/20">
                <Collapsible open={isPinnedSectionExpanded} onOpenChange={setIsPinnedSectionExpanded}>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-yellow-600 dark:text-yellow-400 cursor-pointer hover:bg-yellow-500/10 rounded transition-colors">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span>{t('nav.favorites')}</span>
                      <span className="ml-auto text-yellow-600/70 dark:text-yellow-400/70 text-xs font-normal">
                        ({Math.min(pinnedItemsList.length, 10)})
                      </span>
                      {isPinnedSectionExpanded ? (
                        <ChevronDown className="h-4 w-4 ml-1" />
                      ) : (
                        <ChevronRight className="h-4 w-4 ml-1" />
                      )}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent className="px-2 pb-2">
                      <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                        {pinnedItemsList.slice(0, 10).map(item => {
                          const label = tUnsafe(`nav.${item.titleKey}`);
                          const pinKey = item.parentTitleKey ? `${item.parentTitleKey}:${item.titleKey}` : item.titleKey;
                          const isPinnedItemActive = isActive(item.url);
                          return (
                            <NavLink
                              key={pinKey}
                              to={item.url}
                              data-sidebar-menu-item
                              data-active={isPinnedItemActive}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                                "bg-yellow-500/5 hover:bg-yellow-500/15 border border-yellow-500/20 hover:border-yellow-500/30",
                                "transition-all group relative",
                                isPinnedItemActive && "bg-yellow-500/20 border-yellow-500/40 shadow-sm"
                              )}
                            >
                              <item.icon className="h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                              <span className="flex-1 truncate font-medium text-sm">{label}</span>
                              {item.parentLabel && (
                                <span className="text-xs text-sidebar-foreground/50 truncate max-w-[80px]">
                                  {item.parentLabel}
                                </span>
                              )}
                              <div
                                role="button"
                                tabIndex={0}
                                className="h-5 w-5 p-0 hover:bg-yellow-500/20 rounded flex items-center justify-center cursor-pointer flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  togglePin(item.titleKey, item.parentTitleKey);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    togglePin(item.titleKey, item.parentTitleKey);
                                  }
                                }}
                                aria-label={t('nav.unpinItem')}
                              >
                                <X className="h-4 w-4 opacity-60 hover:opacity-100 text-yellow-600 dark:text-yellow-400" />
                              </div>
                            </NavLink>
                          );
                        })}
                      </div>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            )}

            {/* Recent Items Section - Separate and Better Design with Collapse/Expand */}
            {!collapsed && recentItems.length > 0 && !searchQuery && (
              <SidebarGroup className="bg-blue-500/10 border-y border-blue-500/20">
                <Collapsible open={isRecentSectionExpanded} onOpenChange={setIsRecentSectionExpanded}>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-blue-500/10 rounded transition-colors">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span>{t('nav.recent')}</span>
                      <span className="ml-auto text-blue-600/70 dark:text-blue-400/70 text-xs font-normal">
                        ({Math.min(recentItems.length, 5)})
                      </span>
                      {isRecentSectionExpanded ? (
                        <ChevronDown className="h-4 w-4 ml-1" />
                      ) : (
                        <ChevronRight className="h-4 w-4 ml-1" />
                      )}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent className="px-2 pb-2">
                      <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                        {recentItems.slice(0, 5).map((recentItem) => {
                          const subMenuItem = allSubMenuItems.find(i =>
                            i.titleKey === recentItem.titleKey &&
                            i.parentTitleKey === recentItem.parentTitleKey
                          );
                          if (!subMenuItem) return null;
                          const label = tUnsafe(`nav.${recentItem.titleKey}`);
                          const isRecentItemActive = isActive(recentItem.url);
                          return (
                            <NavLink
                              key={`${recentItem.titleKey}-${recentItem.parentTitleKey || 'none'}`}
                              to={recentItem.url}
                              data-sidebar-menu-item
                              data-active={isRecentItemActive}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                                "bg-blue-500/5 hover:bg-blue-500/15 border border-blue-500/20 hover:border-blue-500/30",
                                "transition-all",
                                isRecentItemActive && "bg-blue-500/20 border-blue-500/40 shadow-sm"
                              )}
                            >
                              <subMenuItem.icon className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                              <span className="flex-1 truncate font-medium text-sm">{label}</span>
                              {recentItem.parentTitleKey && (
                                <span className="text-xs text-sidebar-foreground/50 truncate max-w-[80px]">
                                  {tUnsafe(`nav.${recentItem.parentTitleKey}`)}
                                </span>
                              )}
                            </NavLink>
                          );
                        })}
                      </div>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            )}

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

            {/* No Results Message */}
            {debouncedSearchQuery && filteredBySearch.length === 0 && (
              <div className="p-4 text-center">
                <p className="text-sm text-sidebar-foreground/50">{t('nav.noResults')}</p>
              </div>
            )}

            {/* Main Navigation - Grouped by Category */}
            {/* Core Section */}
            {groupedItems.core.length > 0 && (
              <SidebarGroup className="mb-2">
                <Collapsible open={expandedCategories.has('core')} onOpenChange={() => toggleCategory('core')}>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-2 px-2 cursor-pointer hover:text-sidebar-foreground/80 transition-colors flex items-center gap-2 !opacity-100 !mt-0">
                      {expandedCategories.has('core') ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      {collapsed ? (
                        <span className="text-[13px] leading-tight px-1 whitespace-nowrap font-medium">{t('nav.sections.core')}</span>
                      ) : (
                        <span>{t('nav.sections.core')}</span>
                      )}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu className="space-y-1">
                        {groupedItems.core.map(item => renderMenuItem(item))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            )}

            {/* Operations Section */}
            {groupedItems.operations.length > 0 && (
              <SidebarGroup data-tour="sidebar-operations" className="mb-2">
                <Collapsible open={expandedCategories.has('operations')} onOpenChange={() => toggleCategory('operations')}>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-2 px-2 cursor-pointer hover:text-sidebar-foreground/80 transition-colors flex items-center gap-2 !opacity-100 !mt-0">
                      {expandedCategories.has('operations') ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      {collapsed ? (
                        <span className="text-[13px] leading-tight px-1 whitespace-nowrap font-medium">{t('nav.sections.operations')}</span>
                      ) : (
                        <span>{t('nav.sections.operations')}</span>
                      )}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu className="space-y-1">
                        {groupedItems.operations.map(item => renderMenuItem(item))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            )}

            {/* Academic Section */}
            {groupedItems.academic.length > 0 && (
              <SidebarGroup data-tour="sidebar-academic-section" className="mb-2">
                <Collapsible open={expandedCategories.has('academic')} onOpenChange={() => toggleCategory('academic')}>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-2 px-2 cursor-pointer hover:text-sidebar-foreground/80 transition-colors flex items-center gap-2 !opacity-100 !mt-0">
                      {expandedCategories.has('academic') ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      {collapsed ? (
                        <span className="text-[13px] leading-tight px-1 whitespace-nowrap font-medium">{t('nav.sections.academic')}</span>
                      ) : (
                        <span>{t('nav.sections.academic')}</span>
                      )}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu className="space-y-1">
                        {groupedItems.academic.map(item => renderMenuItem(item))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            )}

            {/* Finance Section */}
            {groupedItems.finance.length > 0 && (
              <SidebarGroup data-tour="sidebar-finance-section" className="mb-2">
                <Collapsible open={expandedCategories.has('finance')} onOpenChange={() => toggleCategory('finance')}>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-2 px-2 cursor-pointer hover:text-sidebar-foreground/80 transition-colors flex items-center gap-2 !opacity-100 !mt-0">
                      {expandedCategories.has('finance') ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      {collapsed ? (
                        <span className="text-[13px] leading-tight px-1 whitespace-nowrap font-medium">{t('nav.sections.finance')}</span>
                      ) : (
                        <span>{t('nav.sections.finance')}</span>
                      )}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu className="space-y-1">
                        {groupedItems.finance.map(item => renderMenuItem(item))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            )}

            {/* Admin Section */}
            {groupedItems.admin.length > 0 && (
              <SidebarGroup data-tour="sidebar-admin-section" className="mb-2">
                <Collapsible open={expandedCategories.has('admin')} onOpenChange={() => toggleCategory('admin')}>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-2 px-2 cursor-pointer hover:text-sidebar-foreground/80 transition-colors flex items-center gap-2 !opacity-100 !mt-0">
                      {expandedCategories.has('admin') ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      {collapsed ? (
                        <span className="text-[13px] leading-tight px-1 whitespace-nowrap font-medium">{t('nav.sections.admin')}</span>
                      ) : (
                        <span>{t('nav.sections.admin')}</span>
                      )}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu className="space-y-1">
                        {groupedItems.admin.map(item => renderMenuItem(item))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            )}
          </SidebarContent>
        </TooltipProvider>

      </Sidebar>
      <SecondarySidebar
        open={secondarySidebarOpen}
        onClose={() => {
          setSecondarySidebarOpen(false);
          setSecondarySidebarItem(null);
          // Expand main sidebar when secondary sidebar is closed
          setOpen(true);
        }}
        onItemClick={() => {
          // Keep main sidebar collapsed when item is clicked - don't expand it
          // Secondary sidebar stays open and main sidebar stays collapsed
        }}
        item={secondarySidebarItem}
        isRTL={isRTL}
        collapsed={collapsed}
      />
    </>
  );
});
