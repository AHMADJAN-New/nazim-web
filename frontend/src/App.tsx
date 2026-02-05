import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/queryClient";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

import ProtectedRoute from "@/components/ProtectedRoute";
import { PlatformAdminRoute } from "@/components/PlatformAdminRoute";
import { HostAwareRoot } from "@/components/HostAwareRoot";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import AboutUs from "./pages/AboutUs";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import HelpCenter from "./pages/HelpCenter";
import HelpCenterArticle from "./pages/HelpCenterArticle";
import MaintenancePage from "./pages/MaintenancePage";
import TimetableGeneration from "./pages/TimetableGeneration";
import { PlatformAdminLogin } from "./platform/pages/PlatformAdminLogin";
import { PlatformAdminDashboard } from "./platform/pages/PlatformAdminDashboard";
import { PlatformAdminLayout } from "./platform/components/PlatformAdminLayout";
import { OrganizationAdminsManagement } from "@/components/settings/OrganizationAdminsManagement";
import { PlatformPermissionGroupsManagement } from "./platform/pages/PlatformPermissionGroupsManagement";
import WebsiteManagementPage from "./platform/pages/admin/WebsiteManagementPage";

// Website Pages
import PublicWebsitePage from '@/website/pages/PublicWebsitePage';
import PublicDynamicPage from '@/website/pages/PublicDynamicPage';
import PublicNewsPage from '@/website/pages/PublicNewsPage';
import PublicFatwasPage from '@/website/pages/PublicFatwasPage';
import PublicAskFatwaPage from '@/website/pages/PublicAskFatwaPage';
import PublicFatwaDetailPage from '@/website/pages/PublicFatwaDetailPage';
import PublicExamResultsPage from '@/website/pages/PublicExamResultsPage';
import PublicContactPage from '@/website/pages/PublicContactPage';
import PublicLibraryPage from '@/website/pages/PublicLibraryPage';
import PublicBookDetailPage from '@/website/pages/PublicBookDetailPage';
import PublicCoursesPage from '@/website/pages/PublicCoursesPage';
import PublicCourseDetailPage from '@/website/pages/PublicCourseDetailPage';
import PublicScholarsPage from '@/website/pages/PublicScholarsPage';
import PublicGraduatesPage from '@/website/pages/PublicGraduatesPage';
import PublicDonationsPage from '@/website/pages/PublicDonationsPage';
import PublicPostDetailPage from '@/website/pages/PublicPostDetailPage';
import PublicEventsPage from '@/website/pages/PublicEventsPage';
import PublicEventDetailPage from '@/website/pages/PublicEventDetailPage';
import PublicGalleryPage from '@/website/pages/PublicGalleryPage';
import { PublicHeader } from '@/website/components/layout/PublicHeader';
import { PublicFooter } from '@/website/components/layout/PublicFooter';
import PublicWebsitePlaceholderPage from '@/website/pages/PublicWebsitePlaceholderPage';
import { publicWebsitePlaceholders } from '@/website/config/placeholders';
import { PublicLayout } from "@/website/components/layout/PublicLayout"

// Lazy-loaded components with optimized loading
import {
  Dashboard,
  ResetPasswordPage,
  DashboardSkeleton,
  PageSkeleton,
  BuildingsManagement,
  RoomsManagement,
  OrganizationsManagement,
  ProfileManagement,
  PermissionsManagement,
  RolesManagement,
  UserPermissionsManagement,
  SchoolsManagement,
  ReportTemplatesManagement,
  ResidencyTypesManagement,
  AcademicYearsManagement,
  ExamTypesPage,
  ClassesManagement,
  SubjectsManagement,
  Exams,
  ExamEnrollment,
  ExamStudentEnrollment,
  ExamMarks,
  ExamReports,
  ExamClassesSubjectsPage,
  ExamTimetablePage,
  ExamReportsPage,
  ExamAttendancePage,
  ExamRollNumbersPage,
  ExamSecretNumbersPage,
  ExamNumberReportsPage,
  GradesManagement,
  ExamReportsHub,
  ConsolidatedMarkSheet,
  ClassSubjectMarkSheet,
  StudentExamReport,
  QuestionBank,
  ExamPaperTemplates,
  ExamPaperTemplateEdit,
  ExamPaperPreview,
  ExamPaperPrintTracking,
  ScheduleSlotsManagement,
  TeacherSubjectAssignments,
  StaffTypesManagement,
  StaffList,
  Students,
  StudentsImport,
  StudentAdmissions,
  StudentReport,
  StudentAdmissionsReport,
  StudentHistoryPage,
  StudentHistoryListPage,
  NotificationsPage,
  ShortTermCourses,
  CourseStudents,
  CourseStudentReports,
  CourseDashboard,
  CourseAttendance,
  CourseCertificates,
  CertificateTemplates,
  IdCardTemplates,
  IdCardAssignment,
  IdCardExport,
  GraduationDashboard,
  GraduationBatchesPage,
  GraduationBatchDetailPage,
  CertificateTemplatesV2Page,
  GraduationCertificateTemplates,
  IssuedCertificatesPage,
  CourseDocuments,
  ExamDocuments,
  StaffReport,
  HostelManagement,
  HostelReports,
  AttendancePage,
  AttendanceMarking,
  AttendanceReports,
  AttendanceTotalsReports,
  UserManagement,
  UserProfile,
  UserSettings,
  Library,
  LibraryCategories,
  LibraryBooks,
  LibraryDashboard,
  LibraryDistribution,
  LibraryReports,
  LeaveManagement,
  LeaveReports,
  PhoneBook,
  Assets,
  AssetsDashboard,
  AssetAssignments,
  AssetReports,
  AssetCategories,
  DmsDashboard,
  IncomingDocuments,
  OutgoingDocuments,
  IssueLetter,
  TemplatesPage,
  LetterheadsPage,
  LetterTypesPage,
  DepartmentsPage,
  ArchiveSearchPage,
  DmsReportsPage,
  DmsSettingsPage,
  // Events Module
  EventTypesPage,
  EventsPage,
  EventDetailPage,
  GuestsPage,
  GuestAddPage,
  GuestDetailPage,
  GuestEditPage,
  CheckinPage,
  EventUsersPage,
  // Finance Module
  FinanceDashboard,
  FinanceAccounts,
  IncomeEntries,
  IncomeCategories,
  ExpenseEntries,
  ExpenseCategories,
  FinanceProjects,
  Currencies,
  ExchangeRates,
  Donors,
  FinanceDocuments,
  FinanceReports,
  FinanceSettings,
  FeeDashboard,
  FeeStructuresPage,
  FeeAssignmentsPage,
  FeePaymentsPage,
  FeeExceptionsPage,
  FeeReportsPage,
  StudentFeeStatementPage,
  VerifyCertificate,
  SubscriptionPage,
  PlansPage,
  RenewPage,
  MaintenanceFeesPage,
  LicenseFeesPage,
  SubscriptionAdminDashboard,
  PendingActionsPage,
  AllSubscriptionsPage,
  PlansManagement,
  OrganizationSubscriptionDetail,
  RenewalReviewPage,
  DiscountCodesManagement,
  MaintenanceFeesManagement,
  LicenseFeesManagement,
  OrganizationRevenueHistory,
  PlanRequestsPage,
  ContactMessagesManagement,
  LandingOffersPage,
  PlatformSettings,
  TranslationsManagement,
  HelpCenterManagement,
  MaintenanceHistory,
  DesktopLicenseGeneration,
  ActivityLogsPage
} from "@/components/LazyComponents";
import { PermissionGuard } from "@/components/PermissionGuard";
import { PermissionRoute } from "@/components/PermissionRoute";
import { AnyPermissionRoute } from "@/components/AnyPermissionRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { HostelPermissionGuard } from "@/components/HostelPermissionGuard";
import { PersistentLayout } from "@/components/layout/PersistentLayout";
import { MaintenanceModeHandler } from "@/components/MaintenanceModeHandler";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SchoolProvider } from "@/contexts/SchoolContext";
import { AuthProvider } from "@/hooks/useAuth";
import { appCoreTour, schoolSetupTour } from "@/onboarding";
import { TourProviderWrapper } from "@/components/TourProviderWrapper";
import { RouteToursHandler } from "@/components/RouteToursHandler";
import WebsiteManagerPage from "@/website/pages/WebsiteManagerPage";
import WebsiteModulePlaceholderPage from "@/website/pages/WebsiteModulePlaceholderPage";
import PagesManagementPage from "@/website/pages/PagesManagementPage";
import ArticlesManagementPage from "@/website/pages/ArticlesManagementPage";
import EventsManagementPage from "@/website/pages/EventsManagementPage";
import NavigationManagementPage from "@/website/pages/NavigationManagementPage";
import MediaManagementPage from "@/website/pages/MediaManagementPage";
import WebsiteGalleryPage from "@/website/pages/WebsiteGalleryPage";
import FatwasManagementPage from "@/website/pages/FatwasManagementPage";
import AnnouncementsManagementPage from "@/website/pages/AnnouncementsManagementPage";
import WebsiteLibraryPage from "@/website/pages/WebsiteLibraryPage";
import WebsiteCoursesPage from "@/website/pages/WebsiteCoursesPage";
import WebsiteScholarsPage from "@/website/pages/WebsiteScholarsPage";
import WebsiteGraduatesPage from "@/website/pages/WebsiteGraduatesPage";
import WebsiteDonationsPage from "@/website/pages/WebsiteDonationsPage";
import WebsiteInboxPage from "@/website/pages/WebsiteInboxPage";
import WebsiteAdmissionsPage from "@/website/pages/WebsiteAdmissionsPage";
import WebsiteUsersPage from "@/website/pages/WebsiteUsersPage";
import PublicAdmissionsPage from "@/website/pages/PublicAdmissionsPage";
import WebsiteAuditLogsPage from "@/website/pages/WebsiteAuditLogsPage";
import WebsiteSeoPage from "@/website/pages/WebsiteSeoPage";

// Centralized QueryClient – defaults (e.g. refetch on focus) live in @/lib/queryClient
const queryClient = createQueryClient();

const websiteModulePlaceholders = [
  {
    path: "/website/navigation",
    title: "Navigation",
    description: "Manage header and footer menus for the public site.",
    actionLabel: "New menu item",
    features: [
      "Drag-and-drop menu ordering",
      "Nested menu support",
      "Footer links editor",
      "Bulk publish and visibility toggles",
    ],
  },
  {
    path: "/website/announcements",
    title: "Announcements",
    description: "Publish short notices and ticker updates for visitors.",
    actionLabel: "New announcement",
    features: [
      "Draft, scheduled, and published statuses",
      "Expiry dates with automatic archiving",
      "Pinned announcements for homepage",
      "Bulk publish/unpublish",
    ],
  },
  {
    path: "/website/courses",
    title: "Courses & Programs",
    description: "Manage program listings, instructors, and course pages.",
    actionLabel: "New course",
    features: [
      "Course categories with filters",
      "Instructor linking",
      "Scheduling and enrollment info",
      "SEO metadata and previews",
    ],
  },
  {
    path: "/website/articles",
    title: "Articles & Blog",
    description: "Create blog posts, categories, and tags for the school site.",
    actionLabel: "New article",
    features: [
      "Draft, scheduled, and published workflow",
      "Categories, tags, and author profiles",
      "Rich editor with media picker",
      "Version history and restore",
    ],
  },
  {
    path: "/website/library",
    title: "Library & Books",
    description: "Maintain the public library catalog and downloadable PDFs.",
    actionLabel: "New book",
    features: [
      "Book categories and filters",
      "PDF upload with viewer toggle",
      "Cover image management",
      "Download tracking",
    ],
  },
  {
    path: "/website/events",
    title: "Events Calendar",
    description: "Publish upcoming events and manage calendar views.",
    actionLabel: "New event",
    features: [
      "Calendar and list views",
      "Recurring events (optional)",
      "Public/private visibility",
      "RSVP and inquiry settings",
    ],
  },
  {
    path: "/website/gallery",
    title: "Gallery",
    description: "Organize albums and media for the public gallery.",
    actionLabel: "New album",
    features: [
      "Album and photo CRUD",
      "Bulk media uploads",
      "Video embed links",
      "Featured gallery sections",
    ],
  },
  {
    path: "/website/scholars",
    title: "Scholars & Staff",
    description: "Manage scholar profiles and staff listings.",
    actionLabel: "New profile",
    features: [
      "Positions and biographies",
      "Social links",
      "Link to articles and fatwas",
      "Featured scholars",
    ],
  },
  {
    path: "/website/graduates",
    title: "Graduates",
    description: "Highlight graduating cohorts and alumni lists.",
    actionLabel: "New graduate year",
    features: [
      "Graduation years CRUD",
      "CSV import and bulk add",
      "Public profile visibility",
      "Search and filters",
    ],
  },
  {
    path: "/website/donations",
    title: "Donations",
    description: "Configure donation funds and inquiry handling.",
    actionLabel: "New fund",
    features: [
      "Funds and categories",
      "Bank details/instructions",
      "Inquiry inbox",
      "Optional online payment setup",
    ],
  },
  {
    path: "/website/fatwas",
    title: "Questions & Fatwas",
    description: "Moderate questions, assign muftis, and publish fatwas.",
    actionLabel: "New fatwa",
    features: [
      "Multi-stage review workflow",
      "Assignment and internal notes",
      "References and citations block",
      "Related question suggestions",
    ],
  },
  {
    path: "/website/inbox",
    title: "Inbox",
    description: "Review contact messages, donation inquiries, and question submissions.",
    actionLabel: "New response",
    features: [
      "Unified inbox with filters",
      "Status tracking and assignments",
      "Quick reply templates",
      "Notifications for new items",
    ],
  },
  {
    path: "/website/seo",
    title: "SEO Tools",
    description: "Manage site metadata, redirects, and SEO monitoring.",
    actionLabel: "New redirect",
    features: [
      "Meta title/description defaults",
      "OG image presets",
      "301 redirect manager",
      "Broken link reports",
    ],
  },
  {
    path: "/website/audit",
    title: "Audit Logs",
    description: "Track content changes and approvals.",
    actionLabel: "Export log",
    features: [
      "Content change history",
      "Approval and publish logs",
      "User activity trail",
      "Exportable reports",
    ],
  },
];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <SchoolProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >

            <ErrorBoundary>
              <MaintenanceModeHandler>
                <Routes>
                  <Route element={<HostAwareRoot />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/about" element={<AboutUs />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />

                  <Route element={<PublicLayout />}>
                    {/* Short URL routes for pages (e.g., /page/about, /page/admissions) */}
                    <Route path="/page/:slug" element={<PublicDynamicPage />} />

                    <Route path="/public-site" element={<PublicWebsitePage />} />
                    <Route path="/public-site/pages/:slug" element={<PublicDynamicPage />} />

                    {/* Standard Content Pages (Generic Dynamic) */}
                    <Route path="/public-site/about" element={<PublicDynamicPage />} />
                    <Route path="/public-site/privacy" element={<PublicDynamicPage />} />
                    <Route path="/public-site/terms" element={<PublicDynamicPage />} />
                    <Route path="/public-site/academics" element={<PublicDynamicPage />} />
                    <Route path="/public-site/admissions" element={<PublicAdmissionsPage />} />

                    {/* Specialized Pages */}
                    <Route path="/public-site/news" element={<PublicNewsPage />} />
                    <Route path="/public-site/announcements" element={<PublicNewsPage type="announcement" />} />
                    <Route path="/public-site/articles" element={<PublicNewsPage type="article" />} />
                    <Route path="/public-site/announcements/:slug" element={<PublicPostDetailPage />} />
                    <Route path="/public-site/articles/:slug" element={<PublicPostDetailPage />} />
                    <Route path="/public-site/posts/:slug" element={<PublicPostDetailPage />} />
                    <Route path="/public-site/fatwas/ask" element={<PublicAskFatwaPage />} />
                    <Route path="/public-site/fatwas/view/:slug" element={<PublicFatwaDetailPage />} />
                    <Route path="/public-site/fatwas/category/:category" element={<PublicFatwasPage />} />
                    <Route path="/public-site/fatwas/:slug" element={<PublicFatwasPage />} />
                    <Route path="/public-site/fatwas" element={<PublicFatwasPage />} />
                    <Route path="/public-site/results" element={<PublicExamResultsPage />} />
                    <Route path="/public-site/contact" element={<PublicContactPage />} />

                    {/* New Public Modules */}
                    <Route path="/public-site/library/:id" element={<PublicBookDetailPage />} />
                    <Route path="/public-site/library" element={<PublicLibraryPage />} />
                    <Route path="/public-site/courses/:id" element={<PublicCourseDetailPage />} />
                    <Route path="/public-site/courses" element={<PublicCoursesPage />} />
                    <Route path="/public-site/programs/:id" element={<PublicCourseDetailPage />} />
                    <Route path="/public-site/programs" element={<PublicCoursesPage />} />
                    <Route path="/public-site/scholars" element={<PublicScholarsPage />} />
                    <Route path="/public-site/staff" element={<PublicScholarsPage />} />
                    <Route path="/public-site/graduates" element={<PublicGraduatesPage />} />
                    <Route path="/public-site/alumni" element={<PublicGraduatesPage />} />
                    <Route path="/public-site/donations" element={<PublicDonationsPage />} />
                    <Route path="/public-site/donate" element={<PublicDonationsPage />} />

                    <Route path="/public-site/staff" element={<PublicScholarsPage />} />

                    {/* Events Fallback (can be specialized later) */}
                    <Route path="/public-site/events" element={<PublicEventsPage />} />
                    <Route path="/public-site/events/:id" element={<PublicEventDetailPage />} />
                    <Route path="/public-site/gallery" element={<PublicGalleryPage />} />
                    <Route path="/public-site/media" element={<PublicGalleryPage />} />

                    {/* Placeholders for any other dynamic routes */}
                    {publicWebsitePlaceholders.map((page) => (
                      <Route
                        key={page.path}
                        path={page.path}
                        element={
                          <PublicWebsitePlaceholderPage
                            title={page.title}
                            description={page.description}
                            highlights={page.highlights}
                          />
                        }
                      />
                    ))}
                  </Route>
                  <Route path="/maintenance" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <MaintenancePage />
                    </Suspense>
                  } />

                  {/* Public verification routes - no auth required */}
                  <Route path="/verify/certificate/:hash" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <VerifyCertificate />
                    </Suspense>
                  } />
                  <Route path="/verify/certificate" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <VerifyCertificate />
                    </Suspense>
                  } />
                  <Route path="/verify" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <VerifyCertificate />
                    </Suspense>
                  } />

                  {/* Platform Admin Routes - Separate app, not tied to organizations */}
                  <Route path="/platform/login" element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PlatformAdminLogin />
                    </Suspense>
                  } />
                  <Route path="/platform" element={
                    <PlatformAdminRoute>
                      <PlatformAdminLayout>
                        <Outlet />
                      </PlatformAdminLayout>
                    </PlatformAdminRoute>
                  }>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <PlatformAdminDashboard />
                      </Suspense>
                    } />
                    <Route path="organizations" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <OrganizationsManagement />
                      </Suspense>
                    } />
                    <Route path="organizations/:organizationId/subscription" element={
                      <Suspense fallback={
                        <div className="flex h-screen items-center justify-center bg-yellow-50 border-4 border-yellow-500">
                          <div className="text-center">
                            <p className="text-lg font-bold text-yellow-800">Loading Organization Subscription Detail...</p>
                            <p className="text-sm text-yellow-700 mt-2">If this doesn't disappear, check console for errors</p>
                          </div>
                        </div>
                      }>
                        <OrganizationSubscriptionDetail />
                      </Suspense>
                    } />
                    <Route path="admins" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <OrganizationAdminsManagement />
                      </Suspense>
                    } />
                    <Route path="permission-groups" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <PlatformPermissionGroupsManagement />
                      </Suspense>
                    } />
                    <Route path="websites" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <WebsiteManagementPage />
                      </Suspense>
                    } />
                    <Route path="subscriptions" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <AllSubscriptionsPage />
                      </Suspense>
                    } />
                    <Route path="plans" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <PlansManagement />
                      </Suspense>
                    } />
                    <Route path="plan-requests" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <PlanRequestsPage />
                      </Suspense>
                    } />
                    <Route path="contact-messages" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <ContactMessagesManagement />
                      </Suspense>
                    } />
                    <Route path="pending" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <PendingActionsPage />
                      </Suspense>
                    } />
                    <Route path="payments/:paymentId" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <SubscriptionAdminDashboard />
                      </Suspense>
                    } />
                    <Route path="renewals/:renewalId" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <RenewalReviewPage />
                      </Suspense>
                    } />
                    <Route path="discount-codes" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <DiscountCodesManagement />
                      </Suspense>
                    } />
                    <Route path="landing-offers" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <LandingOffersPage />
                      </Suspense>
                    } />
                    <Route path="maintenance-fees" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <MaintenanceFeesManagement />
                      </Suspense>
                    } />
                    <Route path="license-fees" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <LicenseFeesManagement />
                      </Suspense>
                    } />
                    <Route path="revenue-history" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <OrganizationRevenueHistory />
                      </Suspense>
                    } />
                    {/* CRITICAL: More specific routes must come before less specific ones */}
                    <Route path="settings/translations" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <TranslationsManagement />
                      </Suspense>
                    } />
                    <Route path="settings" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <PlatformSettings />
                      </Suspense>
                    } />
                    <Route path="help-center" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <HelpCenterManagement />
                      </Suspense>
                    } />
                    <Route path="maintenance-history" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <MaintenanceHistory />
                      </Suspense>
                    } />
                    <Route path="desktop-licenses" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <DesktopLicenseGeneration />
                      </Suspense>
                    } />
                    <Route path="maintenance" element={<Navigate to="maintenance-history" replace />} />
                  </Route>

                  {/* Protected routes with persistent layout */}
                  <Route element={
                    <ProtectedRoute>
                      <TourProviderWrapper tours={[appCoreTour, schoolSetupTour]} autoStart={false}>
                        <SidebarProvider>
                          <PersistentLayout />
                        </SidebarProvider>
                      </TourProviderWrapper>
                    </ProtectedRoute>
                  }>
                    {/* Dashboard with optimized loading */}
                    <Route path="/dashboard" element={
                      <Suspense fallback={<DashboardSkeleton />}>
                        <Dashboard />
                      </Suspense>
                    } />
                    {/* User Profile and Settings */}
                    <Route path="/profile" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <UserProfile />
                      </Suspense>
                    } />
                    <Route path="/settings/user" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <UserSettings />
                      </Suspense>
                    } />
                    <Route path="/notifications" element={
                      <PermissionRoute permission="notifications.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <NotificationsPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Help Center */}
                    <Route path="/help-center" element={
                      <PermissionRoute permission="help_center.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <HelpCenter />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/help-center/s/:categorySlug" element={
                      <PermissionRoute permission="help_center.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <HelpCenter />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/help-center/s/:categorySlug/:articleSlug" element={
                      <PermissionRoute permission="help_center.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <HelpCenterArticle />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Keep ID-based route for admin/backoffice usage */}
                    <Route path="/help-center/article/:id" element={
                      <PermissionRoute permission="help_center.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <HelpCenterArticle />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/academic/timetable-generation" element={
                      <PermissionRoute permission="timetables.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <TimetableGeneration />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Settings routes */}
                    <Route path="/settings/organizations" element={
                      <PermissionRoute permission="organizations.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <OrganizationsManagement />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/settings/buildings" element={
                      <PermissionRoute permission="buildings.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <BuildingsManagement />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/settings/rooms" element={
                      <PermissionRoute permission="rooms.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <RoomsManagement />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/assets/dashboard" element={
                      <PermissionRoute permission="assets.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <AssetsDashboard />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/assets" element={
                      <PermissionRoute permission="assets.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <Assets />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/assets/assignments" element={
                      <PermissionRoute permission="assets.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <AssetAssignments />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/assets/reports" element={
                      <PermissionRoute permission="assets.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <AssetReports />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/assets/categories" element={
                      <PermissionRoute permission="asset_categories.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <AssetCategories />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/settings/profile" element={
                      <PermissionRoute permission="profiles.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ProfileManagement />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/settings/permissions" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <PermissionsManagement />
                      </Suspense>
                    } />
                    <Route path="/settings/roles" element={
                      <PermissionRoute permission="roles.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <RolesManagement />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/settings/user-permissions" element={
                      <PermissionRoute permission="permissions.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <UserPermissionsManagement />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/settings/schools" element={
                      <PermissionRoute permission="school_branding.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <SchoolsManagement />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/website" element={
                      <PermissionRoute permission="website_settings.read">
                        <WebsiteManagerPage />
                      </PermissionRoute>
                    } />
                    {/* Phase 1: Pages with backend APIs */}
                    <Route path="/website/navigation" element={
                      <PermissionRoute permission="website_menus.read">
                        <NavigationManagementPage />
                      </PermissionRoute>
                    } />
                    <Route path="/website/pages" element={
                      <PermissionRoute permission="website_pages.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <PagesManagementPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/website/articles" element={
                      <PermissionRoute permission="website_posts.read">
                        <ArticlesManagementPage />
                      </PermissionRoute>
                    } />
                    <Route path="/website/events" element={
                      <PermissionRoute permission="website_events.read">
                        <EventsManagementPage />
                      </PermissionRoute>
                    } />
                    <Route path="/website/admissions" element={
                      <PermissionRoute permission="website_settings.read">
                        <WebsiteAdmissionsPage />
                      </PermissionRoute>
                    } />
                    <Route path="/website/fatwas" element={
                      <PermissionRoute permission="website_settings.read">
                        <FatwasManagementPage />
                      </PermissionRoute>
                    } />
                    <Route path="/website/media" element={
                      <PermissionRoute permission="website_media.read">
                        <MediaManagementPage />
                      </PermissionRoute>
                    } />
                    <Route path="/website/gallery" element={
                      <PermissionRoute permission="website_media.read">
                        <WebsiteGalleryPage />
                      </PermissionRoute>
                    } />
                    <Route path="/website/announcements" element={
                      <PermissionRoute permission="website_posts.read">
                        <AnnouncementsManagementPage />
                      </PermissionRoute>
                    } />
                    <Route path="/website/library" element={
                      <PermissionRoute permission="website_settings.read">
                        <WebsiteLibraryPage />
                      </PermissionRoute>
                    } />
                    <Route path="/website/courses" element={
                      <PermissionRoute permission="website_settings.read">
                        <WebsiteCoursesPage />
                      </PermissionRoute>
                    } />
                    <Route path="/website/scholars" element={
                      <PermissionRoute permission="website_settings.read">
                        <WebsiteScholarsPage />
                      </PermissionRoute>
                    } />
                    <Route path="/website/graduates" element={
                      <PermissionRoute permission="website_settings.read">
                        <WebsiteGraduatesPage />
                      </PermissionRoute>
                    } />
                    <Route path="/website/donations" element={
                      <PermissionRoute permission="website_settings.read">
                        <WebsiteDonationsPage />
                      </PermissionRoute>
                    } />
                    <Route path="/website/inbox" element={
                      <PermissionRoute permission="website_settings.read">
                        <WebsiteInboxPage />
                      </PermissionRoute>
                    } />
                    <Route path="/website/users" element={
                      <PermissionRoute permission="users.read">
                        <WebsiteUsersPage />
                      </PermissionRoute>
                    } />
                    <Route path="/website/audit" element={
                      <PermissionRoute permission="website_settings.read">
                        <WebsiteAuditLogsPage />
                      </PermissionRoute>
                    } />
                    <Route path="/website/seo" element={
                      <AnyPermissionRoute permissions={['website_pages.read', 'website_posts.read']}>
                        <WebsiteSeoPage />
                      </AnyPermissionRoute>
                    } />
                    {/* Phase 2: Pages requiring backend work - still use placeholders */}
                    {websiteModulePlaceholders
                      .filter(module =>
                        !['/website/navigation', '/website/articles', '/website/events', '/website/admissions', '/website/fatwas', '/website/media', '/website/gallery', '/website/announcements',
                          '/website/library', '/website/courses', '/website/scholars', '/website/graduates', '/website/donations', '/website/inbox', '/website/users', '/website/audit', '/website/seo'].includes(module.path)
                      )
                      .map((module) => (
                        <Route
                          key={module.path}
                          path={module.path}
                          element={
                            <PermissionRoute permission={module.path === '/website/seo' ? 'website_domains.read' : 'website_settings.read'}>
                              <WebsiteModulePlaceholderPage
                                title={module.title}
                                description={module.description}
                                actionLabel={module.actionLabel}
                                features={module.features}
                              />
                            </PermissionRoute>
                          }
                        />
                      ))}
                    <Route path="/settings/report-templates" element={
                      <PermissionRoute permission="reports.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ReportTemplatesManagement />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/settings/activity-logs" element={
                      <PermissionRoute permission="activity_logs.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ActivityLogsPage />
                        </Suspense>
                      </PermissionRoute>
                    } />

                    {/* Subscription Admin routes */}
                    <Route path="/admin/subscription" element={
                      <PermissionRoute permission="subscription.admin">
                        <Suspense fallback={<PageSkeleton />}>
                          <SubscriptionAdminDashboard />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/admin/subscription/plans" element={
                      <PermissionRoute permission="subscription.admin">
                        <Suspense fallback={<PageSkeleton />}>
                          <PlansManagement />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/admin/subscription/organizations/:organizationId" element={
                      <PermissionRoute permission="subscription.admin">
                        <Suspense fallback={<PageSkeleton />}>
                          <OrganizationSubscriptionDetail />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/admin/subscription/renewals/:renewalId" element={
                      <PermissionRoute permission="subscription.admin">
                        <Suspense fallback={<PageSkeleton />}>
                          <RenewalReviewPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/admin/subscription/discount-codes" element={
                      <PermissionRoute permission="subscription.admin">
                        <Suspense fallback={<PageSkeleton />}>
                          <DiscountCodesManagement />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/settings/residency-types" element={
                      <PermissionRoute permission="residency_types.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ResidencyTypesManagement />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/settings/academic-years" element={
                      <PermissionRoute permission="academic_years.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <AcademicYearsManagement />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/settings/exam-types" element={
                      <PermissionRoute permission="exam_types.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamTypesPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/settings/classes" element={
                      <PermissionRoute permission="classes.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ClassesManagement />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/settings/subjects" element={
                      <PermissionRoute permission="subjects.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <SubjectsManagement />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/exams" element={
                      <PermissionRoute permission="exams.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <Exams />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/exams/:examId/classes-subjects" element={
                      <PermissionRoute permission="exams.manage">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamClassesSubjectsPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/exams/timetables" element={
                      <PermissionRoute permission="exams.manage_timetable">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamTimetablePage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/exams/:examId/timetable" element={
                      <PermissionRoute permission="exams.manage_timetable">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamTimetablePage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/exams/:examId/students" element={
                      <PermissionRoute permission="exams.enroll_students">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamStudentEnrollment />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/exams/:examId/marks" element={
                      <PermissionRoute permission="exams.enter_marks">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamMarks />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/exams/:examId/reports" element={
                      <PermissionRoute permission="exams.view_reports">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamReportsPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/exams/:examId/attendance" element={
                      <PermissionRoute permission="exams.manage_attendance">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamAttendancePage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Attendance route - can be accessed directly with exam selection */}
                    <Route path="/exams/attendance" element={
                      <PermissionRoute permission="exams.manage_attendance">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamAttendancePage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Roll Number Assignment */}
                    <Route path="/exams/:examId/roll-numbers" element={
                      <PermissionRoute permission="exams.roll_numbers.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamRollNumbersPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Secret Number Assignment */}
                    <Route path="/exams/:examId/secret-numbers" element={
                      <PermissionRoute permission="exams.secret_numbers.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamSecretNumbersPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Number Reports (Roll Slips, Secret Labels) */}
                    <Route path="/exams/:examId/number-reports" element={
                      <PermissionRoute permission="exams.roll_numbers.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamNumberReportsPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Direct access routes for exam numbers - with exam selection */}
                    <Route path="/exams/roll-numbers" element={
                      <PermissionRoute permission="exams.roll_numbers.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamRollNumbersPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/exams/secret-numbers" element={
                      <PermissionRoute permission="exams.secret_numbers.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamSecretNumbersPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/exams/number-reports" element={
                      <PermissionRoute permission="exams.roll_numbers.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamNumberReportsPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/exams/reports-hub" element={
                      <PermissionRoute permission="exams.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamReportsHub />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/exams/reports/consolidated" element={
                      <PermissionRoute permission="exams.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ConsolidatedMarkSheet />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/exams/reports/class-subject" element={
                      <PermissionRoute permission="exams.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ClassSubjectMarkSheet />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/exams/reports/student" element={
                      <PermissionRoute permission="students.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <StudentExamReport />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Question Bank */}
                    <Route path="/exams/question-bank" element={
                      <PermissionRoute permission="exams.questions.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <QuestionBank />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Exam Papers */}
                    <Route path="/exams/papers" element={
                      <PermissionRoute permission="exams.papers.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamPaperTemplates />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Legacy route for backward compatibility */}
                    <Route path="/exams/paper-templates" element={
                      <PermissionRoute permission="exams.papers.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamPaperTemplates />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Exam Paper Edit */}
                    <Route path="/exams/papers/:id/edit" element={
                      <PermissionRoute permission="exams.papers.update">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamPaperTemplateEdit />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Legacy route for backward compatibility */}
                    <Route path="/exams/paper-templates/:id/edit" element={
                      <PermissionRoute permission="exams.papers.update">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamPaperTemplateEdit />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Exam Paper Print Tracking */}
                    <Route path="/exams/papers/print-tracking" element={
                      <PermissionRoute permission="exams.papers.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamPaperPrintTracking />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Exam Paper Preview */}
                    <Route path="/exams/paper-preview/:templateId" element={
                      <PermissionRoute permission="exams.papers.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamPaperPreview />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Legacy routes for backward compatibility */}
                    <Route path="/exams/enrollment" element={
                      <PermissionRoute permission="exams.manage">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamEnrollment />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/exams/student-enrollment" element={
                      <PermissionRoute permission="exams.enroll_students">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamStudentEnrollment />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/exams/marks" element={
                      <PermissionRoute permission="exams.enter_marks">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamMarks />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/exams/reports" element={
                      <PermissionRoute permission="exams.view_reports">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamReports />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/exams/analytics" element={
                      <PermissionRoute permission="exams.view_reports">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamReportsPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/settings/schedule-slots" element={
                      <PermissionRoute permission="schedule_slots.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ScheduleSlotsManagement />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/settings/teacher-subject-assignments" element={
                      <PermissionRoute permission="teacher_subject_assignments.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <TeacherSubjectAssignments />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/settings/staff-types" element={
                      <PermissionRoute permission="staff_types.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <StaffTypesManagement />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/settings/grades" element={
                      <PermissionRoute permission="grades.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <GradesManagement />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/staff" element={
                      <PermissionRoute permission="staff.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <StaffList />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/phonebook" element={
                      <AnyPermissionRoute permissions={['students.read', 'staff.read', 'donors.read', 'event_guests.read']}>
                        <Suspense fallback={<PageSkeleton />}>
                          <PhoneBook />
                        </Suspense>
                      </AnyPermissionRoute>
                    } />
                    {/* Student History routes must come BEFORE /students route to avoid route conflicts */}
                    <Route path="/students/history" element={
                      <PermissionRoute permission="students.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <StudentHistoryListPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/students/:studentId/history" element={
                      <PermissionRoute permission="students.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <StudentHistoryPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/students" element={
                      <PermissionRoute permission="students.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <Students />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/students/import" element={
                      <PermissionRoute permission="students.import">
                        <Suspense fallback={<PageSkeleton />}>
                          <StudentsImport />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/reports/student-registrations" element={
                      <PermissionRoute permission="student_reports.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <StudentReport />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/reports/staff-registrations" element={
                      <PermissionRoute permission="staff_reports.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <StaffReport />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/hostel" element={
                      <HostelPermissionGuard>
                        <Suspense fallback={<PageSkeleton />}>
                          <HostelManagement />
                        </Suspense>
                      </HostelPermissionGuard>
                    } />
                    <Route path="/hostel/reports" element={
                      <PermissionRoute permission="reports.read">
                        <HostelPermissionGuard>
                          <Suspense fallback={<PageSkeleton />}>
                            <HostelReports />
                          </Suspense>
                        </HostelPermissionGuard>
                      </PermissionRoute>
                    } />
                    <Route path="/attendance" element={
                      <PermissionRoute permission="attendance_sessions.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <AttendancePage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/attendance/marking" element={
                      <PermissionRoute permission="attendance_sessions.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <AttendanceMarking />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/library/categories" element={
                      <PermissionRoute permission="library_categories.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <LibraryCategories />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/library/books" element={
                      <PermissionRoute permission="library_books.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <LibraryBooks />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/library/dashboard" element={
                      <PermissionRoute permission="library_books.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <LibraryDashboard />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/library/distribution" element={
                      <PermissionRoute permission="library_loans.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <LibraryDistribution />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/library/reports" element={
                      <PermissionRoute permission="library_books.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <LibraryReports />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Legacy route - redirect to books */}
                    <Route path="/library" element={
                      <PermissionRoute permission="library_books.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <LibraryBooks />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/attendance/reports" element={
                      <PermissionRoute permission="attendance_sessions.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <AttendanceReports />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/attendance/reports/totals" element={
                      <PermissionRoute permission="attendance_sessions.report">
                        <Suspense fallback={<PageSkeleton />}>
                          <AttendanceTotalsReports />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/admissions" element={
                      <PermissionRoute permission="student_admissions.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <StudentAdmissions />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/admissions/report" element={
                      <PermissionRoute permission="student_admissions.report">
                        <Suspense fallback={<PageSkeleton />}>
                          <StudentAdmissionsReport />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/short-term-courses" element={
                      <PermissionRoute permission="short_term_courses.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ShortTermCourses />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/course-students" element={
                      <PermissionRoute permission="course_students.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <CourseStudents />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/course-students/reports" element={
                      <PermissionRoute permission="course_students.report">
                        <Suspense fallback={<PageSkeleton />}>
                          <CourseStudentReports />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/course-dashboard" element={
                      <PermissionRoute permission="short_term_courses.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <CourseDashboard />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/course-attendance" element={
                      <PermissionRoute permission="course_attendance.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <CourseAttendance />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/course-certificates" element={
                      <PermissionRoute permission="course_students.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <CourseCertificates />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/graduation" element={
                      <PermissionRoute permission="graduation_batches.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <GraduationDashboard />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/graduation/batches" element={
                      <PermissionRoute permission="graduation_batches.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <GraduationBatchesPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/graduation/batches/:id" element={
                      <PermissionRoute permission="graduation_batches.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <GraduationBatchDetailPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/certificate-templates" element={
                      <PermissionRoute permission="certificate_templates.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <CertificateTemplates />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/certificates/templates" element={
                      <PermissionRoute permission="certificate_templates.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <CertificateTemplatesV2Page />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/graduation/certificate-templates" element={
                      <PermissionRoute permission="certificate_templates.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <GraduationCertificateTemplates />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/certificates/issued" element={
                      <PermissionRoute permission="issued_certificates.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <IssuedCertificatesPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/id-cards/templates" element={
                      <PermissionRoute permission="id_cards.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <IdCardTemplates />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/id-cards/assignment" element={
                      <PermissionRoute permission="id_cards.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <IdCardAssignment />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/id-cards/export" element={
                      <PermissionRoute permission="id_cards.export">
                        <Suspense fallback={<PageSkeleton />}>
                          <IdCardExport />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/course-documents" element={
                      <PermissionRoute permission="course_documents.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <CourseDocuments />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/exam-documents" element={
                      <PermissionRoute permission="exam_documents.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExamDocuments />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Admin routes */}
                    <Route path="/admin/users" element={
                      <PermissionRoute permission="users.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <UserManagement />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Leave Management routes */}
                    <Route path="/leave-requests" element={
                      <PermissionRoute permission="leave_requests.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <LeaveManagement />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/leave-requests/reports" element={
                      <PermissionRoute permission="leave_requests.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <LeaveReports />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Document Management System Routes */}
                    <Route path="/dms/dashboard" element={
                      <AnyPermissionRoute permissions={['dms.incoming.read', 'dms.outgoing.read']}>
                        <Suspense fallback={<DashboardSkeleton />}>
                          <DmsDashboard />
                        </Suspense>
                      </AnyPermissionRoute>
                    } />
                    <Route path="/dms/incoming" element={
                      <PermissionRoute permission="dms.incoming.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <IncomingDocuments />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/dms/outgoing" element={
                      <PermissionRoute permission="dms.outgoing.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <OutgoingDocuments />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/dms/issue-letter" element={
                      <PermissionRoute permission="dms.outgoing.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <IssueLetter />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/dms/templates" element={
                      <PermissionRoute permission="dms.templates.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <TemplatesPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/dms/letterheads" element={
                      <PermissionRoute permission="dms.letterheads.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <LetterheadsPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/dms/letter-types" element={
                      <PermissionRoute permission="dms.letter_types.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <LetterTypesPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/dms/departments" element={
                      <PermissionRoute permission="dms.departments.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <DepartmentsPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/dms/archive" element={
                      <PermissionRoute permission="dms.archive.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ArchiveSearchPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/dms/reports" element={
                      <PermissionRoute permission="dms.reports.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <DmsReportsPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/dms/settings" element={
                      <PermissionRoute permission="dms.settings.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <DmsSettingsPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Events Module Routes */}
                    <Route path="/events" element={
                      <PermissionRoute permission="events.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <EventsPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/events/types" element={
                      <PermissionRoute permission="event_types.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <EventTypesPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/events/:eventId" element={
                      <PermissionRoute permission="events.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <EventDetailPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/events/:eventId/guests" element={
                      <PermissionRoute permission="event_guests.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <GuestsPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/events/:eventId/guests/add" element={
                      <PermissionRoute permission="event_guests.create">
                        <Suspense fallback={<PageSkeleton />}>
                          <GuestAddPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/events/:eventId/guests/:guestId" element={
                      <PermissionRoute permission="event_guests.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <GuestDetailPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/events/:eventId/guests/:guestId/edit" element={
                      <PermissionRoute permission="event_guests.update">
                        <Suspense fallback={<PageSkeleton />}>
                          <GuestEditPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/events/:eventId/checkin" element={
                      <PermissionRoute permission="event_checkins.create">
                        <Suspense fallback={<PageSkeleton />}>
                          <CheckinPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/events/:eventId/users" element={
                      <PermissionRoute permission="events.update">
                        <Suspense fallback={<PageSkeleton />}>
                          <EventUsersPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    {/* Finance Module Routes */}
                    <Route path="/finance" element={
                      <PermissionRoute permission="finance_accounts.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <FinanceDashboard />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/finance/dashboard" element={
                      <PermissionRoute permission="finance_accounts.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <FinanceDashboard />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/finance/accounts" element={
                      <PermissionRoute permission="finance_accounts.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <FinanceAccounts />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/finance/income" element={
                      <PermissionRoute permission="income_entries.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <IncomeEntries />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/finance/income/categories" element={
                      <PermissionRoute permission="income_categories.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <IncomeCategories />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/finance/expenses" element={
                      <PermissionRoute permission="expense_entries.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExpenseEntries />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/finance/expenses/categories" element={
                      <PermissionRoute permission="expense_categories.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExpenseCategories />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/finance/projects" element={
                      <PermissionRoute permission="finance_projects.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <FinanceProjects />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/finance/donors" element={
                      <PermissionRoute permission="donors.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <Donors />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/finance/documents" element={
                      <PermissionRoute permission="finance_documents.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <FinanceDocuments />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/finance/currencies" element={
                      <PermissionRoute permission="currencies.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <Currencies />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/finance/exchange-rates" element={
                      <PermissionRoute permission="exchange_rates.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ExchangeRates />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/finance/fees/dashboard" element={
                      <PermissionRoute permission="fees.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <FeeDashboard />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/finance/fees/structures" element={
                      <PermissionRoute permission="fees.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <FeeStructuresPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/finance/fees/assignments" element={
                      <PermissionRoute permission="fees.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <FeeAssignmentsPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/finance/fees/payments" element={
                      <PermissionRoute permission="fees.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <FeePaymentsPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/finance/fees/exceptions" element={
                      <PermissionRoute permission="fees.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <FeeExceptionsPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/finance/fees/reports" element={
                      <PermissionRoute permission="fees.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <FeeReportsPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/students/:id/fees" element={
                      <PermissionRoute permission="fees.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <StudentFeeStatementPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/finance/reports" element={
                      <PermissionRoute permission="finance_reports.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <FinanceReports />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/finance/settings" element={
                      <AnyPermissionRoute permissions={['currencies.read', 'income_categories.read', 'expense_categories.read', 'exchange_rates.read']}>
                        <Suspense fallback={<PageSkeleton />}>
                          <FinanceSettings />
                        </Suspense>
                      </AnyPermissionRoute>
                    } />

                    {/* Subscription routes - Accessible to ALL authenticated users (needed for expired subscriptions) */}
                    {/* CRITICAL: These routes must NOT require subscription.read permission because users with expired subscriptions need to access them */}
                    <Route path="/subscription" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <SubscriptionPage />
                      </Suspense>
                    } />
                    <Route path="/subscription/plans" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <PlansPage />
                      </Suspense>
                    } />
                    <Route path="/subscription/renew" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <RenewPage />
                      </Suspense>
                    } />
                    <Route path="/subscription/maintenance-fees" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <MaintenanceFeesPage />
                      </Suspense>
                    } />
                    <Route path="/subscription/license-fees" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <LicenseFeesPage />
                      </Suspense>
                    } />

                    {/* Catch-all route */}
                    <Route path="*" element={<NotFound />} />
                  </Route>
                  </Route>
                </Routes>
              </MaintenanceModeHandler>
            </ErrorBoundary>

          </BrowserRouter>
        </SchoolProvider>
      </AuthProvider>
    </TooltipProvider>
    {import.meta.env.DEV && import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS === 'true' && (
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    )}
  </QueryClientProvider>
);

export default App;
