
# Translation Usage Analysis Report

## Summary
- Total files analyzed: 324
- Files using translations: 83
- Files NOT using translations: 241
- Files with hardcoded strings: 155

## Files NOT Using Translations (241 files)

- components/admin/AuthMonitoringDashboard.tsx
- components/admin/SecurityMonitoringDashboard.tsx
- components/admin/UserManagement.tsx
- components/assets/AssetListTab.tsx
- components/assets/AssetManagement.tsx
- components/dashboard/StatsCard.tsx
- components/data-table/data-table-advanced-toolbar.tsx
- components/data-table/data-table-column-header.tsx
- components/data-table/data-table-filter-list.tsx
- components/data-table/data-table-sort-list.tsx
- components/data-table/data-table-toolbar.tsx
- components/data-table/data-table.tsx
- components/ErrorBoundary.tsx
- components/HostelPermissionGuard.tsx
- components/layout/MainLayout.tsx
- components/LazyComponents.tsx
- components/PermissionGuard.tsx
- components/PermissionRoute.tsx
- components/ProtectedRoute.tsx
- components/short-term-courses/AssignToCourseDialog.tsx
- components/short-term-courses/CertificatePdfGenerator.tsx
- components/short-term-courses/CourseDocumentsDialog.tsx
- components/short-term-courses/CourseStudentDetailsPanel.tsx
- components/short-term-courses/CourseStudentFormDialog.tsx
- components/short-term-courses/EnrollFromMainDialog.tsx
- components/short-term-courses/index.ts
- components/short-term-courses/ShortTermCourseFormDialog.tsx
- components/ui/accordion.tsx
- components/ui/alert-dialog.tsx
- components/ui/alert.tsx
- components/ui/aspect-ratio.tsx
- components/ui/avatar.tsx
- components/ui/badge.tsx
- components/ui/breadcrumb.tsx
- components/ui/button.tsx
- components/ui/calendar.tsx
- components/ui/card.tsx
- components/ui/carousel.tsx
- components/ui/chart.tsx
- components/ui/checkbox.tsx
- components/ui/collapsible.tsx
- components/ui/combobox.tsx
- components/ui/command.tsx
- components/ui/context-menu.tsx
- components/ui/drawer.tsx
- components/ui/dropdown-menu.tsx
- components/ui/form.tsx
- components/ui/hover-card.tsx
- components/ui/input-otp.tsx
- components/ui/input.tsx
- components/ui/label.tsx
- components/ui/loading.tsx
- components/ui/menubar.tsx
- components/ui/navigation-menu.tsx
- components/ui/pagination.tsx
- components/ui/popover.tsx
- components/ui/progress.tsx
- components/ui/radio-group.tsx
- components/ui/resizable.tsx
- components/ui/scroll-area.tsx
- components/ui/select.tsx
- components/ui/separator.tsx
- components/ui/sheet.tsx
- components/ui/sidebar.tsx
- components/ui/skeleton.tsx
- components/ui/slider.tsx
- components/ui/sonner.tsx
- components/ui/switch.tsx
- components/ui/tabs.tsx
- components/ui/textarea.tsx
- components/ui/toast.tsx
- components/ui/toaster.tsx
- components/ui/toggle-group.tsx
- components/ui/toggle.tsx
- components/ui/tooltip.tsx
- components/ui/use-toast.ts
- examples/PaginationExample.tsx
- hooks/use-data-table.ts
- hooks/use-mobile.tsx
- hooks/use-toast.ts
- hooks/useAcademicYears.tsx
- hooks/useAccessibleOrganizations.ts
- hooks/useAssetCategories.tsx
- hooks/useAssets.tsx
- hooks/useAttendanceTotalsReport.tsx
- hooks/useAuth.tsx
- hooks/useBuildings.tsx
- hooks/useCertificateTemplates.tsx
- hooks/useClasses.tsx
- hooks/useCourseAttendance.tsx
- hooks/useCourseDocuments.tsx
- hooks/useCourseStudentDisciplineRecords.tsx
- hooks/useCourseStudents.tsx
- hooks/useDashboardStats.tsx
- hooks/useHostel.tsx
- hooks/useLandingStats.ts
- hooks/useLibrary.tsx
- hooks/useLibraryCategories.tsx
- hooks/useNotifications.tsx
- hooks/useOrganizations.tsx
- hooks/usePagination.ts
- hooks/usePermissions.tsx
- hooks/useProfiles.tsx
- hooks/useRecentActivities.tsx
- hooks/useReportTemplates.tsx
- hooks/useResidencyTypes.tsx
- hooks/useRooms.tsx
- hooks/useScheduleSlots.tsx
- hooks/useSchools.tsx
- hooks/useSecureAuth.tsx
- hooks/useShortTermCourses.tsx
- hooks/useStaff.tsx
- hooks/useStudentAdmissionReport.tsx
- hooks/useStudentAdmissions.tsx
- hooks/useStudentAutocomplete.tsx
- hooks/useStudentDuplicateCheck.tsx
- hooks/useStudentPictureUpload.tsx
- hooks/useStudents.tsx
- hooks/useSubjects.tsx
- hooks/useSystemSettings.tsx
- hooks/useTeacherSubjectAssignments.tsx
- hooks/useTimetables.tsx
- hooks/useUpcomingEvents.tsx
- hooks/useUserRole.tsx
- hooks/useUsers.tsx
- lib/accessibility.tsx
- lib/api/client.ts
- lib/auth-helpers.ts
- lib/console-replacer.ts
- lib/i18n.ts
- lib/logger.ts
- lib/performance.ts
- lib/pwa.ts
- lib/reporting/branding.ts
- lib/reporting/excelExport.ts
- lib/reporting/index.ts
- lib/reporting/pdfExport.ts
- lib/retry.ts
- lib/security-core.ts
- lib/security-utils.ts
- lib/security.ts
- lib/studentProfilePdf.ts
- lib/timetableExport.ts
- lib/timetablePdfExport.ts
- lib/timetableSolver.ts
- lib/translations/ar.ts
- lib/translations/en.ts
- lib/translations/fa.ts
- lib/translations/importExport.ts
- lib/translations/ps.ts
- lib/translations/utils.ts
- lib/utils/passwordValidation.ts
- lib/utils.ts
- lib/validations/common.ts
- lib/validations/disciplineRecord.ts
- lib/validations/document.ts
- lib/validations/educationalHistory.ts
- lib/validations/fileUpload.ts
- lib/validations/index.ts
- lib/validations/passwordChange.ts
- lib/validations/student.ts
- lib/validations/timetable.ts
- mappers/academicYearMapper.ts
- mappers/assetMapper.ts
- mappers/attendanceMapper.ts
- mappers/attendanceTotalsReportMapper.ts
- mappers/buildingMapper.ts
- mappers/classMapper.ts
- mappers/courseStudentMapper.ts
- mappers/hostelMapper.ts
- mappers/leaveMapper.ts
- mappers/organizationMapper.ts
- mappers/permissionMapper.ts
- mappers/profileMapper.ts
- mappers/roomMapper.ts
- mappers/scheduleSlotMapper.ts
- mappers/schoolMapper.ts
- mappers/shortTermCourseMapper.ts
- mappers/staffMapper.ts
- mappers/studentAdmissionMapper.ts
- mappers/studentAdmissionReportMapper.ts
- mappers/studentMapper.ts
- mappers/subjectMapper.ts
- mappers/timetableMapper.ts
- mappers/userMapper.ts
- pages/AssetAssignments.tsx
- pages/AssetReports.tsx
- pages/HostelReports.tsx
- pages/LeaveReports.tsx
- RootBootstrap.tsx
- test/setup.ts
- types/announcement.ts
- types/api/academicYear.ts
- types/api/asset.ts
- types/api/attendance.ts
- types/api/attendanceTotalsReport.ts
- types/api/building.ts
- types/api/class.ts
- types/api/courseStudent.ts
- types/api/hostel.ts
- types/api/leaveRequest.ts
- types/api/organization.ts
- types/api/permission.ts
- types/api/profile.ts
- types/api/room.ts
- types/api/scheduleSlot.ts
- types/api/school.ts
- types/api/shortTermCourse.ts
- types/api/staff.ts
- types/api/student.ts
- types/api/studentAdmission.ts
- types/api/studentAdmissionReport.ts
- types/api/subject.ts
- types/api/timetable.ts
- types/api/user.ts
- types/auth.ts
- types/domain/academicYear.ts
- types/domain/asset.ts
- types/domain/attendance.ts
- types/domain/attendanceTotalsReport.ts
- types/domain/building.ts
- types/domain/class.ts
- types/domain/courseStudent.ts
- types/domain/hostel.ts
- types/domain/leave.ts
- types/domain/library.ts
- types/domain/organization.ts
- types/domain/permission.ts
- types/domain/profile.ts
- types/domain/room.ts
- types/domain/scheduleSlot.ts
- types/domain/school.ts
- types/domain/shortTermCourse.ts
- types/domain/staff.ts
- types/domain/student.ts
- types/domain/studentAdmission.ts
- types/domain/studentAdmissionReport.ts
- types/domain/subject.ts
- types/domain/timetable.ts
- types/domain/user.ts
- types/pagination.ts

## Files with Hardcoded Strings (155 files)

### components/admin/AuthMonitoringDashboard.tsx
```
>Total Events<
>Registration Errors<
>Resolved Issues<
```

### components/admin/SecurityMonitoringDashboard.tsx
```
>Total Events<
>Failed Logins<
>Authentication failures<
```

### components/admin/UserManagement.tsx
```
placeholder="Search by name, email, or role..."
placeholder="All Roles"
placeholder="All Statuses"
```

### components/assets/AssetAssignmentsTab.tsx
```
placeholder="Filter by status"
placeholder="Select asset"
placeholder="Select assignee"
```

### components/assets/AssetListTab.tsx
```
alt="QR Code"
title="View Details"
title="Print Label"
```

### components/assets/AssetMaintenanceTab.tsx
```
title="Mark as Completed"
placeholder="Filter by status"
placeholder="Search and select asset..."
```

### components/assets/AssetManagement.tsx
```
placeholder="Search assets by name, tag, or serial"
placeholder="Filter by status"
placeholder="Select assignee"
```

### components/assets/AssetReportsTab.tsx
```
placeholder="Filter by status"
placeholder="Filter by category"
>Analytics and insights for your assets<
```

### components/certificates/CertificateLayoutEditor.tsx
```
alt="Certificate Background"
placeholder="Certificate of Completion"
placeholder="Leave empty to use course name only"
```

### components/data-table/data-table-toolbar.tsx
```
>Clear search<
```

### components/ErrorBoundary.tsx
```
>Application Error<
>Technical Details<
>Something went wrong<
```

### components/HostelPermissionGuard.tsx
```
>Access Denied<
```

### components/layout/AppHeader.tsx
```
placeholder="Search students, classes, teachers..."
>Select Language<
>Notifications<
```

### components/layout/AppSidebar.tsx
```
>School Management<
>Main Navigation<
"Buildings Management"
```

### components/navigation/SmartSidebar.tsx
```
>School Management<
>Main Navigation<
"Attendance Reports"
```

### components/PermissionGuard.tsx
```
>Access Denied<
```

### components/ProtectedRoute.tsx
```
>Organization Required<
```

### components/settings/AcademicYearsManagement.tsx
```
placeholder="Filter by status"
title="Delete academic year"
'Name is required'
```

### components/settings/BuildingsManagement.tsx
```
'Building name is required'
'School is required'
```

### components/settings/ClassesManagement.tsx
```
placeholder="Filter by grade"
placeholder="e.g., 1, 2, 3"
placeholder="e.g., Section A, Section B"
```

### components/settings/OrganizationsManagement.tsx
```
>No settings<
'Organization name is required'
'Slug is required'
```

### components/settings/PermissionsManagement.tsx
```
'Failed to create permission'
```

### components/settings/ReportTemplatesManagement.tsx
```
'Template name is required'
'Template type is required'
'School is required'
```

### components/settings/ResidencyTypesManagement.tsx
```
'Name is required'
'Code is required'
```

### components/settings/RolesManagement.tsx
```
'Role name is required'
```

### components/settings/RoomsManagement.tsx
```
'Room number is required'
'Building is required'
```

### components/settings/ScheduleSlotsManagement.tsx
```
placeholder="Select school"
>All Academic Years<
toast.error('Please fill in all required fields')
```

### components/settings/SchoolsManagement.tsx
```
placeholder="#0b0b56"
placeholder="#0056b3"
placeholder="#ff6b35"
```

### components/settings/StaffTypesManagement.tsx
```
'Name is required'
'Code is required'
```

### components/settings/SubjectsManagement.tsx
```
placeholder="Select a class"
placeholder="Mathematics"
placeholder="Subject description"
```

### components/settings/TeacherSubjectAssignments.tsx
```
'Choose subjects for each class'
```

### components/settings/UserPermissionsManagement.tsx
```
>Hostel Manager<
>Asset Manager<
```

### components/short-term-courses/AssignToCourseDialog.tsx
```
placeholder="Search by name, admission number, or phone..."
placeholder="Select course"
>Assign Student to New Course<
```

### components/short-term-courses/CertificatePdfGenerator.tsx
```
placeholder="Choose a certificate template..."
title="Certificate Preview"
>Certificate Number<
```

### components/short-term-courses/CourseDocumentsDialog.tsx
```
placeholder="Document title..."
placeholder="Optional description..."
>Upload New Document<
```

### components/short-term-courses/CourseStudentDetailsPanel.tsx
```
>Certificate<
>Registration Date<
>Completion Date<
```

### components/short-term-courses/CourseStudentFormDialog.tsx
```
placeholder="Select course"
placeholder="Auto-generated"
placeholder="Student full name"
```

### components/short-term-courses/EnrollFromMainDialog.tsx
```
placeholder="Select a course to enroll students"
placeholder="Search by name or admission number..."
>Registration Date<
```

### components/short-term-courses/ShortTermCourseFormDialog.tsx
```
placeholder="e.g., Advanced Web Development"
placeholder="Brief description of the course..."
placeholder="e.g., Ahmad Khan"
```

### components/staff/StaffProfile.tsx
```
placeholder="e.g., ID Card, Certificate, Contract"
placeholder="Optional description"
>Loading Staff Profile<
```

### components/students/StudentAutocompleteInput.tsx
```
'StudentAutocompleteInput'
```

### components/students/StudentDisciplineRecordsDialog.tsx
```
'Discipline Records'
'View and manage discipline records for'
'No discipline records'
```

### components/students/StudentDocumentsDialog.tsx
```
'Failed to download document'
'Failed to load document'
'Student Documents'
```

### components/students/StudentEducationalHistoryDialog.tsx
```
'Educational History'
'View and manage educational history for'
'No educational history recorded'
```

### components/students/StudentFormDialog.tsx
```
placeholder="SH-2024-001"
placeholder="Card-1001"
placeholder="Grade 7"
```

### components/students/StudentFormSections.tsx
```
'Personal Information'
'Admission Information'
'Address Information'
```

### components/students/StudentPictureUpload.tsx
```
aria-label="Student picture preview"
alt="Student"
"Student picture preview"
```

### components/students/StudentProfilePrint.tsx
```
alt="Guardian"
alt="Student"
'Student Personal Information'
```

### components/students/StudentProfileView.tsx
```
'Student Profile Sheet'
'Personal Information'
'Grandfather Name'
```

### components/timetable/SaveTimetableDialog.tsx
```
'Unknown error occurred'
```

### components/timetable/TeacherPreferencesDialog.tsx
```
'Teacher Preferences'
```

### components/timetable/TimetableGenerator.tsx
```
'Please select an academic year'
'Please select at least one class'
'Please select at least one period'
```

### components/ui/alert-dialog.tsx
```
"AlertDialogHeader"
"AlertDialogFooter"
```

### components/ui/alert.tsx
```
"AlertDescription"
```

### components/ui/breadcrumb.tsx
```
aria-label="breadcrumb"
"BreadcrumbSeparator"
"BreadcrumbElipssis"
```

### components/ui/carousel.tsx
```
>Previous slide<
"CarouselPrevious"
```

### components/ui/context-menu.tsx
```
"ContextMenuShortcut"
```

### components/ui/dropdown-menu.tsx
```
"DropdownMenuShortcut"
```

### components/ui/input-otp.tsx
```
"InputOTPSeparator"
```

### components/ui/pagination.tsx
```
aria-label="pagination"
aria-label="Go to previous page"
aria-label="Go to next page"
```

### components/ui/sidebar.tsx
```
aria-label="Toggle Sidebar"
title="Toggle Sidebar"
>Toggle Sidebar<
```

### examples/PaginationExample.tsx
```
'User not authenticated'
'Admission Number'
```

### hooks/useAcademicYears.tsx
```
toast.success('Academic year created successfully')
toast.success('Academic year updated successfully')
toast.success('Academic year deleted successfully')
```

### hooks/useAccessibleOrganizations.ts
```
'Unable to connect'
```

### hooks/useAssetCategories.tsx
```
toast.success('Category created successfully')
toast.success('Category updated successfully')
toast.success('Category deleted successfully')
```

### hooks/useAssets.tsx
```
toast.success('Asset saved successfully')
toast.success('Asset updated')
toast.success('Asset removed')
```

### hooks/useAttendance.tsx
```
'Organization required to create attendance session'
'Session is required'
'Session is required for scanning'
```

### hooks/useAttendanceTotalsReport.tsx
```
'User not authenticated'
```

### hooks/useBuildings.tsx
```
toast.success('Building created successfully')
toast.success('Building updated successfully')
toast.success('Building deleted successfully')
```

### hooks/useCertificateTemplates.tsx
```
toast.success('Certificate template created')
toast.success('Certificate template updated')
toast.success('Certificate template deleted')
```

### hooks/useClasses.tsx
```
toast.success('Class created successfully')
toast.success('Class updated successfully')
toast.success('Class deleted successfully')
```

### hooks/useCourseAttendance.tsx
```
toast.success('Attendance session created')
toast.success('Attendance session updated')
toast.success('Attendance session deleted')
```

### hooks/useCourseDocuments.tsx
```
toast.success('Document uploaded')
toast.success('Document deleted')
'Document uploaded'
```

### hooks/useCourseStudentDisciplineRecords.tsx
```
toast.success('Discipline record created')
toast.success('Discipline record updated')
toast.success('Discipline record deleted')
```

### hooks/useCourseStudents.tsx
```
toast.success('Course student saved')
toast.success('Course student updated')
toast.success('Course student deleted')
```

### hooks/useLeaveRequests.tsx
```
'Leave request created'
```

### hooks/useLibrary.tsx
```
toast.success('Book saved')
toast.error('Failed to save book')
toast.success('Book updated')
```

### hooks/useLibraryCategories.tsx
```
toast.success('Category created successfully')
toast.success('Category updated successfully')
toast.success('Category deleted successfully')
```

### hooks/useOrganizations.tsx
```
toast.success('Organization created successfully')
toast.success('Organization updated successfully')
toast.success('Organization deleted successfully')
```

### hooks/usePermissions.tsx
```
toast.success('Role created successfully')
toast.success('Role updated successfully')
toast.success('Role deleted successfully')
```

### hooks/useProfiles.tsx
```
toast.success('Profile updated successfully')
'Insufficient permissions to view profiles'
'User not authenticated'
```

### hooks/useReportTemplates.tsx
```
toast.success('Report template created successfully')
toast.success('Report template updated successfully')
toast.success('Report template deleted successfully')
```

### hooks/useResidencyTypes.tsx
```
toast.success('Residency type created successfully')
toast.success('Residency type updated successfully')
toast.success('Residency type deleted successfully')
```

### hooks/useRooms.tsx
```
toast.success('Room created successfully')
toast.success('Room updated successfully')
toast.success('Room deleted successfully')
```

### hooks/useScheduleSlots.tsx
```
toast.success('Schedule slot created successfully')
toast.success('Schedule slot updated successfully')
toast.success('Schedule slot deleted successfully')
```

### hooks/useSchools.tsx
```
toast.success('School created successfully')
toast.success('School updated successfully')
toast.success('School deleted successfully')
```

### hooks/useSecureAuth.tsx
```
toast.error('Invalid credentials. Please check your email and password.')
'Password must contain at least one uppercase letter'
'Password must contain at least one lowercase letter'
```

### hooks/useShortTermCourses.tsx
```
toast.success('Course saved successfully')
toast.success('Course updated')
toast.success('Course deleted')
```

### hooks/useStaff.tsx
```
toast.success('Staff member created successfully')
toast.success('Staff member updated successfully')
toast.success('Staff member deleted successfully')
```

### hooks/useStudentAdmissionReport.tsx
```
'User not authenticated'
```

### hooks/useStudentAdmissions.tsx
```
toast.success('Student admitted')
toast.success('Admission updated')
toast.success('Admission removed')
```

### hooks/useStudentPictureUpload.tsx
```
toast.success('Picture uploaded successfully')
'Picture uploaded successfully'
'Failed to upload picture'
```

### hooks/useStudents.tsx
```
toast.success('Student registered successfully')
toast.success('Student information updated')
toast.success('Student removed')
```

### hooks/useSubjects.tsx
```
toast.success('Subject created successfully')
toast.success('Subject updated successfully')
toast.success('Subject deleted successfully')
```

### hooks/useSystemSettings.tsx
```
toast.success('System settings updated successfully')
'System settings endpoint not yet implemented in Laravel API'
'Update system settings endpoint not yet implemented in Laravel API'
```

### hooks/useTeacherSubjectAssignments.tsx
```
toast.success('Teacher subject assignment created successfully')
toast.success('Teacher subject assignment updated successfully')
toast.success('Teacher subject assignment deleted successfully')
```

### hooks/useTimetables.tsx
```
toast.success('Timetable created successfully')
toast.success('Timetable updated successfully')
toast.success('Timetable deleted successfully')
```

### hooks/useUsers.tsx
```
toast.success('User created successfully')
toast.success('User updated successfully')
toast.success('User deleted successfully')
```

### lib/accessibility.tsx
```
'Screen reader announcement'
'Failed to move focus'
'Image missing alt text'
```

### lib/api/client.ts
```
'Validation failed'
```

### lib/auth-helpers.ts
```
'Profile not found'
'Access denied to this organization'
```

### lib/logger.ts
```
'ResizeObserver loop limit exceeded'
'Global error caught'
'Unhandled promise rejection'
```

### lib/performance.ts
```
'Performance mark not found'
'Failed to setup performance observers'
'High memory usage detected'
```

### lib/pwa.ts
```
'Service Worker not supported'
'Service Worker registered'
'New Service Worker available'
```

### lib/reporting/pdfExport.ts
```
'Generated by Nazim School Management System'
```

### lib/retry.ts
```
'Circuit breaker is OPEN'
'Circuit breaker rejected request'
'Circuit breaker closed after successful operation'
```

### lib/security-core.ts
```
'CSRF token generated'
'CSRF token validation failed'
'CSRF token cleared'
```

### lib/security-utils.ts
```
'Rate limit exceeded'
'Add lowercase letters'
'Add uppercase letters'
```

### lib/studentProfilePdf.ts
```
'Student Personal Information'
'Personal Information'
'Admission Information'
```

### lib/utils/passwordValidation.ts
```
'Password must contain at least one uppercase letter'
'Password must contain at least one lowercase letter'
'Password must contain at least one number'
```

### lib/validations/common.ts
```
'Invalid UUID format'
'Invalid email address'
```

### lib/validations/disciplineRecord.ts
```
'Incident date is required'
```

### lib/validations/educationalHistory.ts
```
'Institution name'
'End date must be after or equal to start date'
```

### lib/validations/fileUpload.ts
```
'File is required'
```

### lib/validations/passwordChange.ts
```
'Current password is required'
'Password must contain at least one uppercase letter'
'Password must contain at least one lowercase letter'
```

### lib/validations/student.ts
```
'Admission number'
'Grandfather name'
'Age must be realistic for school'
```

### lib/validations/timetable.ts
```
'Invalid class instance'
'Invalid schedule slot'
'At least one entry is required'
```

### main.tsx
```
'Service worker unregistered'
```

### mappers/classMapper.ts
```
'Class ID is required'
'Academic Year ID is required'
```

### pages/AssetCategories.tsx
```
placeholder="Search categories..."
placeholder="e.g., Electronics, Furniture, Vehicles"
placeholder="e.g., ELEC, FURN, VEH"
```

### pages/Attendance.tsx
```
'Please select at least one class and date'
'Select at least one class'
'No students match your search'
```

### pages/AttendanceReports.tsx
```
'Export feature coming soon'
'Failed to export'
'Attendance Reports'
```

### pages/AttendanceTotalsReports.tsx
```
'Attendance Totals Report'
'Invalid date range'
'Sessions analyzed'
```

### pages/AuthPage.tsx
```
toast.error('Network error: Unable to fetch organizations. Please check your connection and ensure the API server is running.')
'No organizations found in database'
'Error fetching organizations'
```

### pages/CertificateTemplates.tsx
```
title="Edit Layout"
placeholder="e.g., Course Completion Certificate"
placeholder="Select a course (optional)"
```

### pages/CourseAttendance.tsx
```
placeholder="Select a course..."
placeholder="Scan or type card number..."
placeholder="e.g., Morning Session, Day 1..."
```

### pages/CourseCertificates.tsx
```
placeholder="Name, admission #, or course"
title="Preview Certificate"
title="Download PDF"
```

### pages/CourseDashboard.tsx
```
placeholder="All courses"
>Course Reports<
>View and export detailed course reports<
```

### pages/CourseDocuments.tsx
```
>Upload documents to get started<
>Delete Document<
'Attendance Record'
```

### pages/CourseStudentReports.tsx
```
placeholder="All statuses"
placeholder="Search by name, admission #, father name, or guardian..."
aria-label="Select all"
```

### pages/CourseStudents.tsx
```
placeholder="All courses"
placeholder="Name or admission #"
>Student Roster<
```

### pages/Dashboard.tsx
```
"School buildings"
'Gender Distribution'
'Students by Class'
```

### pages/HostelManagement.tsx
```
placeholder="Filter by building"
placeholder="Search rooms, wardens, or students"
>No students assigned<
```

### pages/HostelReports.tsx
```
placeholder="Search by name, admission number, room, or building..."
placeholder="All buildings"
placeholder="All rooms"
```

### pages/Index.tsx
```
placeholder="john@school.edu"
placeholder="+92-300-1234567"
placeholder="Nazim"
```

### pages/LeaveManagement.tsx
```
placeholder="Scan card or type student code / admission number / card number, then press Enter..."
placeholder="Select class..."
Placeholder="Search classes..."
```

### pages/LeaveReports.tsx
```
placeholder="All statuses"
placeholder="Any student"
placeholder="Any class"
```

### pages/Library.tsx
```
>Add a new book to the library<
>Initial Copies<
>Assign Book<
```

### pages/LibraryBooks.tsx
```
placeholder="Search by title, author, ISBN, or book number..."
>All Categories<
>Book Information<
```

### pages/LibraryCategories.tsx
```
placeholder="Search categories..."
placeholder="e.g., Fiction, Non-Fiction, Reference"
placeholder="e.g., FIC, NON-FIC, REF"
```

### pages/LibraryDistribution.tsx
```
placeholder="Search by book title or copy code..."
placeholder="All Categories"
Placeholder="Search categories..."
```

### pages/LibraryReports.tsx
```
placeholder="Search by title, author, ISBN, or book number..."
placeholder="All Categories"
>Library Reports<
```

### pages/ResetPasswordPage.tsx
```
toast.error('Password reset endpoint not yet implemented in Laravel API')
toast.success('Password reset successfully! You can now sign in with your new password.')
'Password must contain at least one uppercase letter'
```

### pages/ShortTermCourses.tsx
```
placeholder="All statuses"
>Course List<
>Total Students<
```

### pages/StaffList.tsx
```
placeholder="Search by name, ID, email, or phone..."
placeholder="Status"
placeholder="School"
```

### pages/StaffReport.tsx
```
placeholder="Search by name, employee ID, staff code..."
placeholder="All Schools"
placeholder="All Status"
```

### pages/StudentAdmissions.tsx
```
>Total admissions<
>Across all residency types<
>Active students<
```

### pages/StudentAdmissionsReport.tsx
```
'Admissions Report'
'Show only boarding students'
'Invalid date range'
```

### pages/StudentReport.tsx
```
'Student Registration Report'
'View and export student registration data with detailed information'
'Personal Information'
```

### pages/Students.tsx
```
toast.error('Failed to generate student profile PDF.')
'Manage admissions with complete Afghan student records'
'Register Student'
```

### pages/TimetableGeneration.tsx
```
'Timetable Generation'
```

### pages/TranslationEditor.tsx
```
title="Add missing translation keys to all language files (uses English as placeholder)"
placeholder="Search translations by key or text..."
>Translation Key<
```

### pages/UserProfile.tsx
```
placeholder="https://example.com/avatar.jpg"
placeholder="Enter your full name"
placeholder="Enter your phone number"
```

### pages/UserSettings.tsx
```
placeholder="Enter your current password"
placeholder="Enter your new password"
placeholder="Confirm your new password"
```

### RootBootstrap.tsx
```
'ResizeObserver loop limit exceeded'
```


## Files Using Translations (83 files)

- App.tsx
- components/assets/AssetAssignmentsTab.tsx
- components/assets/AssetMaintenanceTab.tsx
- components/assets/AssetReportsTab.tsx
- components/certificates/CertificateLayoutEditor.tsx
- components/data-table/data-table-pagination.tsx
- components/layout/AppHeader.tsx
- components/layout/AppSidebar.tsx
- components/layout/PersistentLayout.tsx
- components/navigation/SmartSidebar.tsx
- components/settings/AcademicYearsManagement.tsx
- components/settings/BuildingsManagement.tsx
- components/settings/ClassesManagement.tsx
- components/settings/OrganizationsManagement.tsx
- components/settings/PermissionsManagement.tsx
- components/settings/ProfileManagement.tsx
- components/settings/ReportTemplatesManagement.tsx
- components/settings/ResidencyTypesManagement.tsx
- components/settings/RolesManagement.tsx
- components/settings/RoomsManagement.tsx

... and 63 more files
