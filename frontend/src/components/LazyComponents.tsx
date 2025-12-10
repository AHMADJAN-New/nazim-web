import React, { Suspense, lazy } from 'react';
import { PageSkeleton, DashboardSkeleton } from '@/components/ui/loading';

// Lazy load core pages for better code splitting
export const Dashboard = lazy(() => import('@/pages/Dashboard'));
export const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
export const UserProfile = lazy(() => import('@/pages/UserProfile'));
export const UserSettings = lazy(() => import('@/pages/UserSettings'));

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
export const QuestionBank = lazy(() => import('@/pages/QuestionBank').then(module => ({ default: module.QuestionBank })));
export const ExamPaperTemplates = lazy(() => import('@/pages/ExamPaperTemplates').then(module => ({ default: module.ExamPaperTemplates })));
export const ExamPaperPreview = lazy(() => import('@/pages/ExamPaperPreview').then(module => ({ default: module.ExamPaperPreview })));
export const ScheduleSlotsManagement = lazy(() => import('@/components/settings/ScheduleSlotsManagement').then(module => ({ default: module.ScheduleSlotsManagement })));
export const TeacherSubjectAssignments = lazy(() => import('@/components/settings/TeacherSubjectAssignments').then(module => ({ default: module.TeacherSubjectAssignments })));
export const StaffTypesManagement = lazy(() => import('@/components/settings/StaffTypesManagement').then(module => ({ default: module.StaffTypesManagement })));
export const StaffList = lazy(() => import('@/pages/StaffList').then(module => ({ default: module.StaffList })));
export const Students = lazy(() => import('@/pages/Students').then(module => ({ default: module.Students })));
export const StudentAdmissions = lazy(() => import('@/pages/StudentAdmissions').then(module => ({ default: module.StudentAdmissions })));
export const StudentReport = lazy(() => import('@/pages/StudentReport'));
export const StudentAdmissionsReport = lazy(() => import('@/pages/StudentAdmissionsReport'));
export const ShortTermCourses = lazy(() => import('@/pages/ShortTermCourses'));
export const CourseStudents = lazy(() => import('@/pages/CourseStudents'));
export const CourseStudentReports = lazy(() => import('@/pages/CourseStudentReports'));
export const CourseDashboard = lazy(() => import('@/pages/CourseDashboard'));
export const CourseAttendance = lazy(() => import('@/pages/CourseAttendance'));
export const CourseCertificates = lazy(() => import('@/pages/CourseCertificates'));
export const CertificateTemplates = lazy(() => import('@/pages/CertificateTemplates'));
export const CourseDocuments = lazy(() => import('@/pages/CourseDocuments'));
export const StaffReport = lazy(() => import('@/pages/StaffReport'));
export const HostelManagement = lazy(() => import('@/pages/HostelManagement').then(module => ({ default: module.HostelManagement })));
export const HostelReports = lazy(() => import('@/pages/HostelReports').then(module => ({ default: module.HostelReports })));
export const AttendancePage = lazy(() => import('@/pages/Attendance').then(module => ({ default: module.default })));
export const AttendanceReports = lazy(() => import('@/pages/AttendanceReports'));
export const AttendanceTotalsReports = lazy(() => import('@/pages/AttendanceTotalsReports'));
export const UserManagement = lazy(() => import('@/components/admin/UserManagement').then(module => ({ default: module.UserManagement })));
export const Library = lazy(() => import('@/pages/Library'));
export const LibraryCategories = lazy(() => import('@/pages/LibraryCategories'));
export const LibraryBooks = lazy(() => import('@/pages/LibraryBooks'));
export const LibraryDistribution = lazy(() => import('@/pages/LibraryDistribution'));
export const LibraryReports = lazy(() => import('@/pages/LibraryReports'));
export const LeaveManagement = lazy(() => import('@/pages/LeaveManagement').then(module => ({ default: module.default })));
export const LeaveReports = lazy(() => import('@/pages/LeaveReports').then(module => ({ default: module.default })));
export const Assets = lazy(() => import('@/pages/Assets').then(module => ({ default: module.default })));
export const AssetAssignments = lazy(() => import('@/pages/AssetAssignments').then(module => ({ default: module.default })));
export const AssetReports = lazy(() => import('@/pages/AssetReports').then(module => ({ default: module.default })));
export const AssetCategories = lazy(() => import('@/pages/AssetCategories').then(module => ({ default: module.default })));
export const TranslationEditor = lazy(() => import('@/pages/TranslationEditor'));

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