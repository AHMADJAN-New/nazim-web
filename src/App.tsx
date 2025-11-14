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
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleBasedRedirect from "./components/RoleBasedRedirect";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

// Lazy-loaded components with optimized loading
import { 
  Dashboard, AttendancePage, StaffPage, SuperAdminPage, 
  SchoolAdminPage, PendingApprovalPage, ResetPasswordPage, ClassesPage, 
  HifzProgressPage, StudentTimetablePage, SubjectsPage, TimetablePage, 
  AssetsPage, AnnouncementsPage, CommunicationPage, EventsPage, MessagingPage,
  ExamEnrolledStudentsReportsPage, ExamEnrollmentPage, ExamPaperGeneratorPage,
  ExamSetupPage, ExamsPage, OMRScanningPage, ReportCardsPage, ResultsEntryPage,
  RollNumberAssignmentPage, DonationsPage, FinancePage, PaymentsPage,
  HostelAttendancePage, HostelPage, RoomManagementPage, StudentAssignmentPage,
  LibraryPage, ReportsPage, SettingsPage, AcademicSettingsPage,
  AppearanceSettingsPage, CommunicationSettingsPage, FinancialSettingsPage,
  SchoolInfoPage, SystemPreferencesPage, AdmissionsPage, BulkImportPage,
  IdCardPage, StudentsPage, DashboardSkeleton, PageSkeleton,
  ParentChildrenPage, ParentAttendancePage, ParentResultsPage, ParentFeesPage,
  ParentMessagesPage, ParentAnnouncementsPage, ParentEventsPage,
  TeacherClassesPortalPage
} from "@/components/LazyComponents";

// Optimized QueryClient with better caching and performance settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
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
        <BrowserRouter>
          <SidebarProvider>
            <ErrorBoundary>
              <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/redirect" element={<ProtectedRoute><RoleBasedRedirect /></ProtectedRoute>} />
            <Route path="/pending-approval" element={<ProtectedRoute><PendingApprovalPage /></ProtectedRoute>} />
            
            {/* Protected routes with persistent layout */}
            <Route element={<ProtectedRoute><PersistentLayout /></ProtectedRoute>}>
              {/* Dashboard with optimized loading */}
              <Route path="/dashboard" element={
                <Suspense fallback={<DashboardSkeleton />}>
                  <Dashboard />
                </Suspense>
              } />
            
              {/* Students routes */}
              <Route path="/students" element={
                <Suspense fallback={<PageSkeleton />}>
                  <StudentsPage />
                </Suspense>
              } />
              <Route path="/students/admissions" element={
                <Suspense fallback={<PageSkeleton />}>
                  <AdmissionsPage />
                </Suspense>
              } />
              <Route path="/students/import" element={
                <Suspense fallback={<PageSkeleton />}>
                  <BulkImportPage />
                </Suspense>
              } />
              <Route path="/students/id-cards" element={
                <Suspense fallback={<PageSkeleton />}>
                  <IdCardPage />
                </Suspense>
              } />
              
              {/* Academic routes */}
              <Route path="/academic/classes" element={
                <Suspense fallback={<PageSkeleton />}>
                  <ClassesPage />
                </Suspense>
              } />
              <Route path="/academic/subjects" element={
                <Suspense fallback={<PageSkeleton />}>
                  <SubjectsPage />
                </Suspense>
              } />
              <Route path="/academic/timetable" element={
                <Suspense fallback={<PageSkeleton />}>
                  <TimetablePage />
                </Suspense>
              } />
              <Route path="/academic/student-timetable" element={
                <Suspense fallback={<PageSkeleton />}>
                  <StudentTimetablePage />
                </Suspense>
              } />
              <Route path="/academic/hifz-progress" element={
                <Suspense fallback={<PageSkeleton />}>
                  <HifzProgressPage />
                </Suspense>
              } />
              
              {/* Exams routes */}
              <Route path="/exams/*" element={
                <Suspense fallback={<PageSkeleton />}>
                  <ExamsPage />
                </Suspense>
              } />
            <Route path="/exams/setup" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <ExamSetupPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/exams/results" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <ResultsEntryPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/exams/reports" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <ReportCardsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/exams/enrollment" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <ExamEnrollmentPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/exams/roll-numbers" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <RollNumberAssignmentPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/exams/enrolled-reports" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <ExamEnrolledStudentsReportsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/exams/paper-generator" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <ExamsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/exams/paper-generator/:examId" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <ExamPaperGeneratorPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/exams/omr-scanning" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <OMRScanningPage />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Finance routes */}
            <Route path="/finance/*" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <FinancePage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/finance/payments" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <PaymentsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/finance/donations" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <DonationsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Communication routes */}
            <Route path="/communication/*" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <CommunicationPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/communication/announcements" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <AnnouncementsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/communication/messages" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <MessagingPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/communication/events" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <EventsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Parent portal routes */}
            <Route path="/parent/children" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <ParentChildrenPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/parent/attendance" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <ParentAttendancePage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/parent/results" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <ParentResultsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/parent/fees" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <ParentFeesPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/parent/messages" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <ParentMessagesPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/parent/announcements" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <ParentAnnouncementsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/parent/events" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <ParentEventsPage />
                </Suspense>
              </ProtectedRoute>
            } />

            {/* Teacher portal routes */}
            <Route path="/teacher/classes" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <TeacherClassesPortalPage />
                </Suspense>
              </ProtectedRoute>
            } />

            {/* Other routes */}
            <Route path="/attendance" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <AttendancePage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/staff" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <StaffPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/hostel/*" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <HostelPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/hostel/rooms" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <RoomManagementPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/hostel/students" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <StudentAssignmentPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/hostel/attendance" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <HostelAttendancePage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/library" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <LibraryPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/assets" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <AssetsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/assets/management" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <AssetsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/assets/categories" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <AssetsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/assets/maintenance" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <AssetsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/assets/reports" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <AssetsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/assets/requests" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <AssetsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/assets/audit" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <AssetsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <ReportsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Settings routes */}
            <Route path="/settings" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <SettingsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/settings/school-info" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <SchoolInfoPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/settings/academic" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <AcademicSettingsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/settings/system" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <SystemPreferencesPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/settings/appearance" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <AppearanceSettingsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/settings/communication" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <CommunicationSettingsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/settings/financial" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <FinancialSettingsPage />
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Admin routes */}
            <Route path="/super-admin" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <SuperAdminPage />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/school-admin" element={
              <ProtectedRoute>
                <Suspense fallback={<PageSkeleton />}>
                  <SchoolAdminPage />
                </Suspense>
              </ProtectedRoute>
            } />
            
            </Route>
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
          </SidebarProvider>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
    {import.meta.env.DEV && import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS === 'true' && (
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    )}
  </QueryClientProvider>
);

export default App;
