import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import ErrorBoundary from "@/components/ErrorBoundary";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PersistentLayout } from "@/components/layout/PersistentLayout";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import TimetableGeneration from "./pages/TimetableGeneration";

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
  ScheduleSlotsManagement,
  TeacherSubjectAssignments,
  StaffTypesManagement,
  StaffList,
  Students,
  StudentAdmissions,
  StudentReport,
  StudentAdmissionsReport,
  ShortTermCourses,
  CourseStudents,
  CourseStudentReports,
  CourseDashboard,
  CourseAttendance,
  CourseCertificates,
  CertificateTemplates,
  CourseDocuments,
  StaffReport,
  HostelManagement,
  HostelReports,
  AttendancePage,
  AttendanceReports,
  AttendanceTotalsReports,
  UserManagement,
  UserProfile,
  UserSettings,
  Library,
  LibraryCategories,
  LibraryBooks,
  LibraryDistribution,
  LibraryReports,
  LeaveManagement,
  LeaveReports,
  Assets,
  AssetAssignments,
  AssetReports,
  AssetCategories,
  TranslationEditor,
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
  FinanceReports,
  FinanceSettings
} from "@/components/LazyComponents";
import { PermissionGuard } from "@/components/PermissionGuard";
import { PermissionRoute } from "@/components/PermissionRoute";
import { HostelPermissionGuard } from "@/components/HostelPermissionGuard";

// Optimized QueryClient with better caching and performance settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000, // 30 minutes - data doesn't change often
      gcTime: 60 * 60 * 1000, // 1 hour (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
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
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <SidebarProvider>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />

                  {/* Protected routes with persistent layout */}
                  <Route element={<ProtectedRoute><PersistentLayout /></ProtectedRoute>}>
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
                    <Route path="/settings/translations" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <TranslationEditor />
                      </Suspense>
                    } />
                    <Route path="/staff" element={
                      <PermissionRoute permission="staff.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <StaffList />
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
                    <Route path="/certificate-templates" element={
                      <PermissionRoute permission="certificate_templates.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <CertificateTemplates />
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
                      <Suspense fallback={<DashboardSkeleton />}>
                        <DmsDashboard />
                      </Suspense>
                    } />
                    <Route path="/dms/incoming" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <IncomingDocuments />
                      </Suspense>
                    } />
                    <Route path="/dms/outgoing" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <OutgoingDocuments />
                      </Suspense>
                    } />
                    <Route path="/dms/issue-letter" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <IssueLetter />
                      </Suspense>
                    } />
                    <Route path="/dms/templates" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <TemplatesPage />
                      </Suspense>
                    } />
                    <Route path="/dms/letterheads" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <LetterheadsPage />
                      </Suspense>
                    } />
                    <Route path="/dms/letter-types" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <LetterTypesPage />
                      </Suspense>
                    } />
                    <Route path="/dms/departments" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <DepartmentsPage />
                      </Suspense>
                    } />
                    <Route path="/dms/archive" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <ArchiveSearchPage />
                      </Suspense>
                    } />
                    <Route path="/dms/reports" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <DmsReportsPage />
                      </Suspense>
                    } />
                    <Route path="/dms/settings" element={
                      <Suspense fallback={<PageSkeleton />}>
                        <DmsSettingsPage />
                      </Suspense>
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
                  </Route>

                  {/* Catch-all route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ErrorBoundary>
            </SidebarProvider>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
    {import.meta.env.DEV && import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS === 'true' && (
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    )}
  </QueryClientProvider>
);

export default App;
