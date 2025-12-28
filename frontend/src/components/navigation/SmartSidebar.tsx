import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { type LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfiles";
import { useCurrentOrganization } from "@/hooks/useOrganizations";
import { useHasPermission, useUserPermissions } from "@/hooks/usePermissions";
import type { UserRole } from "@/types/auth";
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
  User,
  Package,
  NotebookPen,
  UserPlus,
  BarChart3,
  Hash,
  KeyRound,
  Printer,
  Tag
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
  url?: string; // URL for navigation (optional if it has children)
  icon: LucideIcon;
  contextual?: boolean;
  children?: NavigationChild[]; // Support nested children for submenus
}

interface NavigationItem {
  titleKey: string;
  url?: string;
  icon: LucideIcon;
  badge?: { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } | null;
  roles?: UserRole[]; // Optional - deprecated, using permission-based filtering instead
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
  // Use profile role directly from useAuth (most reliable) instead of useUserRole
  const roleFromAuth = profile?.role || currentProfile?.role || null;
  const { role: roleFromHook } = useUserRole();
  // Prefer role from auth/profile over hook (hook might have dev mode fallback)
  const role = roleFromAuth || roleFromHook;
  const { data: currentOrg } = useCurrentOrganization();
  const { data: permissions, isLoading: permissionsLoading } = useUserPermissions();
  const hasSettingsPermission = useHasPermission('settings.read');
  const hasBuildingsPermission = useHasPermission('buildings.read');
  const hasRoomsPermission = useHasPermission('rooms.read');
  const hasHostelPermission = useHasPermission('hostel.read');
  const hasOrganizationsPermission = useHasPermission('organizations.read');
  const hasProfilesPermission = useHasPermission('profiles.read');
  const hasUsersPermission = useHasPermission('users.read');
  const hasAuthMonitoringPermission = useHasPermission('auth_monitoring.read');
  const hasSecurityMonitoringPermission = useHasPermission('security_monitoring.read');
  const hasBrandingPermission = useHasPermission('school_branding.read');
  const hasReportsPermission = useHasPermission('reports.read');
  const hasResidencyTypesPermission = useHasPermission('residency_types.read');
  const hasAcademicYearsPermission = useHasPermission('academic_years.read');
  const hasExamTypesPermission = useHasPermission('exam_types.read');
  const hasClassesPermission = useHasPermission('classes.read');
  const hasSubjectsPermission = useHasPermission('subjects.read');
  const hasAssetsPermission = useHasPermission('assets.read');
  const hasStaffPermission = useHasPermission('staff.read');
  const hasStaffReportsPermission = useHasPermission('staff_reports.read');
  const hasAttendanceSessionsPermission = useHasPermission('attendance_sessions.read');
  const hasAttendanceReportsPermission = useHasPermission('attendance_sessions.report');
  const hasLeaveRequestsPermission = useHasPermission('leave_requests.read');
  const hasStudentsPermission = useHasPermission('students.read');
  const hasStudentAdmissionsPermission = useHasPermission('student_admissions.read');
  const hasStudentReportsPermission = useHasPermission('student_reports.read');
  const hasStudentAdmissionsReportPermission = useHasPermission('student_admissions.report');
  const hasShortTermCoursesPermission = useHasPermission('short_term_courses.read');
  const hasCourseStudentsPermission = useHasPermission('course_students.read');
  const hasCourseReportsPermission = useHasPermission('course_students.report');
  const hasCourseAttendancePermission = useHasPermission('course_attendance.read');
  const hasCertificateTemplatesPermission = useHasPermission('certificate_templates.read');
  const hasGraduationBatchesPermission = useHasPermission('graduation_batches.read');
  const hasIssuedCertificatesPermission = useHasPermission('issued_certificates.read');
  const hasIdCardsPermission = useHasPermission('id_cards.read');
  const hasIdCardsExportPermission = useHasPermission('id_cards.export');
  const hasCourseDocumentsPermission = useHasPermission('course_documents.read');
  const hasExamDocumentsPermission = useHasPermission('exam_documents.read');
  const hasStaffTypesPermission = useHasPermission('staff_types.read');
  const hasScheduleSlotsPermission = useHasPermission('schedule_slots.read');
  const hasTeacherSubjectAssignmentsPermission = useHasPermission('teacher_subject_assignments.read');
  const hasTimetablesPermission = useHasPermission('timetables.read');
  const hasExamsPermission = useHasPermission('exams.read');
  const hasExamsManagePermission = useHasPermission('exams.manage');
  const hasExamsTimetablePermission = useHasPermission('exams.manage_timetable');
  const hasExamsEnrollPermission = useHasPermission('exams.enroll_students');
  const hasExamsMarksPermission = useHasPermission('exams.enter_marks');
  const hasExamsReportsPermission = useHasPermission('exams.view_reports');
  const hasExamsViewGradeCardsPermission = useHasPermission('exams.view_grade_cards');
  const hasExamsViewConsolidatedReportsPermission = useHasPermission('exams.view_consolidated_reports');
  const hasExamsViewClassReportsPermission = useHasPermission('exams.view_class_reports');
  const hasExamsViewStudentReportsPermission = useHasPermission('exams.view_student_reports');
  const hasExamsAttendancePermission = useHasPermission('exams.manage_attendance');
  const hasExamsViewAttendancePermission = useHasPermission('exams.view_attendance_reports');
  const hasExamsRollNumbersReadPermission = useHasPermission('exams.roll_numbers.read');
  const hasExamsRollNumbersAssignPermission = useHasPermission('exams.roll_numbers.assign');
  const hasExamsSecretNumbersReadPermission = useHasPermission('exams.secret_numbers.read');
  const hasExamsSecretNumbersAssignPermission = useHasPermission('exams.secret_numbers.assign');
  const hasExamsNumbersPrintPermission = useHasPermission('exams.numbers.print');
  const hasExamsQuestionsPermission = useHasPermission('exams.questions.read');
  const hasExamsPapersPermission = useHasPermission('exams.papers.read');
  // Legacy compatibility
  const hasExamsAssignPermission = hasExamsManagePermission || hasExamsEnrollPermission;
  const hasExamsUpdatePermission = hasExamsMarksPermission;
  const hasGradesPermission = useHasPermission('grades.read');
  const hasLibraryBooksPermission = useHasPermission('library_books.read');
  const hasLibraryCategoriesPermission = useHasPermission('library_categories.read');
  const hasLibraryLoansPermission = useHasPermission('library_loans.read');
  const hasLibraryPermission = hasLibraryBooksPermission || hasLibraryCategoriesPermission || hasLibraryLoansPermission;

  // Finance permissions
  const hasFinanceAccountsPermission = useHasPermission('finance_accounts.read');
  const hasIncomeCategoriesPermission = useHasPermission('income_categories.read');
  const hasIncomeEntriesPermission = useHasPermission('income_entries.read');
  const hasExpenseCategoriesPermission = useHasPermission('expense_categories.read');
  const hasExpenseEntriesPermission = useHasPermission('expense_entries.read');
  const hasFinanceProjectsPermission = useHasPermission('finance_projects.read');
  const hasDonorsPermission = useHasPermission('donors.read');
  const hasFinanceReportsPermission = useHasPermission('finance_reports.read');
  const hasCurrenciesPermission = useHasPermission('currencies.read');
  const hasExchangeRatesPermission = useHasPermission('exchange_rates.read');
  const hasFeesPermission = useHasPermission('fees.read');
  const hasFeePaymentsPermission = useHasPermission('fees.payments.create');
  const hasFeeExceptionsPermission = useHasPermission('fees.exceptions.create');
  const hasFinancePermission = hasFinanceAccountsPermission || hasIncomeEntriesPermission || hasExpenseEntriesPermission || hasFinanceProjectsPermission || hasDonorsPermission || hasFinanceReportsPermission || hasCurrenciesPermission || hasExchangeRatesPermission || hasFeesPermission || hasFeePaymentsPermission || hasFeeExceptionsPermission;

  // DMS (Document Management System) permissions
  const hasDmsIncomingPermission = useHasPermission('dms.incoming.read');
  const hasDmsOutgoingPermission = useHasPermission('dms.outgoing.read');
  const hasDmsTemplatesPermission = useHasPermission('dms.templates.read');
  const hasDmsLetterheadsPermission = useHasPermission('dms.letterheads.read');
  const hasDmsLetterTypesPermission = useHasPermission('dms.letter_types.read');
  const hasDmsDepartmentsPermission = useHasPermission('dms.departments.read');
  const hasDmsReportsPermission = useHasPermission('dms.reports.read');
  const hasDmsSettingsPermission = useHasPermission('dms.settings.read');
  const hasDmsArchivePermission = useHasPermission('dms.archive.read');
  const hasDmsPermission = hasDmsIncomingPermission || hasDmsOutgoingPermission || hasDmsTemplatesPermission || hasDmsLetterheadsPermission || hasDmsLetterTypesPermission || hasDmsDepartmentsPermission || hasDmsReportsPermission || hasDmsSettingsPermission || hasDmsArchivePermission;

  // Events permissions
  const hasEventsPermission = useHasPermission('events.read');
  const hasEventTypesPermission = useHasPermission('event_types.read');
  const hasEventGuestsPermission = useHasPermission('event_guests.read');
  const hasEventGuestsCreatePermission = useHasPermission('event_guests.create');
  const hasEventCheckinsCreatePermission = useHasPermission('event_checkins.create');
  const hasEventCheckinsReadPermission = useHasPermission('event_checkins.read');
  const hasEventUpdatePermission = useHasPermission('events.update');
  // Show events navigation if user has ANY event-related permission
  const hasEventsNavigation = hasEventsPermission || hasEventTypesPermission || hasEventGuestsPermission || hasEventGuestsCreatePermission || hasEventCheckinsCreatePermission || hasEventCheckinsReadPermission || hasEventUpdatePermission;

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
  const hasRolesPermission = useHasPermission('roles.read'); // Permission for roles management
  const hasAttendanceNavigation = hasAttendanceSessionsPermission || hasAttendanceReportsPermission;

  // Check if user is event user (profile already declared above)
  const isEventUser = profile?.is_event_user === true;

  // Context-aware navigation items - computed with useMemo to avoid hook order issues
  const allNavigationItems = useMemo((): NavigationItem[] => {
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
          children: [
            ...(hasEventsPermission ? [{
              title: "All Events",
              titleKey: "events.all",
              url: "/events",
              icon: Calendar,
            }] : []),
            ...(hasEventCheckinsCreatePermission ? [{
              title: "Check-in",
              titleKey: "events.checkin",
              url: "/events",
              icon: UserCheck,
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
        priority: 0.5
      },
      ...((hasStaffPermission || hasStaffReportsPermission) ? [{
        titleKey: "staffManagement",
        icon: Users,
        badge: null,
        priority: 3,
        children: [
          ...(hasStaffPermission ? [{
            title: "Staff",
            titleKey: "staff",
            url: "/staff",
            icon: Users,
          }] : []),
          ...(hasStaffReportsPermission ? [{
            title: "Staff Reports",
            titleKey: "staffReports",
            url: "/reports/staff-registrations",
            icon: FileText,
          }] : []),
        ],
      }] : []),
      ...(hasAttendanceNavigation ? [{
        titleKey: "attendance",
        url: "/attendance",
        icon: UserCheck,
        badge: null,
        priority: 3.02,
        children: [
          ...(hasAttendanceSessionsPermission ? [{
            title: "Attendance",
            titleKey: "attendance",
            url: "/attendance",
            icon: UserCheck,
          }] : []),
          ...(hasAttendanceSessionsPermission ? [{
            title: "Attendance Reports",
            titleKey: "attendanceReports",
            url: "/attendance/reports",
            icon: FileText,
          }] : []),
          ...(hasAttendanceReportsPermission ? [{
            title: "Attendance Totals",
            titleKey: "attendanceTotalsReport",
            url: "/attendance/reports/totals",
            icon: LucideIcons.BarChart3,
          }] : []),
        ],
      }] : []),
      ...(hasLeaveRequestsPermission ? [{
        titleKey: "leaveRequests",
        icon: Calendar,
        badge: null,
        priority: 3.03,
        children: [
          {
            title: "Leave Requests",
            titleKey: "leaveRequests",
            url: "/leave-requests",
            icon: Calendar,
          },
          {
            title: "Leave Reports",
            titleKey: "leaveReports",
            url: "/leave-requests/reports",
            icon: LucideIcons.BarChart3,
          },
        ],
      }] : []),
      ...((hasShortTermCoursesPermission || hasCourseStudentsPermission || hasCourseReportsPermission || hasCourseAttendancePermission || hasCertificateTemplatesPermission || hasCourseDocumentsPermission) ? [{
        titleKey: "shortTermCourses",
        icon: GraduationCap,
        badge: null,
        priority: 3.045,
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
            icon: GraduationCap,
          }] : []),
          ...(hasCourseAttendancePermission ? [{
            title: "Course Attendance",
            titleKey: "courseAttendance",
            url: "/course-attendance",
            icon: UserCheck,
          }] : []),
          ...(hasCourseStudentsPermission ? [{
            title: "Course Certificates",
            titleKey: "courseCertificates",
            url: "/course-certificates",
            icon: LucideIcons.Award,
          }] : []),
          ...(hasCertificateTemplatesPermission ? [{
            title: "Certificate Templates",
            titleKey: "certificateTemplates",
            url: "/certificate-templates",
            icon: LucideIcons.Award,
          }] : []),
          ...(hasCourseDocumentsPermission ? [{
            title: "Course Documents",
            titleKey: "courseDocuments",
            url: "/course-documents",
            icon: FileText,
          }] : []),
          ...(hasCourseReportsPermission ? [{
            title: "Course Reports",
            titleKey: "courseReports",
            url: "/course-students/reports",
            icon: LucideIcons.BarChart3,
          }] : []),
        ],
      }] : []),
      ...((hasGraduationBatchesPermission || hasCertificateTemplatesPermission || hasIssuedCertificatesPermission) ? [{
        titleKey: "graduationCertificates",
        icon: LucideIcons.GraduationCap,
        badge: null,
        priority: 3.053,
        children: [
          ...(hasGraduationBatchesPermission ? [{
            title: "Dashboard",
            titleKey: "nav.dashboard",
            url: "/graduation",
            icon: LucideIcons.Home,
          }] : []),
          ...(hasGraduationBatchesPermission ? [{
            title: "Graduation Batches",
            titleKey: "graduation.batches",
            url: "/graduation/batches",
            icon: LucideIcons.GraduationCap,
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
      }] : []),
      ...(hasIdCardsPermission || hasIdCardsExportPermission ? [{
        titleKey: "idCards",
        icon: LucideIcons.CreditCard,
        badge: null,
        priority: 3.054,
        children: [
          ...(hasIdCardsPermission ? [{
            title: "ID Card Templates",
            titleKey: "idCards.templates",
            url: "/id-cards/templates",
            icon: LucideIcons.CreditCard,
          }] : []),
          ...(hasIdCardsPermission ? [{
            title: "ID Card Assignment",
            titleKey: "idCards.assignment",
            url: "/id-cards/assignment",
            icon: LucideIcons.UserCheck,
          }] : []),
          ...(hasIdCardsExportPermission ? [{
            title: "ID Card Export",
            titleKey: "idCards.export",
            url: "/id-cards/export",
            icon: LucideIcons.Download,
          }] : []),
        ],
      }] : []),
      ...((hasStudentsPermission || hasStudentAdmissionsPermission || hasStudentReportsPermission || hasStudentAdmissionsReportPermission) ? [{
        titleKey: "studentManagement",
        icon: GraduationCap,
        badge: null,
        priority: 3.05,
        children: [
          ...(hasStudentsPermission ? [{
            title: "Students",
            titleKey: "students",
            url: "/students",
            icon: GraduationCap,
          }] : []),
          ...(hasStudentAdmissionsPermission ? [{
            title: "Admissions",
            titleKey: "admissions",
            url: "/admissions",
            icon: UserCheck,
          }] : []),
          ...(hasStudentReportsPermission ? [{
            title: "Student Reports",
            titleKey: "studentReports",
            url: "/reports/student-registrations",
            icon: FileText,
          }] : []),
          ...(hasStudentAdmissionsReportPermission ? [{
            title: "Admissions Report",
            titleKey: "admissionsReport",
            url: "/admissions/report",
            icon: FileText,
          }] : []),
        ],
      }] : []),
      ...(hasExamsPermission ? [{
        titleKey: "exams",
        icon: Trophy,
        badge: null,
        priority: 3.055,
        children: [
          ...(hasExamsPermission ? [{
            title: "Exams",
            titleKey: "exams",
            url: "/exams",
            icon: Trophy,
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
            icon: UserCheck,
          }] : []),
          ...(hasExamsTimetablePermission ? [{
            title: "Exam Timetables",
            url: "/exams/timetables",
            icon: Clock,
          }] : []),
          // Exam Management Submenu (Enrollment, Student Enrollment, Roll Numbers, Secret Numbers)
          ...((hasExamsManagePermission || hasExamsEnrollPermission || hasExamsRollNumbersReadPermission || hasExamsRollNumbersAssignPermission || hasExamsSecretNumbersReadPermission || hasExamsSecretNumbersAssignPermission) ? [{
            title: "Exam Management",
            titleKey: "examManagement",
            icon: LucideIcons.Settings,
            children: [
              ...(hasExamsManagePermission ? [{
                title: "Exam Enrollment",
                titleKey: "examEnrollment",
                url: "/exams/enrollment",
                icon: UserPlus,
              }] : []),
              ...(hasExamsEnrollPermission ? [{
                title: "Student Enrollment",
                titleKey: "examStudentEnrollment",
                url: "/exams/student-enrollment",
                icon: Users,
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
                icon: LucideIcons.FileText,
              }] : []),
              ...(hasExamsPapersPermission ? [{
                title: "Print Tracking",
                titleKey: "examPaperPrintTracking",
                url: "/exams/papers/print-tracking",
                icon: LucideIcons.Printer,
              }] : []),
            ],
          }] : []),
          ...(hasExamDocumentsPermission ? [{
            title: "Exam Documents",
            titleKey: "examDocuments",
            url: "/exam-documents",
            icon: FileText,
          }] : []),
          // Reports Submenu - at the end
          ...((hasExamsReportsPermission || hasExamsViewGradeCardsPermission || hasExamsViewConsolidatedReportsPermission || hasExamsViewClassReportsPermission || hasExamsViewStudentReportsPermission || hasExamsNumbersPrintPermission) ? [{
            title: "Reports",
            titleKey: "examReports",
            icon: FileText,
            children: [
              ...(hasExamsReportsPermission ? [{
                title: "Exam Insights",
                titleKey: "examInsights",
                url: "/exams/reports",
                icon: FileText,
              }] : []),
              ...(hasExamsReportsPermission ? [{
                title: "Exam Analytics",
                titleKey: "examAnalytics",
                url: "/exams/analytics",
                icon: BarChart3,
              }] : []),
              ...(hasExamsViewConsolidatedReportsPermission ? [{
                title: "Consolidated Mark Sheet",
                titleKey: "consolidatedMarkSheet",
                url: "/exams/reports/consolidated",
                icon: LucideIcons.FileText,
              }] : []),
              ...(hasExamsViewClassReportsPermission ? [{
                title: "Class Subject Mark Sheet",
                titleKey: "classSubjectMarkSheet",
                url: "/exams/reports/class-subject",
                icon: LucideIcons.BarChart3,
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
      }] : []),
      ...(hasHostelPermission || hasBuildingsPermission || hasRoomsPermission ? [{
        titleKey: "hostel",
        icon: BedDouble,
        badge: null,
        priority: 3.06,
        children: [
          ...(hasHostelPermission ? [{
            title: "Hostel overview",
            titleKey: "hostel.overview",
            url: "/hostel",
            icon: BedDouble,
          }] : []),
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
          ...(hasReportsPermission ? [{
            title: "Hostel reports",
            titleKey: "hostel.reports",
            url: "/hostel/reports",
            icon: LucideIcons.BarChart3,
          }] : []),
        ],
      }] : []),
      ...(hasLibraryPermission ? [{
        titleKey: "library",
        icon: BookOpen,
        badge: null,
        priority: 3.07,
        children: [
          ...(hasLibraryBooksPermission ? [{
            title: "Dashboard",
            titleKey: "library.dashboard",
            url: "/library/dashboard",
            icon: LucideIcons.BarChart3,
          }] : []),
          ...(hasLibraryCategoriesPermission ? [{
            title: "Categories",
            titleKey: "library.categories",
            url: "/library/categories",
            icon: BookOpen,
          }] : []),
          ...(hasLibraryBooksPermission ? [{
            title: "Books",
            titleKey: "library.books",
            url: "/library/books",
            icon: BookOpen,
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
            icon: LucideIcons.BarChart3,
          }] : []),
        ],
      }] : []),
      ...(hasFinancePermission ? [{
        titleKey: "finance",
        icon: CreditCard,
        badge: null,
        priority: 3.075,
        children: [
          ...(hasFinanceAccountsPermission ? [{
            title: "Dashboard",
            titleKey: "finance.dashboard",
            url: "/finance/dashboard",
            icon: Home,
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
            icon: LucideIcons.TrendingUp,
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
            icon: Users,
          }] : []),
          ...(hasFinanceReportsPermission ? [{
            title: "Reports",
            titleKey: "finance.reports",
            url: "/finance/reports",
            icon: LucideIcons.BarChart3,
          }] : []),
          // Settings submenu - only show if user has at least one settings permission
          ...((hasCurrenciesPermission || hasIncomeCategoriesPermission ||
            hasExpenseCategoriesPermission || hasExchangeRatesPermission) ? [{
              title: "Settings",
              titleKey: "finance.settings",
              url: "/finance/settings",
              icon: LucideIcons.Settings,
            }] : []),
        ],
      }] : []),
      ...(hasFeesPermission ? [{
        titleKey: "finance.fees",
        icon: LucideIcons.Banknote,
        badge: null,
        priority: 3.08,
        children: [
          {
            title: "Dashboard",
            titleKey: "finance.fees.dashboard",
            url: "/finance/fees/dashboard",
            icon: LucideIcons.BarChart3,
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
            icon: LucideIcons.CreditCard,
          }] : []),
          ...(hasFeeExceptionsPermission ? [{
            title: "Exceptions",
            titleKey: "finance.fees.exceptions",
            url: "/finance/fees/exceptions",
            icon: LucideIcons.Shield,
          }] : []),
          {
            title: "Reports",
            titleKey: "finance.fees.reports",
            url: "/finance/fees/reports",
            icon: LucideIcons.FileText,
          },
        ].filter(Boolean) as NavigationChild[],
      }] : []),
      ...(hasDmsPermission ? [{
        titleKey: "document-system",
        icon: FileText,
        badge: null,
        priority: 3.085,
        children: [
          ...(hasDmsIncomingPermission || hasDmsOutgoingPermission ? [{
            title: "DMS Dashboard",
            titleKey: "dms.dashboard",
            url: "/dms/dashboard",
            icon: Home,
          }] : []),
          ...(hasDmsIncomingPermission ? [{
            title: "Incoming",
            titleKey: "dms.incoming",
            url: "/dms/incoming",
            icon: FileText,
          }] : []),
          ...(hasDmsOutgoingPermission ? [{
            title: "Outgoing",
            titleKey: "dms.outgoing",
            url: "/dms/outgoing",
            icon: FileText,
          }] : []),
          ...(hasDmsOutgoingPermission ? [{
            title: "Issue Letter",
            titleKey: "dms.issueLetter",
            url: "/dms/issue-letter",
            icon: MessageSquare,
          }] : []),
          ...(hasDmsTemplatesPermission ? [{
            title: "Templates",
            titleKey: "dms.templates",
            url: "/dms/templates",
            icon: BookOpen,
          }] : []),
          ...(hasDmsLetterheadsPermission ? [{
            title: "Letterheads",
            titleKey: "dms.letterheads",
            url: "/dms/letterheads",
            icon: Trophy,
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
            icon: Package,
          }] : []),
          ...(hasDmsReportsPermission ? [{
            title: "Reports",
            titleKey: "dms.reports",
            url: "/dms/reports",
            icon: LucideIcons.BarChart3,
          }] : []),
          ...(hasDmsSettingsPermission ? [{
            title: "Settings",
            titleKey: "dms.settings",
            url: "/dms/settings",
            icon: Settings,
          }] : []),
        ],
      }] : []),
      ...(hasEventsNavigation ? [{
        titleKey: "events",
        icon: Calendar,
        badge: null,
        priority: 3.087,
        children: [
          ...(hasEventsPermission ? [{
            title: "All Events",
            titleKey: "events.all",
            url: "/events",
            icon: Calendar,
          }] : []),
          ...(hasEventCheckinsCreatePermission ? [{
            title: "Check-in",
            titleKey: "events.checkin",
            url: "/events",
            icon: UserCheck,
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
            icon: Settings,
          }] : []),
          ...(hasEventUpdatePermission ? [{
            title: "Event Users",
            titleKey: "events.users",
            url: "/events",
            icon: Shield,
          }] : []),
        ],
      }] : []),
      ...(hasAssetsPermission ? [{
        titleKey: "assets",
        icon: Boxes,
        badge: null,
        priority: 3.08,
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
            icon: Package,
          },
          {
            title: "Asset Management",
            titleKey: "assets.management",
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
            icon: LucideIcons.BarChart3,
          },
        ],
      }] : []),
      ...((hasClassesPermission || hasSubjectsPermission || hasTeacherSubjectAssignmentsPermission || hasTimetablesPermission) ? [{
        titleKey: "academicManagement",
        icon: GraduationCap,
        badge: null,
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
            titleKey: "teacherSubjectAssignments.title",
            url: "/settings/teacher-subject-assignments",
            icon: UserCheck,
          }] : []),
        ],
      }] : []),
      ...((hasTimetablesPermission || hasScheduleSlotsPermission) ? [{
        titleKey: "timetables",
        icon: Calendar,
        badge: null,
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
        priority: 10,
        children: [
          // Only show child items if user has the required permission
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
          ...(hasRolesPermission ? [{
            title: "Roles Management",
            url: "/settings/roles",
            icon: Shield,
          }] : []),
          ...(hasPermissionsPermission ? [{
            title: "User Permissions",
            url: "/settings/user-permissions",
            icon: User,
          }] : []),
          ...(hasUsersPermission ? [{
            title: "User Management",
            url: "/admin/users",
            icon: Users,
          }] : []),
          // Translations Editor - no permission required
          {
            title: "Translations",
            titleKey: "translations",
            url: "/settings/translations",
            icon: Languages,
          },
        ],
      },
      {
        titleKey: "academicSettings",
        icon: GraduationCap,
        badge: null,
        priority: 8,
        children: [
          // Only show child items if user has the required permission
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
          ...(hasExamTypesPermission ? [{
            title: "Exam Types",
            titleKey: "examTypes",
            url: "/settings/exam-types",
            icon: ClipboardList,
          }] : []),
          ...(hasStaffTypesPermission ? [{
            title: "Staff Types",
            url: "/settings/staff-types",
            icon: Users,
          }] : []),
          ...(hasGradesPermission ? [{
            title: "Grades Management",
            titleKey: "grades.management",
            url: "/settings/grades",
            icon: Trophy,
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
  }, [hasSettingsPermission, hasOrganizationsPermission, hasBuildingsPermission, hasRoomsPermission, hasAssetsPermission, hasProfilesPermission, hasUsersPermission, hasBrandingPermission, hasReportsPermission, hasPermissionsPermission, hasRolesPermission, hasResidencyTypesPermission, hasAcademicYearsPermission, hasExamTypesPermission, hasClassesPermission, hasSubjectsPermission, hasScheduleSlotsPermission, hasTeacherSubjectAssignmentsPermission, hasTimetablesPermission, hasStaffPermission, hasAttendanceSessionsPermission, hasLeaveRequestsPermission, hasStudentsPermission, hasStudentAdmissionsPermission, hasStudentReportsPermission, hasStudentAdmissionsReportPermission, hasHostelPermission, hasShortTermCoursesPermission, hasCourseStudentsPermission, hasCourseReportsPermission, hasCourseAttendancePermission, hasCertificateTemplatesPermission, hasCourseDocumentsPermission, hasExamDocumentsPermission, hasIdCardsPermission, hasFinancePermission, hasFinanceAccountsPermission, hasIncomeCategoriesPermission, hasIncomeEntriesPermission, hasExpenseCategoriesPermission, hasExpenseEntriesPermission, hasFinanceProjectsPermission, hasDonorsPermission, hasFinanceReportsPermission, hasDmsPermission, hasDmsIncomingPermission, hasDmsOutgoingPermission, hasDmsTemplatesPermission, hasDmsLetterheadsPermission, hasDmsDepartmentsPermission, hasDmsReportsPermission, hasDmsSettingsPermission, hasDmsArchivePermission]);

  // Helper function to get navigation items (already filtered by permissions)
  const getNavigationItems = (context: NavigationContext): NavigationItem[] => {
    // Items are already filtered by permissions when building allNavigationItems
    // Just sort by priority (lower number = higher priority)
    return [...allNavigationItems].sort((a, b) => (a.priority || 999) - (b.priority || 999));
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
    const items = getNavigationItems(navigationContext);
    return items;
  }, [navigationContext, allNavigationItems, permissionsReady]);

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
                  {item.children.map((child: NavigationChild) => {
                    // If child has nested children, render as collapsible submenu
                    if (child.children && child.children.length > 0) {
                      const childKey = child.url || child.titleKey || child.title;
                      const isChildExpanded = expandedItems.includes(childKey) || isChildActive(child.children);
                      return (
                        <Collapsible key={childKey} open={isChildExpanded} onOpenChange={() => toggleExpanded(childKey)}>
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton className={getNavCls({ isActive: isChildActive(child.children) })}>
                                <child.icon className="h-4 w-4" />
                                <span className="flex-1">{child.titleKey ? (child.titleKey.includes('.') ? t(child.titleKey) : t(`nav.${child.titleKey}`)) : child.title}</span>
                                {isChildExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenu className={`${isRTL ? 'mr-4 border-r' : 'ml-4 border-l'} border-sidebar-border`}>
                                {child.children.map((grandchild: NavigationChild) => (
                                  <SidebarMenuItem key={grandchild.titleKey || grandchild.url || grandchild.title}>
                                    <SidebarMenuButton asChild>
                                      <NavLink
                                        to={grandchild.url || '#'}
                                        className={getNavCls({ isActive: isActive(grandchild.url || '#') })}
                                        end={(grandchild.url || '#') === '/'}
                                      >
                                        <grandchild.icon className="h-4 w-4" />
                                        <span>{grandchild.titleKey ? (grandchild.titleKey.includes('.') ? t(grandchild.titleKey) : t(`nav.${grandchild.titleKey}`)) : grandchild.title}</span>
                                      </NavLink>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                ))}
                              </SidebarMenu>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      );
                    }
                    // Regular child item with URL
                    // Use titleKey as primary key to avoid duplicate keys when multiple items share the same URL
                    return (
                      <SidebarMenuItem key={child.titleKey || child.url || child.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={child.url || '#'}
                            className={getNavCls({ isActive: isActive(child.url || '#') })}
                            end={(child.url || '#') === '/'}
                          >
                            <child.icon className="h-4 w-4" />
                            <span>{child.titleKey ? (child.titleKey.includes('.') ? t(child.titleKey) : t(`nav.${child.titleKey}`)) : child.title}</span>
                            {child.contextual && navigationContext.currentModule.includes('attendance') && (
                              <Star className="h-3 w-3 text-warning ml-auto" />
                            )}
                          </NavLink>
                        </SidebarMenuButton>
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
              <p className="text-xs text-sidebar-foreground/70">{t('common.schoolManagement')}</p>
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
          <SidebarGroupLabel>{t('common.mainNavigation')}</SidebarGroupLabel>
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
