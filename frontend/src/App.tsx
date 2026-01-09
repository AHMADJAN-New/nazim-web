import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

import ProtectedRoute from "@/components/ProtectedRoute";
import { PlatformAdminRoute } from "@/components/PlatformAdminRoute";
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
  SubscriptionAdminDashboard,
  PendingActionsPage,
  AllSubscriptionsPage,
  PlansManagement,
  OrganizationSubscriptionDetail,
  RenewalReviewPage,
  DiscountCodesManagement,
  PlatformSettings,
  TranslationsManagement,
  HelpCenterManagement,
  MaintenanceHistory
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
import { appCoreTour } from "@/onboarding";
import { TourProviderWrapper } from "@/components/TourProviderWrapper";
import { RouteToursHandler } from "@/components/RouteToursHandler";

// Optimized QueryClient with better caching and performance settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000, // 30 minutes - data doesn't change often
      gcTime: 60 * 60 * 1000, // 1 hour (formerly cacheTime)
      retry: (failureCount, error: { status?: number } | Error | unknown) => {
        // Don't retry on 4xx errors
        if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: false, // Don't refetch on mount if data is fresh
      refetchOnReconnect: false, // Don't refetch on reconnect (prevents sidebar disappearing)
    },
    mutations: {
      retry: 2,
    },
  },
});

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
            <SidebarProvider>
              <ErrorBoundary>
                <MaintenanceModeHandler>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/about" element={<AboutUs />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
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
                    <Route path="maintenance" element={<Navigate to="maintenance-history" replace />} />
                  </Route>

                  {/* Protected routes with persistent layout */}
                  <Route element={
                    <ProtectedRoute>
                      <PersistentLayout />
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
                    <Route path="/settings/report-templates" element={
                      <PermissionRoute permission="reports.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <ReportTemplatesManagement />
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
                      <PermissionRoute permission="currencies.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <FinanceSettings />
                        </Suspense>
                      </PermissionRoute>
                    } />

                    {/* Subscription routes - Only accessible to admin and organization_admin */}
                    <Route path="/subscription" element={
                      <PermissionRoute permission="subscription.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <SubscriptionPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/subscription/plans" element={
                      <PermissionRoute permission="subscription.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <PlansPage />
                        </Suspense>
                      </PermissionRoute>
                    } />
                    <Route path="/subscription/renew" element={
                      <PermissionRoute permission="subscription.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <RenewPage />
                        </Suspense>
                      </PermissionRoute>
                    } />

                  {/* Catch-all route */}
                  <Route path="*" element={<NotFound />} />
                  </Route>
                  </Routes>
                </MaintenanceModeHandler>
              </ErrorBoundary>
            </SidebarProvider>
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
