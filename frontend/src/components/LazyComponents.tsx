import React, { Suspense, lazy } from 'react';

import { PageSkeleton, DashboardSkeleton } from '@/components/ui/loading';

// Lazy load core pages for better code splitting
export const Dashboard = lazy(() => import('@/pages/Dashboard'));
export const OrganizationDashboard = lazy(() => import('@/pages/OrganizationDashboard'));
export const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
export const UserProfile = lazy(() => import('@/pages/UserProfile'));
export const UserSettings = lazy(() => import('@/pages/UserSettings'));
export const NotificationsPage = lazy(() => import('@/pages/Notifications'));

// Lazy load settings components
export const BuildingsManagement = lazy(() => import('@/components/settings/BuildingsManagement').then(module => ({ default: module.BuildingsManagement })));
export const RoomsManagement = lazy(() => import('@/components/settings/RoomsManagement').then(module => ({ default: module.RoomsManagement })));
export const OrganizationsManagement = lazy(() => import('@/components/settings/OrganizationsManagement').then(module => ({ default: module.OrganizationsManagement })));
export const ProfileManagement = lazy(() => import('@/components/settings/ProfileManagement').then(module => ({ default: module.ProfileManagement })));
export const PermissionsManagement = lazy(() => import('@/components/settings/PermissionsManagement').then(module => ({ default: module.PermissionsManagement })));
export const RolesManagement = lazy(() => import('@/components/settings/RolesManagement').then(module => ({ default: module.RolesManagement })));
export const UserPermissionsManagement = lazy(() => import('@/components/settings/UserPermissionsManagement').then(module => ({ default: module.UserPermissionsManagement })));
export const SchoolsManagement = lazy(() => import('@/components/settings/SchoolsManagement').then(module => ({ default: module.SchoolsManagement })));
export const ReportTemplatesManagement = lazy(() => import('@/components/settings/ReportTemplatesManagement').then(module => ({ default: module.ReportTemplatesManagement })));
export const ResidencyTypesManagement = lazy(() => import('@/components/settings/ResidencyTypesManagement').then(module => ({ default: module.ResidencyTypesManagement })));
export const AcademicYearsManagement = lazy(() => import('@/components/settings/AcademicYearsManagement').then(module => ({ default: module.AcademicYearsManagement })));
export const ActivityLogsPage = lazy(() => import('@/pages/settings/ActivityLogsPage').then(module => ({ default: module.default })));
export const ExamTypesPage = lazy(() => import('@/pages/settings/ExamTypesPage').then(module => ({ default: module.ExamTypesPage })));
export const ClassesManagement = lazy(() => import('@/components/settings/ClassesManagement').then(module => ({ default: module.ClassesManagement })));
export const SubjectsManagement = lazy(() => import('@/components/settings/SubjectsManagement').then(module => ({ default: module.SubjectsManagement })));
export const Exams = lazy(() => import('@/pages/Exams').then(module => ({ default: module.Exams })));
export const ExamEnrollment = lazy(() => import('@/pages/ExamEnrollment').then(module => ({ default: module.ExamEnrollment })));
export const ExamStudentEnrollment = lazy(() => import('@/pages/ExamStudentEnrollment').then(module => ({ default: module.ExamStudentEnrollment })));
export const ExamMarks = lazy(() => import('@/pages/ExamMarks').then(module => ({ default: module.ExamMarks })));
export const ExamReports = lazy(() => import('@/components/settings/ExamReports').then(module => ({ default: module.ExamReports })));
export const ExamClassesSubjectsPage = lazy(() => import('@/pages/ExamClassesSubjectsPage').then(module => ({ default: module.ExamClassesSubjectsPage })));
export const ExamTimetablePage = lazy(() => import('@/pages/ExamTimetablePage').then(module => ({ default: module.ExamTimetablePage })));
export const ExamReportsPage = lazy(() => import('@/pages/ExamReportsPage').then(module => ({ default: module.ExamReportsPage })));
export const ExamAttendancePage = lazy(() => import('@/pages/ExamAttendancePage'));
export const ExamRollNumbersPage = lazy(() => import('@/pages/ExamRollNumbersPage'));
export const ExamSecretNumbersPage = lazy(() => import('@/pages/ExamSecretNumbersPage'));
export const ExamNumberReportsPage = lazy(() => import('@/pages/ExamNumberReportsPage'));
export const GradesManagement = lazy(() => import('@/pages/GradesManagement'));
export const ExamReportsHub = lazy(() => import('@/pages/ExamReportsHub'));
export const ConsolidatedMarkSheet = lazy(() => import('@/pages/ConsolidatedMarkSheet'));
export const ClassSubjectMarkSheet = lazy(() => import('@/pages/ClassSubjectMarkSheet'));
export const StudentExamReport = lazy(() => import('@/pages/StudentExamReport'));
export const QuestionBank = lazy(() => import('@/pages/QuestionBank').then(module => ({ default: module.QuestionBank })));
export const ExamPaperTemplates = lazy(() => import('@/pages/ExamPaperTemplates'));
export const ExamPaperTemplateEdit = lazy(() => import('@/pages/ExamPaperTemplateEdit'));
export const ExamPaperPreview = lazy(() => import('@/pages/ExamPaperPreview').then(module => ({ default: module.ExamPaperPreview })));
export const ExamPaperPrintTracking = lazy(() => import('@/pages/ExamPaperPrintTracking'));
export const ScheduleSlotsManagement = lazy(() => import('@/components/settings/ScheduleSlotsManagement').then(module => ({ default: module.ScheduleSlotsManagement })));
export const TeacherSubjectAssignments = lazy(() => import('@/components/settings/TeacherSubjectAssignments').then(module => ({ default: module.TeacherSubjectAssignments })));
export const StaffTypesManagement = lazy(() => import('@/components/settings/StaffTypesManagement').then(module => ({ default: module.StaffTypesManagement })));
export const StaffList = lazy(() => import('@/pages/StaffList').then(module => ({ default: module.StaffList })));
export const Students = lazy(() => import('@/pages/Students').then(module => ({ default: module.Students })));
export const StudentsImport = lazy(() => import('@/pages/StudentsImport'));
export const StudentAdmissions = lazy(() => import('@/pages/StudentAdmissions').then(module => ({ default: module.StudentAdmissions })));
export const StudentReport = lazy(() => import('@/pages/StudentReport'));
export const StudentAdmissionsReport = lazy(() => import('@/pages/StudentAdmissionsReport'));
export const StudentHistoryPage = lazy(() => import('@/pages/students/StudentHistoryPage'));
export const StudentHistoryListPage = lazy(() => import('@/pages/students/StudentHistoryListPage'));
export const ShortTermCourses = lazy(() => import('@/pages/ShortTermCourses'));
export const CourseStudents = lazy(() => import('@/pages/CourseStudents'));
export const CourseStudentReports = lazy(() => import('@/pages/CourseStudentReports'));
export const CourseDashboard = lazy(() => import('@/pages/CourseDashboard'));
export const CourseAttendance = lazy(() => import('@/pages/CourseAttendance'));
export const CourseCertificates = lazy(() => import('@/pages/CourseCertificates'));
export const CertificateTemplates = lazy(() => import('@/pages/CertificateTemplates'));
export const IdCardTemplates = lazy(() => import('@/pages/IdCardTemplates'));
export const IdCardAssignment = lazy(() => import('@/pages/IdCardAssignment'));
export const IdCardExport = lazy(() => import('@/pages/IdCardExport'));
export const GraduationDashboard = lazy(() => import('@/pages/graduation/GraduationDashboard'));
export const GraduationBatchesPage = lazy(() => import('@/pages/graduation/GraduationBatchesPage'));
export const GraduationBatchDetailPage = lazy(() => import('@/pages/graduation/GraduationBatchDetailPage'));
export const CertificateTemplatesV2Page = lazy(() => import('@/pages/graduation/CertificateTemplatesPage'));
export const GraduationCertificateTemplates = lazy(() => import('@/pages/graduation/GraduationCertificateTemplates'));
export const IssuedCertificatesPage = lazy(() => import('@/pages/graduation/IssuedCertificatesPage'));
export const CourseDocuments = lazy(() => import('@/pages/CourseDocuments'));
export const ExamDocuments = lazy(() => import('@/pages/ExamDocuments'));
export const StaffReport = lazy(() => import('@/pages/StaffReport'));
export const HostelManagement = lazy(() => import('@/pages/HostelManagement').then(module => ({ default: module.HostelManagement })));
export const HostelReports = lazy(() => import('@/pages/HostelReports').then(module => ({ default: module.HostelReports })));
export const AttendancePage = lazy(() => import('@/pages/Attendance').then(module => ({ default: module.default })));
export const AttendanceMarking = lazy(() => import('@/pages/AttendanceMarking').then(module => ({ default: module.default })));
export const AttendanceReports = lazy(() => import('@/pages/AttendanceReports'));
export const AttendanceTotalsReports = lazy(() => import('@/pages/AttendanceTotalsReports'));
export const UserManagement = lazy(() => import('@/components/admin/UserManagement').then(module => ({ default: module.UserManagement })));
export const Library = lazy(() => import('@/pages/Library'));
export const LibraryCategories = lazy(() => import('@/pages/LibraryCategories'));
export const LibraryBooks = lazy(() => import('@/pages/LibraryBooks'));
export const LibraryDashboard = lazy(() => import('@/pages/LibraryDashboard'));
export const LibraryDistribution = lazy(() => import('@/pages/LibraryDistribution'));
export const LibraryReports = lazy(() => import('@/pages/LibraryReports'));
export const LeaveManagement = lazy(() => import('@/pages/LeaveManagement').then(module => ({ default: module.default })));
export const LeaveReports = lazy(() => import('@/pages/LeaveReports').then(module => ({ default: module.default })));
export const PhoneBook = lazy(() => import('@/pages/PhoneBook').then(module => ({ default: module.default })));
export const Assets = lazy(() => import('@/pages/Assets').then(module => ({ default: module.default })));
export const AssetsDashboard = lazy(() => import('@/pages/assets/AssetsDashboard'));
export const AssetAssignments = lazy(() => import('@/pages/AssetAssignments').then(module => ({ default: module.default })));
export const AssetReports = lazy(() => import('@/pages/AssetReports').then(module => ({ default: module.default })));
export const AssetCategories = lazy(() => import('@/pages/AssetCategories').then(module => ({ default: module.default })));
export const TranslationEditor = lazy(() => import('@/pages/TranslationEditor'));

// Finance Module
export const FinanceDashboard = lazy(() => import('@/pages/finance/FinanceDashboard'));
export const FinanceAccounts = lazy(() => import('@/pages/finance/FinanceAccounts'));
export const IncomeEntries = lazy(() => import('@/pages/finance/IncomeEntries'));
export const IncomeCategories = lazy(() => import('@/pages/finance/IncomeCategories'));
export const ExpenseEntries = lazy(() => import('@/pages/finance/ExpenseEntries'));
export const ExpenseCategories = lazy(() => import('@/pages/finance/ExpenseCategories'));
export const FinanceProjects = lazy(() => import('@/pages/finance/FinanceProjects'));
export const Donors = lazy(() => import('@/pages/finance/Donors'));
export const FinanceDocuments = lazy(() => import('@/pages/FinanceDocuments'));
export const Currencies = lazy(() => import('@/pages/finance/Currencies'));
export const ExchangeRates = lazy(() => import('@/pages/finance/ExchangeRates'));
export const FinanceReports = lazy(() => import('@/pages/finance/FinanceReports'));
export const FinanceSettings = lazy(() => import('@/pages/finance/FinanceSettings'));
export const FeeDashboard = lazy(() => import('@/pages/fees/FeeDashboard'));
export const FeeStructuresPage = lazy(() => import('@/pages/fees/FeeStructuresPage'));
export const FeeAssignmentsPage = lazy(() => import('@/pages/fees/FeeAssignmentsPage').then(module => ({ default: module.default })));
export const FeePaymentsPage = lazy(() => import('@/pages/fees/FeePaymentsPage'));
export const FeeExceptionsPage = lazy(() => import('@/pages/fees/FeeExceptionsPage'));
export const FeeReportsPage = lazy(() => import('@/pages/fees/FeeReportsPage'));
export const StudentFeeStatementPage = lazy(() => import('@/pages/fees/StudentFeeStatementPage'));
export const VerifyCertificate = lazy(() => import('@/pages/VerifyCertificate'));

// Document Management System
export const DmsDashboard = lazy(() => import('@/pages/dms/DmsDashboard'));
export const IncomingDocuments = lazy(() => import('@/pages/dms/IncomingDocuments'));
export const OutgoingDocuments = lazy(() => import('@/pages/dms/OutgoingDocuments'));
export const IssueLetter = lazy(() => import('@/pages/dms/IssueLetter'));
export const TemplatesPage = lazy(() => import('@/pages/dms/TemplatesPage'));
export const LetterheadsPage = lazy(() => import('@/pages/dms/LetterheadsPage'));
export const LetterTypesPage = lazy(() => import('@/pages/dms/LetterTypesPage'));
export const DepartmentsPage = lazy(() => import('@/pages/dms/DepartmentsPage'));
export const ArchiveSearchPage = lazy(() => import('@/pages/dms/ArchiveSearch'));
export const DmsReportsPage = lazy(() => import('@/pages/dms/DmsReports'));
export const DmsSettingsPage = lazy(() => import('@/pages/dms/DmsSettings'));

// Events Module
export const EventTypesPage = lazy(() => import('@/pages/events/EventTypesPage'));
export const EventsPage = lazy(() => import('@/pages/events/EventsPage'));
export const EventDetailPage = lazy(() => import('@/pages/events/EventDetailPage'));
export const GuestsPage = lazy(() => import('@/pages/events/GuestsPage'));
export const GuestAddPage = lazy(() => import('@/pages/events/GuestAddPage'));
export const GuestDetailPage = lazy(() => import('@/pages/events/GuestDetailPage'));
export const GuestEditPage = lazy(() => import('@/pages/events/GuestEditPage'));
export const CheckinPage = lazy(() => import('@/pages/events/CheckinPage'));
export const EventUsersPage = lazy(() => import('@/pages/events/EventUsersPage'));

// Subscription pages
export const SubscriptionPage = lazy(() => import('@/pages/subscription/SubscriptionPage').then(module => ({ default: module.default })));
export const PlansPage = lazy(() => import('@/pages/subscription/PlansPage').then(module => ({ default: module.default })));
export const RenewPage = lazy(() => import('@/pages/subscription/RenewPage').then(module => ({ default: module.default })));
export const MaintenanceFeesPage = lazy(() => import('@/pages/subscription/MaintenanceFeesPage').then(module => ({ default: module.default })));
export const LicenseFeesPage = lazy(() => import('@/pages/subscription/LicenseFeesPage').then(module => ({ default: module.default })));

// Subscription admin pages
export const SubscriptionAdminDashboard = lazy(() => import('@/platform/pages/admin/SubscriptionAdminDashboard').then(module => ({ default: module.default })));
export const PendingActionsPage = lazy(() => import('@/platform/pages/admin/PendingActionsPage').then(module => ({ default: module.default })));
export const AllSubscriptionsPage = lazy(() => import('@/platform/pages/admin/AllSubscriptionsPage').then(module => ({ default: module.default })));
export const PlansManagement = lazy(() => import('@/platform/pages/admin/PlansManagement').then(module => ({ default: module.default })));
export const OrganizationSubscriptionDetail = lazy(() => import('@/platform/pages/admin/OrganizationSubscriptionDetail').then(module => ({ default: module.default })));
export const PlatformSettings = lazy(() => import('@/platform/pages/admin/PlatformSettings').then(module => ({ default: module.default })));
export const ContactMessagesManagement = lazy(() => import('@/platform/pages/admin/ContactMessagesManagement').then(module => ({ default: module.default })));
export const LoginAuditPage = lazy(() => import('@/platform/pages/admin/LoginAuditPage').then(module => ({ default: module.default })));
export const HelpCenterManagement = lazy(() => import('@/platform/pages/admin/HelpCenterManagement').then(module => ({ default: module.default })));
export const MaintenanceHistory = lazy(() => import('@/platform/pages/admin/MaintenanceHistory').then(module => ({ default: module.default })));
export const TranslationsManagement = lazy(() => import('@/platform/pages/admin/TranslationsManagement').then(module => ({ default: module.default })));
export const RenewalReviewPage = lazy(() => import('@/pages/subscription/admin/RenewalReviewPage').then(module => ({ default: module.default })));
export const DiscountCodesManagement = lazy(() => import('@/pages/subscription/admin/DiscountCodesManagement').then(module => ({ default: module.default })));
export const MaintenanceFeesManagement = lazy(() => import('@/platform/pages/admin/MaintenanceFeesManagement').then(module => ({ default: module.default })));
export const LicenseFeesManagement = lazy(() => import('@/platform/pages/admin/LicenseFeesManagement').then(module => ({ default: module.default })));
export const OrganizationRevenueHistory = lazy(() => import('@/platform/pages/admin/OrganizationRevenueHistory').then(module => ({ default: module.default })));
export const PlanRequestsPage = lazy(() => import('@/platform/pages/admin/PlanRequestsPage').then(module => ({ default: module.default })));
export const DesktopLicenseGeneration = lazy(() => import('@/platform/pages/admin/DesktopLicenseGeneration').then(module => ({ default: module.default })));
export const DesktopReleasesManagement = lazy(() => import('@/platform/pages/admin/DesktopReleasesManagement').then(module => ({ default: module.default })));
export const LandingOffersPage = lazy(() => import('@/platform/pages/admin/LandingOffersPage').then(module => ({ default: module.default })));

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
