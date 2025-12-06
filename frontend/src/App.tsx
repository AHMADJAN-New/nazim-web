import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import ErrorBoundary from "@/components/ErrorBoundary";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PersistentLayout } from "@/components/layout/PersistentLayout";

import { BrowserRouter, Routes, Route } from "react-router-dom";
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
  ScheduleSlotsManagement,
  TeacherSubjectAssignments,
  StaffTypesManagement,
  StaffList,
  Students,
  StudentAdmissions,
  StudentReport,
  StudentAdmissionsReport,
  StaffReport,
  HostelManagement,
  HostelReports,
  AttendancePage,
  AttendanceReports,
  AttendanceTotalsReports,
  UserManagement,
  UserProfile,
  UserSettings
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
                    {/* Admin routes */}
                    <Route path="/admin/users" element={
                      <PermissionRoute permission="users.read">
                        <Suspense fallback={<PageSkeleton />}>
                          <UserManagement />
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
