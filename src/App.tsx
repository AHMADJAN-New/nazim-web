import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import StudentsPage from "./pages/students/StudentsPage";
import AdmissionsPage from "./pages/students/AdmissionsPage";
import BulkImportPage from "./pages/students/BulkImportPage";
import AttendancePage from "./pages/AttendancePage";
import ClassesPage from "./pages/academic/ClassesPage";
import SubjectsPage from "./pages/academic/SubjectsPage";
import TimetablePage from "./pages/academic/TimetablePage";
import ExamsPage from "./pages/exams/ExamsPage";
import ExamSetupPage from "./pages/exams/ExamSetupPage";
import ResultsEntryPage from "./pages/exams/ResultsEntryPage";
import ReportCardsPage from "./pages/exams/ReportCardsPage";
import OMRScanningPage from "./pages/exams/OMRScanningPage";
import FinancePage from "./pages/finance/FinancePage";
import StaffPage from "./pages/StaffPage";
import HostelPage from "./pages/hostel/HostelPage";
import LibraryPage from "./pages/library/LibraryPage";
import AssetsPage from "./pages/assets/AssetsPage";
import CommunicationPage from "./pages/communication/CommunicationPage";
import ReportsPage from "./pages/reports/ReportsPage";
import SettingsPage from "./pages/settings/SettingsPage";
import IdCardPage from "./pages/students/IdCardPage";
import HifzProgressPage from "./pages/academic/HifzProgressPage";
import SuperAdminPage from "./pages/SuperAdminPage";
import SchoolAdminPage from "./pages/SchoolAdminPage";
import PendingApprovalPage from "./pages/PendingApprovalPage";
import RoleBasedRedirect from "./components/RoleBasedRedirect";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import ExamEnrollmentPage from "./pages/exams/ExamEnrollmentPage";
import PaymentsPage from "./pages/finance/PaymentsPage";
import DonationsPage from "./pages/finance/DonationsPage";
import RoomManagementPage from "./pages/hostel/RoomManagementPage";
import StudentAssignmentPage from "./pages/hostel/StudentAssignmentPage";
import HostelAttendancePage from "./pages/hostel/HostelAttendancePage";
import MessagingPage from "./pages/communication/MessagingPage";
import EventsPage from "./pages/communication/EventsPage";
import StudentTimetablePage from "./pages/academic/StudentTimetablePage";
import AnnouncementsPage from "./pages/communication/AnnouncementsPage";
import RollNumberAssignmentPage from "./pages/exams/RollNumberAssignmentPage";
import ExamEnrolledStudentsReportsPage from "./pages/exams/ExamEnrolledStudentsReportsPage";
import ExamPaperGeneratorPage from "./pages/exams/ExamPaperGeneratorPage";
import SchoolInfoPage from "./pages/settings/SchoolInfoPage";
import AcademicSettingsPage from "./pages/settings/AcademicSettingsPage";
import SystemPreferencesPage from "./pages/settings/SystemPreferencesPage";
import AppearanceSettingsPage from "./pages/settings/AppearanceSettingsPage";
import CommunicationSettingsPage from "./pages/settings/CommunicationSettingsPage";
import FinancialSettingsPage from "./pages/settings/FinancialSettingsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/redirect" element={<ProtectedRoute><RoleBasedRedirect /></ProtectedRoute>} />
            <Route path="/pending-approval" element={<ProtectedRoute><PendingApprovalPage /></ProtectedRoute>} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/students" element={
              <ProtectedRoute>
                <StudentsPage />
              </ProtectedRoute>
            } />
            <Route path="/students/admissions" element={
              <ProtectedRoute>
                <AdmissionsPage />
              </ProtectedRoute>
            } />
            <Route path="/students/import" element={
              <ProtectedRoute>
                <BulkImportPage />
              </ProtectedRoute>
            } />
            <Route path="/academic/subjects" element={
              <ProtectedRoute>
                <SubjectsPage />
              </ProtectedRoute>
            } />
            <Route path="/academic/timetable" element={
              <ProtectedRoute>
                <TimetablePage />
              </ProtectedRoute>
            } />
            <Route path="/exams/setup" element={
              <ProtectedRoute>
                <ExamSetupPage />
              </ProtectedRoute>
            } />
            <Route path="/exams/results" element={
              <ProtectedRoute>
                <ResultsEntryPage />
              </ProtectedRoute>
            } />
            <Route path="/exams/reports" element={
              <ProtectedRoute>
                <ReportCardsPage />
              </ProtectedRoute>
            } />
            <Route path="/exams/enrollment" element={
              <ProtectedRoute>
                <ExamEnrollmentPage />
              </ProtectedRoute>
            } />
            <Route path="/exams/roll-numbers" element={
              <ProtectedRoute>
                <RollNumberAssignmentPage />
              </ProtectedRoute>
            } />
            <Route path="/exams/enrolled-reports" element={
              <ProtectedRoute>
                <ExamEnrolledStudentsReportsPage />
              </ProtectedRoute>
            } />
            <Route path="/exams/paper-generator" element={
              <ProtectedRoute>
                <ExamsPage />
              </ProtectedRoute>
            } />
            <Route path="/exams/paper-generator/:examId" element={
              <ProtectedRoute>
                <ExamPaperGeneratorPage />
              </ProtectedRoute>
            } />
            
            {/* Finance specific routes */}
            <Route path="/finance/payments" element={
              <ProtectedRoute>
                <PaymentsPage />
              </ProtectedRoute>
            } />
            <Route path="/finance/donations" element={
              <ProtectedRoute>
                <DonationsPage />
              </ProtectedRoute>
            } />
            
            {/* Hostel specific routes */}
            <Route path="/hostel/rooms" element={
              <ProtectedRoute>
                <RoomManagementPage />
              </ProtectedRoute>
            } />
            <Route path="/hostel/students" element={
              <ProtectedRoute>
                <StudentAssignmentPage />
              </ProtectedRoute>
            } />
            <Route path="/hostel/attendance" element={
              <ProtectedRoute>
                <HostelAttendancePage />
              </ProtectedRoute>
            } />
            
            {/* Communication specific routes */}
            <Route path="/communication/announcements" element={
              <ProtectedRoute>
                <AnnouncementsPage />
              </ProtectedRoute>
            } />
            <Route path="/communication/messages" element={
              <ProtectedRoute>
                <MessagingPage />
              </ProtectedRoute>
            } />
            <Route path="/communication/events" element={
              <ProtectedRoute>
                <EventsPage />
              </ProtectedRoute>
            } />
            
            {/* Academic specific routes */}
            <Route path="/academic/student-timetable" element={
              <ProtectedRoute>
                <StudentTimetablePage />
              </ProtectedRoute>
            } />
            <Route path="/students/id-cards" element={
              <ProtectedRoute>
                <IdCardPage />
              </ProtectedRoute>
            } />
            <Route path="/attendance" element={
              <ProtectedRoute>
                <AttendancePage />
              </ProtectedRoute>
            } />
            <Route path="/academic/classes" element={
              <ProtectedRoute>
                <ClassesPage />
              </ProtectedRoute>
            } />
            <Route path="/academic/hifz-progress" element={
              <ProtectedRoute>
                <HifzProgressPage />
              </ProtectedRoute>
            } />
            <Route path="/exams/*" element={
              <ProtectedRoute>
                <ExamsPage />
              </ProtectedRoute>
            } />
            <Route path="/exams/omr-scanning" element={
              <ProtectedRoute>
                <OMRScanningPage />
              </ProtectedRoute>
            } />
            <Route path="/finance/*" element={
              <ProtectedRoute>
                <FinancePage />
              </ProtectedRoute>
            } />
            <Route path="/staff" element={
              <ProtectedRoute>
                <StaffPage />
              </ProtectedRoute>
            } />
            <Route path="/hostel/*" element={
              <ProtectedRoute>
                <HostelPage />
              </ProtectedRoute>
            } />
            <Route path="/library" element={
              <ProtectedRoute>
                <LibraryPage />
              </ProtectedRoute>
            } />
            <Route path="/assets" element={
              <ProtectedRoute>
                <AssetsPage />
              </ProtectedRoute>
            } />
            <Route path="/communication/*" element={
              <ProtectedRoute>
                <CommunicationPage />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/settings/school-info" element={
              <ProtectedRoute>
                <SchoolInfoPage />
              </ProtectedRoute>
            } />
            <Route path="/settings/academic" element={
              <ProtectedRoute>
                <AcademicSettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/settings/system" element={
              <ProtectedRoute>
                <SystemPreferencesPage />
              </ProtectedRoute>
            } />
            <Route path="/settings/appearance" element={
              <ProtectedRoute>
                <AppearanceSettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/settings/communication" element={
              <ProtectedRoute>
                <CommunicationSettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/settings/financial" element={
              <ProtectedRoute>
                <FinancialSettingsPage />
              </ProtectedRoute>
            } />
            
            {/* Assets specific routes */}
            <Route path="/assets/management" element={
              <ProtectedRoute>
                <AssetsPage />
              </ProtectedRoute>
            } />
            <Route path="/assets/categories" element={
              <ProtectedRoute>
                <AssetsPage />
              </ProtectedRoute>
            } />
            <Route path="/assets/maintenance" element={
              <ProtectedRoute>
                <AssetsPage />
              </ProtectedRoute>
            } />
            <Route path="/assets/reports" element={
              <ProtectedRoute>
                <AssetsPage />
              </ProtectedRoute>
            } />
            <Route path="/assets/requests" element={
              <ProtectedRoute>
                <AssetsPage />
              </ProtectedRoute>
            } />
            <Route path="/assets/audit" element={
              <ProtectedRoute>
                <AssetsPage />
              </ProtectedRoute>
            } />
            <Route path="/super-admin" element={
              <ProtectedRoute>
                <SuperAdminPage />
              </ProtectedRoute>
            } />
            <Route path="/school-admin" element={
              <ProtectedRoute>
                <SchoolAdminPage />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
