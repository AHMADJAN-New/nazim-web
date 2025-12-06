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
export const ScheduleSlotsManagement = lazy(() => import('@/components/settings/ScheduleSlotsManagement').then(module => ({ default: module.ScheduleSlotsManagement })));
export const TeacherSubjectAssignments = lazy(() => import('@/components/settings/TeacherSubjectAssignments').then(module => ({ default: module.TeacherSubjectAssignments })));
export const StaffTypesManagement = lazy(() => import('@/components/settings/StaffTypesManagement').then(module => ({ default: module.StaffTypesManagement })));
export const StaffList = lazy(() => import('@/pages/StaffList').then(module => ({ default: module.StaffList })));
export const Students = lazy(() => import('@/pages/Students').then(module => ({ default: module.Students })));
export const StudentAdmissions = lazy(() => import('@/pages/StudentAdmissions').then(module => ({ default: module.StudentAdmissions })));
export const StudentReport = lazy(() => import('@/pages/StudentReport'));
export const StudentAdmissionsReport = lazy(() => import('@/pages/StudentAdmissionsReport'));
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