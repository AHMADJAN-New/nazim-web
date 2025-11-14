import React, { Suspense, lazy } from 'react';
import { PageSkeleton, DashboardSkeleton } from '@/components/ui/loading';

// Lazy load all pages for better code splitting
export const Dashboard = lazy(() => import('@/pages/Dashboard'));
export const AttendancePage = lazy(() => import('@/pages/AttendancePage'));
export const StaffPage = lazy(() => import('@/pages/StaffPage'));
export const UserManagementPage = lazy(() => import('@/pages/UserManagementPage'));
export const SuperAdminPage = lazy(() => import('@/pages/SuperAdminPage'));
export const SchoolAdminPage = lazy(() => import('@/pages/SchoolAdminPage'));
export const PendingApprovalPage = lazy(() => import('@/pages/PendingApprovalPage'));
export const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));

// Academic pages
export const ClassesPage = lazy(() => import('@/pages/academic/ClassesPage'));
export const HifzProgressPage = lazy(() => import('@/pages/academic/HifzProgressPage'));
export const StudentTimetablePage = lazy(() => import('@/pages/academic/StudentTimetablePage'));
export const SubjectsPage = lazy(() => import('@/pages/academic/SubjectsPage'));
export const TimetablePage = lazy(() => import('@/pages/academic/TimetablePage'));

// Assets pages
export const AssetsPage = lazy(() => import('@/pages/assets/AssetsPage'));

// Communication pages
export const AnnouncementsPage = lazy(() => import('@/pages/communication/AnnouncementsPage'));
export const CommunicationPage = lazy(() => import('@/pages/communication/CommunicationPage'));
export const EventsPage = lazy(() => import('@/pages/communication/EventsPage'));
export const MessagingPage = lazy(() => import('@/pages/communication/MessagingPage'));

// Exam pages
export const ExamEnrolledStudentsReportsPage = lazy(() => import('@/pages/exams/ExamEnrolledStudentsReportsPage'));
export const ExamEnrollmentPage = lazy(() => import('@/pages/exams/ExamEnrollmentPage'));
export const ExamPaperGeneratorPage = lazy(() => import('@/pages/exams/ExamPaperGeneratorPage'));
export const ExamSetupPage = lazy(() => import('@/pages/exams/ExamSetupPage'));
export const ExamsPage = lazy(() => import('@/pages/exams/ExamsPage'));
export const OMRScanningPage = lazy(() => import('@/pages/exams/OMRScanningPage'));
export const ReportCardsPage = lazy(() => import('@/pages/exams/ReportCardsPage'));
export const ResultsEntryPage = lazy(() => import('@/pages/exams/ResultsEntryPage'));
export const RollNumberAssignmentPage = lazy(() => import('@/pages/exams/RollNumberAssignmentPage'));

// Finance pages
export const DonationsPage = lazy(() => import('@/pages/finance/DonationsPage'));
export const FinancePage = lazy(() => import('@/pages/finance/FinancePage'));
export const PaymentsPage = lazy(() => import('@/pages/finance/PaymentsPage'));

// Hostel pages
export const HostelAttendancePage = lazy(() => import('@/pages/hostel/HostelAttendancePage'));
export const HostelPage = lazy(() => import('@/pages/hostel/HostelPage'));
export const RoomManagementPage = lazy(() => import('@/pages/hostel/RoomManagementPage'));
export const StudentAssignmentPage = lazy(() => import('@/pages/hostel/StudentAssignmentPage'));

// Library pages
export const LibraryPage = lazy(() => import('@/pages/library/LibraryPage'));

// Reports pages
export const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'));

// Settings pages
export const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
export const AcademicSettingsPage = lazy(() => import('@/pages/settings/AcademicSettingsPage'));
export const AppearanceSettingsPage = lazy(() => import('@/pages/settings/AppearanceSettingsPage'));
export const CommunicationSettingsPage = lazy(() => import('@/pages/settings/CommunicationSettingsPage'));
export const FinancialSettingsPage = lazy(() => import('@/pages/settings/FinancialSettingsPage'));
export const SchoolInfoPage = lazy(() => import('@/pages/settings/SchoolInfoPage'));
export const SystemPreferencesPage = lazy(() => import('@/pages/settings/SystemPreferencesPage'));

// Students pages
export const AdmissionsPage = lazy(() => import('@/pages/students/AdmissionsPage'));
export const BulkImportPage = lazy(() => import('@/pages/students/BulkImportPage'));
export const IdCardPage = lazy(() => import('@/pages/students/IdCardPage'));
export const StudentsPage = lazy(() => import('@/pages/students/StudentsPage'));

// Parent portal pages
export const ParentChildrenPage = lazy(() => import('@/pages/parent/ChildrenPage'));
export const ParentAttendancePage = lazy(() => import('@/pages/parent/AttendancePage'));
export const ParentResultsPage = lazy(() => import('@/pages/parent/ResultsPage'));
export const ParentFeesPage = lazy(() => import('@/pages/parent/FeesPage'));
export const ParentMessagesPage = lazy(() => import('@/pages/parent/MessagesPage'));
export const ParentAnnouncementsPage = lazy(() => import('@/pages/parent/AnnouncementsPage'));
export const ParentEventsPage = lazy(() => import('@/pages/parent/EventsPage'));

// Teacher portal pages
export const TeacherClassesPortalPage = lazy(() => import('@/pages/teacher/ClassesPage'));

// Re-export loading components for backward compatibility
export { PageSkeleton, DashboardSkeleton } from '@/components/ui/loading';

// Higher-order component for lazy loading with custom skeleton
export const withLazyLoading = <T extends object>(
  Component: React.ComponentType<T>,
  LoadingSkeleton: React.ComponentType = PageSkeleton
) => {
  return (props: T) => (
    <Suspense fallback={<LoadingSkeleton />}>
      <Component {...props} />
    </Suspense>
  );
};