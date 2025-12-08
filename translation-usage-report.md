# Translation Key Usage Analysis Report

Generated: 2025-12-08T05:08:11.765Z

## Summary

- **Total Translation Keys**: 2205
- **Keys Used**: 1855 (84.1%)
- **Unused Keys**: 742 (33.7%)
- **Missing Keys**: 392
- **Files Needing Translation Work**: 118

## 🎯 Priority Pages Needing Translation Work

### Staff Management
- **Files**: 3
- **Missing Keys**: 13
- **Hardcoded Strings**: 75
- **Files**:
  - `hooks\useStaff.tsx` (7 missing keys, 3 hardcoded)
  - `pages\StaffList.tsx` (1 missing keys, 64 hardcoded)
  - `pages\StaffReport.tsx` (5 missing keys, 8 hardcoded)


### Attendance
- **Files**: 5
- **Missing Keys**: 12
- **Hardcoded Strings**: 63
- **Files**:
  - `hooks\useCourseAttendance.tsx` (5 missing keys, 1 hardcoded)
  - `pages\Attendance.tsx` (2 missing keys, 10 hardcoded)
  - `pages\AttendanceReports.tsx` (0 missing keys, 9 hardcoded)
  - `pages\AttendanceTotalsReports.tsx` (3 missing keys, 35 hardcoded)
  - `pages\CourseAttendance.tsx` (2 missing keys, 8 hardcoded)


### Leave Requests
- **Files**: 4
- **Missing Keys**: 6
- **Hardcoded Strings**: 45
- **Files**:
  - `hooks\useLeaveRequests.tsx` (4 missing keys, 0 hardcoded)
  - `mappers\leaveMapper.ts` (1 missing keys, 0 hardcoded)
  - `pages\LeaveManagement.tsx` (0 missing keys, 36 hardcoded)
  - `pages\LeaveReports.tsx` (1 missing keys, 9 hardcoded)


### Reports
- **Files**: 10
- **Missing Keys**: 72
- **Hardcoded Strings**: 158
- **Files**:
  - `components\settings\ReportTemplatesManagement.tsx` (3 missing keys, 10 hardcoded)
  - `pages\AttendanceReports.tsx` (0 missing keys, 9 hardcoded)
  - `pages\AttendanceTotalsReports.tsx` (3 missing keys, 35 hardcoded)
  - `pages\CourseStudentReports.tsx` (2 missing keys, 15 hardcoded)
  - `pages\HostelReports.tsx` (1 missing keys, 12 hardcoded)
  - ... and 5 more files


## Unused Translation Keys (742)

These keys are defined in the TranslationKeys interface but are not used anywhere in the codebase.

```
academic.academicYears.cannotDeleteCurrent
academic.academicYears.cannotDeleteGlobal
academic.academicYears.dateRangeError
academic.academicYears.deleteAcademicYear
academic.academicYears.endDateRequired
academic.academicYears.globalType
academic.academicYears.nameExists
academic.academicYears.nameMaxLength
academic.academicYears.nameRequired
academic.academicYears.organizationType
academic.academicYears.startDateRequired
academic.classes.allSections
academic.classes.cannotDeleteGlobal
academic.classes.cannotDeleteInUse
academic.classes.cannotRemoveWithStudents
academic.classes.codeExists
academic.classes.codeMaxLength
academic.classes.codeRequired
academic.classes.defaultTeacher
academic.classes.deleteClass
academic.classes.globalType
academic.classes.nameMaxLength
academic.classes.nameRequired
academic.classes.noSections
academic.classes.organizationType
academic.classes.selectTeacher
academic.residencyTypes.cannotDeleteGlobal
academic.residencyTypes.codeExists
academic.residencyTypes.codeMaxLength
academic.residencyTypes.codeRequired
academic.residencyTypes.deleteResidencyType
academic.residencyTypes.globalType
academic.residencyTypes.nameMaxLength
academic.residencyTypes.nameRequired
academic.residencyTypes.organizationType
academic.residencyTypes.residencyTypeCreated
academic.residencyTypes.residencyTypeDeleted
academic.residencyTypes.residencyTypeUpdated
academic.scheduleSlots.codeMaxLength
academic.scheduleSlots.codeRequired
academic.scheduleSlots.endTimeAfterStart
academic.scheduleSlots.invalidTimeFormat
academic.scheduleSlots.nameMaxLength
academic.scheduleSlots.nameRequired
academic.scheduleSlots.slotCreated
academic.scheduleSlots.slotDeleted
academic.scheduleSlots.slotUpdated
academic.scheduleSlots.timeRequired
academic.staffTypes.codeMaxLength
academic.staffTypes.codeRequired
academic.staffTypes.nameMaxLength
academic.staffTypes.nameRequired
academic.subjects.cannotDeleteGlobal
academic.subjects.cannotDeleteInUse
academic.subjects.codeExists
academic.subjects.codeMaxLength
academic.subjects.codeRequired
academic.subjects.deleteSubject
academic.subjects.globalType
academic.subjects.gradeLevel
academic.subjects.nameMaxLength
academic.subjects.nameRequired
academic.subjects.noClassSelected
academic.subjects.organizationType
academic.subjects.subjectAssigned
academic.subjects.subjectAssignmentUpdated
academic.subjects.subjectCreated
academic.subjects.subjectDeleted
academic.subjects.subjectRemoved
academic.subjects.subjectUpdated
academic.subjects.subjectsCopied
academic.subjects.weeklyHoursPlaceholder
academic.timetable.days.friday
academic.timetable.days.monday
academic.timetable.days.saturday
academic.timetable.days.sunday
academic.timetable.days.thursday
academic.timetable.days.tuesday
academic.timetable.days.wednesday
admissions.admissionDetails
admissions.callGuardian
admissions.contact
admissions.guardianPhone
admissions.recentAdmissionsSubtitle
admissions.year
assets.active
assets.assetAssigned
assets.assetCreated
assets.assetDeleted
assets.assetHistory
assets.assetReturned
assets.assetTag
assets.assetTagRequired
assets.assetUpdated
assets.assignAsset
assets.assigned
assets.assignedTo
assets.assignedToStaff
assets.assignedToStudent
assets.assignedToType

... and 642 more unused keys
```

## Missing Translation Keys (392)

These keys are used in the codebase but are not defined in the TranslationKeys interface.

```
 
,
.
.context-menu-trigger
/assets/stats
/auth/logout
/organizations/accessible
/permissions
/permissions/roles
/permissions/user
/profiles/me
/roles
/students/autocomplete
1month
2d
:
;
@
@/components/admin/UserManagement
@/components/settings/AcademicYearsManagement
@/components/settings/BuildingsManagement
@/components/settings/ClassesManagement
@/components/settings/OrganizationsManagement
@/components/settings/PermissionsManagement
@/components/settings/ProfileManagement
@/components/settings/ReportTemplatesManagement
@/components/settings/ResidencyTypesManagement
@/components/settings/RolesManagement
@/components/settings/RoomsManagement
@/components/settings/ScheduleSlotsManagement
@/components/settings/SchoolsManagement
@/components/settings/StaffTypesManagement
@/components/settings/SubjectsManagement
@/components/settings/TeacherSubjectAssignments
@/components/settings/UserPermissionsManagement
@/fonts/Bahij Nassim-Bold.woff?url
@/fonts/ttf/Bahij Nassim-Bold.ttf?url
@/fonts/ttf/Bahij Nassim-Regular.ttf?url
@/pages/AssetAssignments
@/pages/AssetCategories
@/pages/AssetReports
@/pages/Assets
@/pages/Attendance
@/pages/AttendanceReports
@/pages/AttendanceTotalsReports
@/pages/CertificateTemplates
@/pages/CourseAttendance
@/pages/CourseCertificates
@/pages/CourseDashboard
@/pages/CourseDocuments
@/pages/CourseStudentReports
@/pages/CourseStudents
@/pages/Dashboard
@/pages/HostelManagement
@/pages/HostelReports
@/pages/LeaveManagement
@/pages/LeaveReports
@/pages/Library
@/pages/LibraryBooks
@/pages/LibraryCategories
@/pages/LibraryDistribution
@/pages/LibraryReports
@/pages/ResetPasswordPage
@/pages/ShortTermCourses
@/pages/StaffList
@/pages/StaffReport
@/pages/StudentAdmissions
@/pages/StudentAdmissionsReport
@/pages/StudentReport
@/pages/Students
@/pages/TranslationEditor
@/pages/UserProfile
@/pages/UserSettings
No books to export
Something went wrong
T
[data-context-menu]
[data-radix-context-menu-content]
[data-radix-context-menu-trigger]
[role]
a
academic.teacherSubjectAssignments.title
academicManagement
academicSettings
active
admissions
admissions.admissionNumber
admissions.noClassesAssignedToYear
admissions.noClassesForYear
admissions.noRoomsFound
admissions.noStudentsFound
admissions.searchRoom
admissions.searchStudent
admissions.selectAcademicYearFirst
admissions.selectAcademicYearToSeeClasses
admissions.student
admissionsReport
admitted
assets
assets.categories
assets.updateMaintenance
attendance
attendancePage.selectAtLeastOneClass
attendanceReports
attendanceTotalsReport
attendanceTotalsReport.room
auth-token-changed
available
bold
bolditalic
buildings.buildingCreated
buildings.buildingDeleted
buildings.buildingUpdated
canvas
certificateTemplates
certificateTemplates.description
code
common.create
common.more
common.to
common.total
common.unauthorized
common.update
content-disposition
courseAttendance
courseCertificates
courseDashboard
courseDocuments
courseId
courseReports
courseStudents
course_id
courses
courses.active
courses.addStudent
courses.all
courses.completionRate
courses.currentlyEnrolled
courses.delete
courses.documents
courses.dropRate
courses.edit
courses.generated
courses.manageDocuments
courses.sessions
courses.summary
courses.totalCourses
courses.viewDetails
courses.viewManageStudents
courses.viewStudents
csv
custom
dashboard
description
div
document_type
email
filename=
firstName
hostel
hostel.overview
iframe
is_active
italic
landing.benefits.cloudBased.description
landing.benefits.cloudBased.title
landing.benefits.lightningFast.description
landing.benefits.lightningFast.title
landing.benefits.mobileReady.description
landing.benefits.mobileReady.title
landing.benefits.multiLanguage.description
landing.benefits.multiLanguage.title
landing.benefits.secureReliable.description
landing.benefits.secureReliable.title
landing.benefits.support24x7.description
landing.benefits.support24x7.title
landing.contact.messageSent
landing.contact.messageSentDescription
landing.features.academicManagement.description
landing.features.academicManagement.title
landing.features.attendanceTracking.description
landing.features.attendanceTracking.title
landing.features.communicationHub.description
landing.features.communicationHub.title
landing.features.feeManagement.description
landing.features.feeManagement.title
landing.features.hifzProgress.description
landing.features.hifzProgress.title
landing.features.hostelManagement.description
landing.features.hostelManagement.title
landing.features.librarySystem.description
landing.features.librarySystem.title
landing.features.studentManagement.description
landing.features.studentManagement.title
landing.pricing.enterprise.description
landing.pricing.enterprise.feature1
landing.pricing.enterprise.feature2
landing.pricing.enterprise.feature3
landing.pricing.enterprise.feature4
landing.pricing.enterprise.feature5
landing.pricing.enterprise.feature6
landing.pricing.enterprise.feature7
landing.pricing.enterprise.feature8
landing.pricing.enterprise.name
landing.pricing.period
landing.pricing.professional.description
landing.pricing.professional.feature1
landing.pricing.professional.feature2
landing.pricing.professional.feature3
landing.pricing.professional.feature4
landing.pricing.professional.feature5
landing.pricing.professional.feature6
landing.pricing.professional.feature7
landing.pricing.professional.feature8
landing.pricing.professional.name
landing.pricing.starter.description
landing.pricing.starter.feature1
landing.pricing.starter.feature2
landing.pricing.starter.feature3
landing.pricing.starter.feature4
landing.pricing.starter.feature5
landing.pricing.starter.feature6
landing.pricing.starter.name
landing.stats.staffMembers
landing.stats.studentsManaged
landing.stats.supportAvailable
landing.stats.uptimeGuarantee
lastName
leaveReports
leaveRequests
library
message
meta
name
notFound.goBack
notFound.goHome
notFound.message
notFound.title
pagination.perPage
pdf
pending
permissions.actions
phone
profileManagement.editProfile
profileManagement.fullNameMaxLength
profileManagement.fullNameRequired
profileManagement.invalidEmail
profileManagement.phoneMaxLength
profileManagement.updateOwnProfileDescription
profileManagement.updateProfileDescription
regular
reportTemplates.active
reportTemplates.cancel
reportTemplates.delete
scheduled
schoolName
schools.cancel
schools.delete
search
settings
shortTermCourses
staff
staffManagement
staffReports
studentCount
studentManagement
studentReport.academicInformation
studentReport.active
studentReport.additionalInformation
studentReport.admissionFeeStatus
studentReport.admissionYear
studentReport.admitted
studentReport.age
studentReport.allGenders
studentReport.allSchools
studentReport.allStatus
studentReport.applied
studentReport.applyingGrade
studentReport.birthDate
studentReport.birthYear
studentReport.contactPhone
studentReport.currentLocation
studentReport.disabilityStatus
studentReport.emergencyContact
studentReport.exportFailed
studentReport.fatherName
studentReport.female
studentReport.filters
studentReport.fullName
studentReport.gender
studentReport.guardianInformation
studentReport.guardianName
studentReport.guardianPhone
studentReport.homeAddress
studentReport.isOrphan
studentReport.loadingStudents
studentReport.locationInformation
studentReport.male
studentReport.nationality
studentReport.no
studentReport.noStudentsFound
studentReport.originLocation
studentReport.personalInformation
studentReport.previousSchool
studentReport.relation
studentReport.reportExported
studentReport.school
studentReport.schoolRequired
studentReport.searchPlaceholder
studentReport.status
studentReport.studentId
studentReport.students
studentReport.subtitle
studentReport.title
studentReport.withdrawn
studentReport.yes
studentReports
students
students.admissionNumber
students.downloadDocumentError
students.orphans
style
teaching
timetables
toast.assetCategories.created
toast.assetCategories.deleted
toast.assetCategories.updated
toast.assets.assignmentRemoved
toast.assets.assignmentSaved
toast.assets.assignmentUpdated
toast.assets.maintenanceRemoved
toast.assets.maintenanceSaved
toast.assets.maintenanceUpdated
toast.assets.removed
toast.assets.saved
toast.assets.updated
toast.certificateTemplates.created
toast.certificateTemplates.defaultUpdated
toast.certificateTemplates.deleted
toast.certificateTemplates.generated
toast.certificateTemplates.updated
toast.courseAttendance.recordsSaved
toast.courseAttendance.sessionClosed
toast.courseAttendance.sessionCreated
toast.courseAttendance.sessionDeleted
toast.courseAttendance.sessionUpdated
toast.courseDocuments.deleted
toast.courseDocuments.uploaded
toast.courseStudents.certificateIssued
toast.courseStudents.copiedToMain
toast.courseStudents.deleted
toast.courseStudents.markedCompleted
toast.courseStudents.markedDropped
toast.courseStudents.noStudentsEnrolled
toast.courseStudents.saved
toast.courseStudents.updated
toast.discipline.created
toast.discipline.deleted
toast.discipline.resolved
toast.discipline.updated
toast.leaveRequests.approved
toast.leaveRequests.created
toast.leaveRequests.rejected
toast.leaveRequests.updated
toast.library.bookRemoveFailed
toast.library.bookRemoved
toast.library.bookReturnFailed
toast.library.bookReturned
toast.library.bookSaveFailed
toast.library.bookSaved
toast.library.bookUpdateFailed
toast.library.bookUpdated
toast.library.copyAddFailed
toast.library.copyAdded
toast.library.loanCreateFailed
toast.library.loanCreated
toast.libraryCategories.created
toast.libraryCategories.deleted
toast.libraryCategories.updated
toast.staff.created
toast.staff.deleted
toast.staff.documentDeleted
toast.staff.updated
toast.staffTypes.created
toast.staffTypes.deleted
toast.staffTypes.updated
toast.studentAdmissions.admitted
toast.studentAdmissions.removed
toast.studentAdmissions.updated
token
translations
xlsx
```

## Files That Might Need Translation Work

### High Priority (Missing Keys)

#### `components\admin\UserManagement.tsx`
- **Missing Keys**: 2
    - `a`
    - `T`
- **Hardcoded Strings**: 24

#### `components\assets\AssetListTab.tsx`
- **Missing Keys**: 3
    - `available`
    - `T`
    - `iframe`
- **Hardcoded Strings**: 19

#### `components\assets\AssetMaintenanceTab.tsx`
- **Missing Keys**: 2
    - `scheduled`
    - `assets.updateMaintenance`
- **Hardcoded Strings**: 10

#### `components\assets\AssetManagement.tsx`
- **Missing Keys**: 3
    - `available`
    - `scheduled`
    - `T`
- **Hardcoded Strings**: 13

#### `components\certificates\CertificateLayoutEditor.tsx`
- **Missing Keys**: 1
    - `@/fonts/Bahij Nassim-Bold.woff?url`
- **Hardcoded Strings**: 30

#### `components\layout\AppHeader.tsx`
- **Missing Keys**: 1
    - ` `
- **Hardcoded Strings**: 1

#### `components\layout\AppSidebar.tsx`
- **Missing Keys**: 3
    - `dashboard`
    - `attendance`
    - `settings`
- **Hardcoded Strings**: 2

#### `components\LazyComponents.tsx`
- **Missing Keys**: 52
    - `@/pages/Dashboard`
    - `@/pages/ResetPasswordPage`
    - `@/pages/UserProfile`
    - `@/pages/UserSettings`
    - `@/components/settings/BuildingsManagement`
    - `@/components/settings/RoomsManagement`
    - `@/components/settings/OrganizationsManagement`
    - `@/components/settings/ProfileManagement`
    - `@/components/settings/PermissionsManagement`
    - `@/components/settings/RolesManagement`
    - `@/components/settings/UserPermissionsManagement`
    - `@/components/settings/SchoolsManagement`
    - `@/components/settings/ReportTemplatesManagement`
    - `@/components/settings/ResidencyTypesManagement`
    - `@/components/settings/AcademicYearsManagement`
    - `@/components/settings/ClassesManagement`
    - `@/components/settings/SubjectsManagement`
    - `@/components/settings/ScheduleSlotsManagement`
    - `@/components/settings/TeacherSubjectAssignments`
    - `@/components/settings/StaffTypesManagement`
    - `@/pages/StaffList`
    - `@/pages/Students`
    - `@/pages/StudentAdmissions`
    - `@/pages/StudentReport`
    - `@/pages/StudentAdmissionsReport`
    - `@/pages/ShortTermCourses`
    - `@/pages/CourseStudents`
    - `@/pages/CourseStudentReports`
    - `@/pages/CourseDashboard`
    - `@/pages/CourseAttendance`
    - `@/pages/CourseCertificates`
    - `@/pages/CertificateTemplates`
    - `@/pages/CourseDocuments`
    - `@/pages/StaffReport`
    - `@/pages/HostelManagement`
    - `@/pages/HostelReports`
    - `@/pages/Attendance`
    - `@/pages/AttendanceReports`
    - `@/pages/AttendanceTotalsReports`
    - `@/components/admin/UserManagement`
    - `@/pages/Library`
    - `@/pages/LibraryCategories`
    - `@/pages/LibraryBooks`
    - `@/pages/LibraryDistribution`
    - `@/pages/LibraryReports`
    - `@/pages/LeaveManagement`
    - `@/pages/LeaveReports`
    - `@/pages/Assets`
    - `@/pages/AssetAssignments`
    - `@/pages/AssetReports`
    - `@/pages/AssetCategories`
    - `@/pages/TranslationEditor`
- **Hardcoded Strings**: 0

#### `components\navigation\SmartSidebar.tsx`
- **Missing Keys**: 35
    - `@`
    - `dashboard`
    - `staffManagement`
    - `staff`
    - `staffReports`
    - `attendance`
    - `attendanceReports`
    - `attendanceTotalsReport`
    - `leaveRequests`
    - `leaveReports`
    - `shortTermCourses`
    - `courseDashboard`
    - `courses`
    - `courseStudents`
    - `courseAttendance`
    - `courseCertificates`
    - `certificateTemplates`
    - `courseDocuments`
    - `courseReports`
    - `studentManagement`
    - `students`
    - `admissions`
    - `studentReports`
    - `admissionsReport`
    - `hostel`
    - `hostel.overview`
    - `library`
    - `assets`
    - `assets.categories`
    - `academicManagement`
    - `academic.teacherSubjectAssignments.title`
    - `timetables`
    - `settings`
    - `translations`
    - `academicSettings`
- **Hardcoded Strings**: 38

#### `components\settings\AcademicYearsManagement.tsx`
- **Missing Keys**: 2
    - `active`
    - `T`
- **Hardcoded Strings**: 7

#### `components\settings\ClassesManagement.tsx`
- **Missing Keys**: 1
    - `,`
- **Hardcoded Strings**: 17

#### `components\settings\PermissionsManagement.tsx`
- **Missing Keys**: 1
    - `permissions.actions`
- **Hardcoded Strings**: 1

#### `components\settings\ProfileManagement.tsx`
- **Missing Keys**: 7
    - `profileManagement.fullNameRequired`
    - `profileManagement.fullNameMaxLength`
    - `profileManagement.invalidEmail`
    - `profileManagement.phoneMaxLength`
    - `profileManagement.editProfile`
    - `profileManagement.updateOwnProfileDescription`
    - `profileManagement.updateProfileDescription`
- **Hardcoded Strings**: 0

#### `components\settings\ReportTemplatesManagement.tsx`
- **Missing Keys**: 3
    - `reportTemplates.active`
    - `reportTemplates.cancel`
    - `reportTemplates.delete`
- **Hardcoded Strings**: 10

#### `components\settings\SchoolsManagement.tsx`
- **Missing Keys**: 4
    - `schools.delete`
    - `schools.cancel`
    - `common.update`
    - `common.create`
- **Hardcoded Strings**: 15

#### `components\settings\SubjectsManagement.tsx`
- **Missing Keys**: 4
    - `name`
    - `code`
    - `is_active`
    - `description`
- **Hardcoded Strings**: 25

#### `components\short-term-courses\AssignToCourseDialog.tsx`
- **Missing Keys**: 1
    - `T`
- **Hardcoded Strings**: 12

#### `components\short-term-courses\CertificatePdfGenerator.tsx`
- **Missing Keys**: 10
    - `regular`
    - `bold`
    - `italic`
    - `bolditalic`
    - `@/fonts/ttf/Bahij Nassim-Regular.ttf?url`
    - `@/fonts/ttf/Bahij Nassim-Bold.ttf?url`
    - `canvas`
    - `2d`
    - `@/fonts/Bahij Nassim-Bold.woff?url`
    - `a`
- **Hardcoded Strings**: 20

#### `components\short-term-courses\CourseDocumentsDialog.tsx`
- **Missing Keys**: 1
    - `.`
- **Hardcoded Strings**: 7

#### `components\short-term-courses\CourseStudentFormDialog.tsx`
- **Missing Keys**: 1
    - `T`
- **Hardcoded Strings**: 27

#### `components\short-term-courses\EnrollFromMainDialog.tsx`
- **Missing Keys**: 1
    - `T`
- **Hardcoded Strings**: 9

#### `components\students\StudentDocumentsDialog.tsx`
- **Missing Keys**: 3
    - `common.unauthorized`
    - `a`
    - `students.downloadDocumentError`
- **Hardcoded Strings**: 24

#### `components\students\StudentProfilePrint.tsx`
- **Missing Keys**: 1
    - `style`
- **Hardcoded Strings**: 41

#### `components\students\StudentProfileView.tsx`
- **Missing Keys**: 1
    - `common.to`
- **Hardcoded Strings**: 76

#### `components\timetable\TimetableGenerator.tsx`
- **Missing Keys**: 2
    - `T`
    - `style`
- **Hardcoded Strings**: 48

#### `hooks\useAssetCategories.tsx`
- **Missing Keys**: 3
    - `toast.assetCategories.created`
    - `toast.assetCategories.updated`
    - `toast.assetCategories.deleted`
- **Hardcoded Strings**: 0

#### `hooks\useAssets.tsx`
- **Missing Keys**: 9
    - `toast.assets.saved`
    - `toast.assets.updated`
    - `toast.assets.removed`
    - `toast.assets.assignmentSaved`
    - `toast.assets.assignmentUpdated`
    - `toast.assets.assignmentRemoved`
    - `toast.assets.maintenanceSaved`
    - `toast.assets.maintenanceUpdated`
    - `toast.assets.maintenanceRemoved`
- **Hardcoded Strings**: 0

#### `hooks\useBuildings.tsx`
- **Missing Keys**: 3
    - `buildings.buildingCreated`
    - `buildings.buildingUpdated`
    - `buildings.buildingDeleted`
- **Hardcoded Strings**: 5

#### `hooks\useCertificateTemplates.tsx`
- **Missing Keys**: 5
    - `toast.certificateTemplates.created`
    - `toast.certificateTemplates.updated`
    - `toast.certificateTemplates.deleted`
    - `toast.certificateTemplates.defaultUpdated`
    - `toast.certificateTemplates.generated`
- **Hardcoded Strings**: 2

#### `hooks\useCourseAttendance.tsx`
- **Missing Keys**: 5
    - `toast.courseAttendance.sessionCreated`
    - `toast.courseAttendance.sessionUpdated`
    - `toast.courseAttendance.sessionDeleted`
    - `toast.courseAttendance.recordsSaved`
    - `toast.courseAttendance.sessionClosed`
- **Hardcoded Strings**: 1

#### `hooks\useCourseDocuments.tsx`
- **Missing Keys**: 3
    - `a`
    - `toast.courseDocuments.uploaded`
    - `toast.courseDocuments.deleted`
- **Hardcoded Strings**: 0

#### `hooks\useCourseStudentDisciplineRecords.tsx`
- **Missing Keys**: 4
    - `toast.discipline.created`
    - `toast.discipline.updated`
    - `toast.discipline.deleted`
    - `toast.discipline.resolved`
- **Hardcoded Strings**: 0

#### `hooks\useCourseStudents.tsx`
- **Missing Keys**: 8
    - `toast.courseStudents.saved`
    - `toast.courseStudents.updated`
    - `toast.courseStudents.deleted`
    - `toast.courseStudents.noStudentsEnrolled`
    - `toast.courseStudents.copiedToMain`
    - `toast.courseStudents.markedCompleted`
    - `toast.courseStudents.markedDropped`
    - `toast.courseStudents.certificateIssued`
- **Hardcoded Strings**: 2

#### `hooks\useLeaveRequests.tsx`
- **Missing Keys**: 4
    - `toast.leaveRequests.created`
    - `toast.leaveRequests.updated`
    - `toast.leaveRequests.approved`
    - `toast.leaveRequests.rejected`
- **Hardcoded Strings**: 0

#### `hooks\useLibrary.tsx`
- **Missing Keys**: 12
    - `toast.library.bookSaved`
    - `toast.library.bookSaveFailed`
    - `toast.library.bookUpdated`
    - `toast.library.bookUpdateFailed`
    - `toast.library.bookRemoved`
    - `toast.library.bookRemoveFailed`
    - `toast.library.copyAdded`
    - `toast.library.copyAddFailed`
    - `toast.library.loanCreated`
    - `toast.library.loanCreateFailed`
    - `toast.library.bookReturned`
    - `toast.library.bookReturnFailed`
- **Hardcoded Strings**: 0

#### `hooks\useLibraryCategories.tsx`
- **Missing Keys**: 3
    - `toast.libraryCategories.created`
    - `toast.libraryCategories.updated`
    - `toast.libraryCategories.deleted`
- **Hardcoded Strings**: 1

#### `hooks\useStaff.tsx`
- **Missing Keys**: 7
    - `toast.staff.created`
    - `toast.staff.updated`
    - `toast.staff.deleted`
    - `toast.staffTypes.created`
    - `toast.staffTypes.updated`
    - `toast.staffTypes.deleted`
    - `toast.staff.documentDeleted`
- **Hardcoded Strings**: 3

#### `hooks\useStudentAdmissions.tsx`
- **Missing Keys**: 3
    - `toast.studentAdmissions.admitted`
    - `toast.studentAdmissions.updated`
    - `toast.studentAdmissions.removed`
- **Hardcoded Strings**: 2

#### `lib\accessibility.tsx`
- **Missing Keys**: 3
    - `div`
    - `[role]`
    - `style`
- **Hardcoded Strings**: 10

#### `lib\api\client.ts`
- **Missing Keys**: 12
    - `auth-token-changed`
    - `content-disposition`
    - `filename=`
    - `/auth/logout`
    - `/organizations/accessible`
    - `/profiles/me`
    - `/permissions`
    - `/permissions/user`
    - `/permissions/roles`
    - `/roles`
    - `/assets/stats`
    - `/students/autocomplete`
- **Hardcoded Strings**: 8

#### `lib\i18n.ts`
- **Missing Keys**: 1
    - `.`
- **Hardcoded Strings**: 0

#### `lib\security-core.ts`
- **Missing Keys**: 2
    - `meta`
    - `;`
- **Hardcoded Strings**: 19

#### `lib\studentProfilePdf.ts`
- **Missing Keys**: 4
    - `,`
    - `canvas`
    - `2d`
    - `iframe`
- **Hardcoded Strings**: 63

#### `lib\timetableSolver.ts`
- **Missing Keys**: 1
    - `:`
- **Hardcoded Strings**: 0

#### `lib\toast.ts`
- **Missing Keys**: 2
    - `.`
    - `Something went wrong`
- **Hardcoded Strings**: 1

#### `lib\translations\importExport.ts`
- **Missing Keys**: 2
    - `T`
    - `a`
- **Hardcoded Strings**: 2

#### `lib\translations\utils.ts`
- **Missing Keys**: 1
    - `.`
- **Hardcoded Strings**: 0

#### `lib\validations\student.ts`
- **Missing Keys**: 2
    - `pending`
    - `active`
- **Hardcoded Strings**: 18

#### `lib\validations\timetable.ts`
- **Missing Keys**: 1
    - `teaching`
- **Hardcoded Strings**: 1

#### `main.tsx`
- **Missing Keys**: 4
    - `[data-radix-context-menu-trigger]`
    - `[data-radix-context-menu-content]`
    - `[data-context-menu]`
    - `.context-menu-trigger`
- **Hardcoded Strings**: 1

#### `mappers\academicYearMapper.ts`
- **Missing Keys**: 1
    - `T`
- **Hardcoded Strings**: 0

#### `mappers\assetMapper.ts`
- **Missing Keys**: 1
    - `T`
- **Hardcoded Strings**: 0

#### `mappers\leaveMapper.ts`
- **Missing Keys**: 1
    - `T`
- **Hardcoded Strings**: 0

#### `mappers\studentMapper.ts`
- **Missing Keys**: 1
    - ` `
- **Hardcoded Strings**: 0

#### `pages\Attendance.tsx`
- **Missing Keys**: 2
    - `attendancePage.selectAtLeastOneClass`
    - `pagination.perPage`
- **Hardcoded Strings**: 10

#### `pages\AttendanceTotalsReports.tsx`
- **Missing Keys**: 3
    - `1month`
    - `custom`
    - `attendanceTotalsReport.room`
- **Hardcoded Strings**: 35

#### `pages\CertificateTemplates.tsx`
- **Missing Keys**: 1
    - `certificateTemplates.description`
- **Hardcoded Strings**: 8

#### `pages\CourseAttendance.tsx`
- **Missing Keys**: 2
    - `courseId`
    - `courses.sessions`
- **Hardcoded Strings**: 8

#### `pages\CourseCertificates.tsx`
- **Missing Keys**: 1
    - `course_id`
- **Hardcoded Strings**: 6

#### `pages\CourseDashboard.tsx`
- **Missing Keys**: 9
    - `a`
    - `courses.generated`
    - `courses.summary`
    - `courses.totalCourses`
    - `courses.active`
    - `courses.currentlyEnrolled`
    - `courses.completionRate`
    - `courses.dropRate`
    - `common.total`
- **Hardcoded Strings**: 3

#### `pages\CourseDocuments.tsx`
- **Missing Keys**: 5
    - `course_id`
    - `document_type`
    - `search`
    - `courses.manageDocuments`
    - `courses.documents`
- **Hardcoded Strings**: 5

#### `pages\CourseStudentReports.tsx`
- **Missing Keys**: 2
    - `a`
    - `common.total`
- **Hardcoded Strings**: 15

#### `pages\CourseStudents.tsx`
- **Missing Keys**: 8
    - `common.more`
    - `courses.viewDetails`
    - `courses.edit`
    - `courses.delete`
    - `courseId`
    - `courses.addStudent`
    - `common.total`
    - `courses.all`
- **Hardcoded Strings**: 1

#### `pages\Dashboard.tsx`
- **Missing Keys**: 2
    - `T`
    - `@`
- **Hardcoded Strings**: 16

#### `pages\HostelManagement.tsx`
- **Missing Keys**: 1
    - `a`
- **Hardcoded Strings**: 1

#### `pages\HostelReports.tsx`
- **Missing Keys**: 1
    - `a`
- **Hardcoded Strings**: 12

#### `pages\Index.tsx`
- **Missing Keys**: 70
    - `landing.features.studentManagement.title`
    - `landing.features.studentManagement.description`
    - `landing.features.academicManagement.title`
    - `landing.features.academicManagement.description`
    - `landing.features.librarySystem.title`
    - `landing.features.librarySystem.description`
    - `landing.features.attendanceTracking.title`
    - `landing.features.attendanceTracking.description`
    - `landing.features.feeManagement.title`
    - `landing.features.feeManagement.description`
    - `landing.features.hostelManagement.title`
    - `landing.features.hostelManagement.description`
    - `landing.features.hifzProgress.title`
    - `landing.features.hifzProgress.description`
    - `landing.features.communicationHub.title`
    - `landing.features.communicationHub.description`
    - `landing.benefits.secureReliable.title`
    - `landing.benefits.secureReliable.description`
    - `landing.benefits.lightningFast.title`
    - `landing.benefits.lightningFast.description`
    - `landing.benefits.multiLanguage.title`
    - `landing.benefits.multiLanguage.description`
    - `landing.benefits.mobileReady.title`
    - `landing.benefits.mobileReady.description`
    - `landing.benefits.cloudBased.title`
    - `landing.benefits.cloudBased.description`
    - `landing.benefits.support24x7.title`
    - `landing.benefits.support24x7.description`
    - `landing.pricing.starter.name`
    - `landing.pricing.period`
    - `landing.pricing.starter.description`
    - `landing.pricing.starter.feature1`
    - `landing.pricing.starter.feature2`
    - `landing.pricing.starter.feature3`
    - `landing.pricing.starter.feature4`
    - `landing.pricing.starter.feature5`
    - `landing.pricing.starter.feature6`
    - `landing.pricing.professional.name`
    - `landing.pricing.professional.description`
    - `landing.pricing.professional.feature1`
    - `landing.pricing.professional.feature2`
    - `landing.pricing.professional.feature3`
    - `landing.pricing.professional.feature4`
    - `landing.pricing.professional.feature5`
    - `landing.pricing.professional.feature6`
    - `landing.pricing.professional.feature7`
    - `landing.pricing.professional.feature8`
    - `landing.pricing.enterprise.name`
    - `landing.pricing.enterprise.description`
    - `landing.pricing.enterprise.feature1`
    - `landing.pricing.enterprise.feature2`
    - `landing.pricing.enterprise.feature3`
    - `landing.pricing.enterprise.feature4`
    - `landing.pricing.enterprise.feature5`
    - `landing.pricing.enterprise.feature6`
    - `landing.pricing.enterprise.feature7`
    - `landing.pricing.enterprise.feature8`
    - `landing.stats.studentsManaged`
    - `landing.stats.staffMembers`
    - `landing.stats.uptimeGuarantee`
    - `landing.stats.supportAvailable`
    - `firstName`
    - `lastName`
    - `email`
    - `phone`
    - `schoolName`
    - `studentCount`
    - `message`
    - `landing.contact.messageSent`
    - `landing.contact.messageSentDescription`
- **Hardcoded Strings**: 73

#### `pages\LeaveReports.tsx`
- **Missing Keys**: 1
    - `a`
- **Hardcoded Strings**: 9

#### `pages\LibraryReports.tsx`
- **Missing Keys**: 2
    - `No books to export`
    - `a`
- **Hardcoded Strings**: 10

#### `pages\NotFound.tsx`
- **Missing Keys**: 4
    - `notFound.title`
    - `notFound.message`
    - `notFound.goHome`
    - `notFound.goBack`
- **Hardcoded Strings**: 2

#### `pages\ResetPasswordPage.tsx`
- **Missing Keys**: 1
    - `token`
- **Hardcoded Strings**: 26

#### `pages\ShortTermCourses.tsx`
- **Missing Keys**: 2
    - `courses.viewStudents`
    - `courses.viewManageStudents`
- **Hardcoded Strings**: 1

#### `pages\StaffList.tsx`
- **Missing Keys**: 1
    - `active`
- **Hardcoded Strings**: 64

#### `pages\StaffReport.tsx`
- **Missing Keys**: 5
    - ` `
    - `a`
    - `csv`
    - `xlsx`
    - `pdf`
- **Hardcoded Strings**: 8

#### `pages\StudentAdmissions.tsx`
- **Missing Keys**: 11
    - `admitted`
    - `admissions.student`
    - `admissions.admissionNumber`
    - `admissions.searchStudent`
    - `admissions.noStudentsFound`
    - `admissions.selectAcademicYearFirst`
    - `admissions.noClassesForYear`
    - `admissions.selectAcademicYearToSeeClasses`
    - `admissions.noClassesAssignedToYear`
    - `admissions.searchRoom`
    - `admissions.noRoomsFound`
- **Hardcoded Strings**: 44

#### `pages\StudentReport.tsx`
- **Missing Keys**: 55
    - ` `
    - `studentReport.schoolRequired`
    - `a`
    - `studentReport.reportExported`
    - `studentReport.exportFailed`
    - `studentReport.studentId`
    - `studentReport.fullName`
    - `studentReport.originLocation`
    - `studentReport.birthYear`
    - `studentReport.status`
    - `studentReport.title`
    - `studentReport.subtitle`
    - `csv`
    - `xlsx`
    - `pdf`
    - `studentReport.filters`
    - `studentReport.searchPlaceholder`
    - `studentReport.allSchools`
    - `studentReport.allStatus`
    - `studentReport.applied`
    - `studentReport.admitted`
    - `studentReport.active`
    - `studentReport.withdrawn`
    - `studentReport.allGenders`
    - `studentReport.male`
    - `studentReport.female`
    - `studentReport.students`
    - `studentReport.loadingStudents`
    - `studentReport.noStudentsFound`
    - `studentReport.personalInformation`
    - `studentReport.fatherName`
    - `studentReport.gender`
    - `studentReport.age`
    - `studentReport.birthDate`
    - `studentReport.nationality`
    - `studentReport.guardianInformation`
    - `studentReport.guardianName`
    - `studentReport.relation`
    - `studentReport.guardianPhone`
    - `studentReport.contactPhone`
    - `studentReport.homeAddress`
    - `studentReport.academicInformation`
    - `studentReport.school`
    - `studentReport.applyingGrade`
    - `studentReport.admissionYear`
    - `studentReport.admissionFeeStatus`
    - `studentReport.previousSchool`
    - `studentReport.locationInformation`
    - `studentReport.currentLocation`
    - `studentReport.additionalInformation`
    - `studentReport.isOrphan`
    - `studentReport.yes`
    - `studentReport.no`
    - `studentReport.disabilityStatus`
    - `studentReport.emergencyContact`
- **Hardcoded Strings**: 30

#### `pages\Students.tsx`
- **Missing Keys**: 3
    - `students.admissionNumber`
    - `studentReport.title`
    - `students.orphans`
- **Hardcoded Strings**: 22

#### `pages\TranslationEditor.tsx`
- **Missing Keys**: 2
    - `a`
    - `T`
- **Hardcoded Strings**: 21

#### `pages\UserProfile.tsx`
- **Missing Keys**: 1
    - ` `
- **Hardcoded Strings**: 8


### Medium Priority (Many Hardcoded Strings)

#### `components\admin\AuthMonitoringDashboard.tsx`
- **Hardcoded Strings**: 7
- **Sample Strings**:
    - "Invalid credentials"
    - "Failed to fetch auth monitoring data"
    - "Error fetching auth events:"
    - "Auth monitoring endpoint not yet implemented in La..."
    - "Failed to mark event as resolved"
    - "Auth system test endpoint not yet implemented in L..."
    - "Auth system test failed"

#### `components\assets\AssetAssignmentsTab.tsx`
- **Hardcoded Strings**: 16
- **Sample Strings**:
    - "Asset is required"
    - "Unspecified"
    - "Unknown Staff"
    - "Unknown Student"
    - "Unknown Room"
    - "Assigned To"
    - "Assigned On"
    - "MMM dd, yyyy"
    - "Expected Return"
    - "Filter by status"

#### `components\settings\ScheduleSlotsManagement.tsx`
- **Hardcoded Strings**: 13
- **Sample Strings**:
    - "Name is required"
    - "Name must be 100 characters or less"
    - "Code is required"
    - "Code must be 50 characters or less"
    - "Invalid time format (HH:MM)"
    - "Description must be 500 characters or less"
    - "End time must be after start time"
    - "Organization-wide Only"
    - "All Schools"
    - "Please fill in all required fields"

#### `components\settings\TeacherSubjectAssignments.tsx`
- **Hardcoded Strings**: 11
- **Sample Strings**:
    - "Teacher & Classes"
    - "Select teacher, academic year, classes, and schedu..."
    - "Select Subjects"
    - "Choose subjects for each class"
    - "TeacherSubjectAssignments: Error loading staff:"
    - "TeacherSubjectAssignments: Loading staff data..."
    - "TeacherSubjectAssignments: No staff data available"
    - "TeacherSubjectAssignments: Staff data:"
    - "TeacherSubjectAssignments: Active staff:"
    - "Unknown error"

#### `components\short-term-courses\ShortTermCourseFormDialog.tsx`
- **Hardcoded Strings**: 13
- **Sample Strings**:
    - "Edit Course"
    - "Create Course"
    - "Update the course details below."
    - "Fill in the details to create a new short-term cou..."
    - "Course name is required"
    - "Brief description of the course..."
    - "Select status"
    - "Update Course"
    - "e.g., Ahmad Khan"
    - "e.g., Room 101"

#### `components\students\StudentDisciplineRecordsDialog.tsx`
- **Hardcoded Strings**: 15
- **Sample Strings**:
    - "Discipline Records"
    - "View and manage discipline records for"
    - "Mark Resolved"
    - "No discipline records"
    - "Edit Discipline Record"
    - "Add Discipline Record"
    - "Enter the discipline record details"
    - "Incident Date"
    - "Incident Type"
    - "Description"

#### `components\students\StudentEducationalHistoryDialog.tsx`
- **Hardcoded Strings**: 17
- **Sample Strings**:
    - "Educational History"
    - "View and manage educational history for"
    - "Add History"
    - "Institution"
    - "Academic Year"
    - "No educational history recorded"
    - "Edit Educational History"
    - "Add Educational History"
    - "Enter the educational history details"
    - "Institution Name"

#### `components\students\StudentFormDialog.tsx`
- **Hardcoded Strings**: 63
- **Sample Strings**:
    - "Potential duplicate found"
    - "Do you still want to proceed creating a new record..."
    - "Edit Student"
    - "Register Student"
    - "Update registration and guardian details."
    - "Capture admission details with guardian and reside..."
    - "Select school"
    - "Admission No"
    - "SH-2024-001"
    - "Card Number"

#### `components\timetable\LoadTimetableDialog.tsx`
- **Hardcoded Strings**: 6
- **Sample Strings**:
    - "LoadTimetableDialog - Timetables loaded:"
    - "Load Timetable"
    - "Select a saved timetable to load."
    - "Error loading timetables: {error}"
    - "Loading timetables..."
    - "No saved timetables found for this organization."

#### `components\timetable\SaveTimetableDialog.tsx`
- **Hardcoded Strings**: 9
- **Sample Strings**:
    - "Cannot save: {count} entry/entries have missing re..."
    - "Saving timetable with entries:"
    - "Failed to save timetable:"
    - "Error details:"
    - "Unknown error occurred"
    - "Failed to save timetable: {error}"
    - "Save Timetable"
    - "Provide a name and optional description for this t..."
    - "Description"

#### `components\ui\breadcrumb.tsx`
- **Hardcoded Strings**: 6
- **Sample Strings**:
    - "BreadcrumbList"
    - "BreadcrumbItem"
    - "BreadcrumbLink"
    - "BreadcrumbPage"
    - "BreadcrumbSeparator"
    - "BreadcrumbElipssis"

#### `components\ui\pagination.tsx`
- **Hardcoded Strings**: 7
- **Sample Strings**:
    - "PaginationContent"
    - "PaginationItem"
    - "PaginationLink"
    - "PaginationPrevious"
    - "PaginationNext"
    - "PaginationEllipsis"
    - "pagination"

#### `components\ui\sidebar.tsx`
- **Hardcoded Strings**: 22
- **Sample Strings**:
    - "SidebarProvider"
    - "SidebarTrigger"
    - "SidebarRail"
    - "SidebarInset"
    - "SidebarInput"
    - "SidebarHeader"
    - "SidebarFooter"
    - "SidebarSeparator"
    - "SidebarContent"
    - "SidebarGroup"

#### `hooks\useAcademicYears.tsx`
- **Hardcoded Strings**: 19
- **Sample Strings**:
    - "User not authenticated"
    - "User must be assigned to an organization"
    - "Cannot create academic year for different organiza..."
    - "Name must be 100 characters or less"
    - "Start date is required"
    - "End date is required"
    - "Invalid start date"
    - "Invalid end date"
    - "End date must be after start date"
    - "Name cannot be empty"

#### `hooks\useAccessibleOrganizations.ts`
- **Hardcoded Strings**: 8
- **Sample Strings**:
    - "User has no organizations assigned. Please assign ..."
    - "Unknown error"
    - "Network error"
    - "Failed to fetch"
    - "Unable to connect"
    - "Disable request blocking in DevTools Network tab a..."
    - "Ensure Laravel backend is running on port 8000."
    - "Failed to fetch accessible organizations:"

#### `hooks\useAuth.tsx`
- **Hardcoded Strings**: 6
- **Sample Strings**:
    - "Profile missing organization_id - backend should h..."
    - "Failed to load profile:"
    - "Unauthenticated"
    - "Profile missing organization_id, refreshing..."
    - "Auth check failed (had token):"
    - "Logout error:"

#### `hooks\usePermissions.tsx`
- **Hardcoded Strings**: 15
- **Sample Strings**:
    - "User not authenticated"
    - "You do not have permission to create roles"
    - "User must be assigned to an organization"
    - "You do not have permission to update roles"
    - "You do not have permission to delete roles"
    - "You do not have permission to assign permissions"
    - "You do not have permission to remove permissions"
    - "You do not have permission to create permissions"
    - "You do not have permission to update permissions"
    - "You do not have permission to delete permissions"

#### `hooks\useResidencyTypes.tsx`
- **Hardcoded Strings**: 7
- **Sample Strings**:
    - "User not authenticated"
    - "Cannot create residency type for different organiz..."
    - "Name must be 100 characters or less"
    - "Code must be 50 characters or less"
    - "Name cannot be empty"
    - "Code cannot be empty"
    - "Cannot change organization_id"

#### `hooks\useScheduleSlots.tsx`
- **Hardcoded Strings**: 7
- **Sample Strings**:
    - "User not authenticated"
    - "User must be assigned to an organization"
    - "Cannot create slot for different organization"
    - "Schedule slot not found"
    - "Cannot update slot from different organization"
    - "Cannot change organizationId"
    - "Cannot delete slot from different organization"

#### `hooks\useSchools.tsx`
- **Hardcoded Strings**: 6
- **Sample Strings**:
    - "User not authenticated"
    - "Insufficient permissions to create schools"
    - "Organization ID is required"
    - "Cannot create school for a non-accessible organiza..."
    - "Insufficient permissions to update schools"
    - "Insufficient permissions to delete schools"

#### `hooks\useSecureAuth.tsx`
- **Hardcoded Strings**: 13
- **Sample Strings**:
    - "Login failed"
    - "Auth error:"
    - "Unexpected error during sign in:"
    - "Password must be at least 8 characters long"
    - "Password must contain at least one uppercase lette..."
    - "Password must contain at least one lowercase lette..."
    - "Password must contain at least one number"
    - "Password must contain at least one special charact..."
    - "Secure sign up attempt for:"
    - "Registration failed"

#### `hooks\useSubjects.tsx`
- **Hardcoded Strings**: 20
- **Sample Strings**:
    - "User not authenticated"
    - "User must be assigned to an organization"
    - "Cannot create subject for different organization"
    - "Subject not found"
    - "Cannot update subject from different organization"
    - "Cannot change organizationId"
    - "Name cannot be empty"
    - "Code cannot be empty"
    - "Cannot delete subject from different organization"
    - "Class instance not found"

#### `hooks\useUsers.tsx`
- **Hardcoded Strings**: 7
- **Sample Strings**:
    - "User not authenticated"
    - "Insufficient permissions to create users"
    - "Cannot create user for a non-accessible organizati..."
    - "Insufficient permissions to update users"
    - "Cannot assign user to a non-accessible organizatio..."
    - "Insufficient permissions to delete users"
    - "Insufficient permissions to reset passwords"

#### `lib\logger.ts`
- **Hardcoded Strings**: 6
- **Sample Strings**:
    - "Failed to persist log:"
    - "ResizeObserver loop completed with undelivered not..."
    - "ResizeObserver loop limit exceeded"
    - "Global error caught"
    - "Unhandled promise rejection"
    - "Performance"

#### `lib\performance.ts`
- **Hardcoded Strings**: 8
- **Sample Strings**:
    - "Performance mark not found"
    - "Performance"
    - "Failed to setup performance observers"
    - "High memory usage detected"
    - "Garbage collection forced"
    - "Bundle analysis"
    - "Bundle load time"
    - "Performance monitoring initialized"

#### `lib\pwa.ts`
- **Hardcoded Strings**: 36
- **Sample Strings**:
    - "Service Worker not supported"
    - "Service Worker registered"
    - "New Service Worker available"
    - "Service Worker registration failed"
    - "Service Worker update check completed"
    - "Service Worker update failed"
    - "SKIP_WAITING"
    - "A new version is available. Would you like to upda..."
    - "Install prompt available"
    - "App installed"

#### `lib\retry.ts`
- **Hardcoded Strings**: 9
- **Sample Strings**:
    - "Operation failed (non-retryable error)"
    - "Circuit breaker is OPEN"
    - "Circuit breaker rejected request"
    - "CircuitBreaker"
    - "Circuit breaker transitioning to HALF_OPEN"
    - "Circuit breaker closed after successful operation"
    - "Circuit breaker opened due to repeated failures"
    - "Circuit breaker manually reset"
    - "Operation timed out"

#### `lib\security-utils.ts`
- **Hardcoded Strings**: 9
- **Sample Strings**:
    - "Rate limit exceeded"
    - "RateLimiter"
    - "Password should be at least 8 characters long"
    - "Add lowercase letters"
    - "Add uppercase letters"
    - "Add numbers"
    - "Add special characters"
    - "Avoid repeating characters"
    - "Avoid common sequences"

#### `lib\translations\en.ts`
- **Hardcoded Strings**: 1321
- **Sample Strings**:
    - "Academic year created successfully"
    - "Academic year deleted successfully"
    - "Academic year set as current successfully"
    - "Academic year updated successfully"
    - "Add Academic Year"
    - "Cannot delete the current academic year. Please se..."
    - "Cannot delete global academic years"
    - "End date must be after start date"
    - "Delete Academic Year"
    - "Are you sure you want to delete this academic year..."

#### `lib\translations\ps.ts`
- **Hardcoded Strings**: 54
- **Sample Strings**:
    - "CSV صادر کول"
    - "Birth year must be 10 characters or less"
    - "Current District"
    - "Current Province"
    - "Current Village"
    - "Are you sure you want to delete this staff member?"
    - "Delete Staff"
    - "District must be 50 characters or less"
    - "Employee ID"
    - "Employee ID must be 50 characters or less"

#### `pages\AssetCategories.tsx`
- **Hardcoded Strings**: 13
- **Sample Strings**:
    - "Name is required"
    - "Name must be 100 characters or less"
    - "Code must be 50 characters or less"
    - "Description must be 500 characters or less"
    - "No categories found matching your search."
    - "No categories yet. Create your first category to g..."
    - "Edit Category"
    - "Create Category"
    - "Update the category information below."
    - "Add a new category to organize your assets."

#### `pages\AttendanceReports.tsx`
- **Hardcoded Strings**: 9
- **Sample Strings**:
    - "Export feature coming soon"
    - "Failed to export"
    - "MMM dd, yyyy"
    - "Attendance Reports"
    - "View and analyze student attendance records"
    - "All Students"
    - "All Classes"
    - "All Schools"
    - "No attendance records found"

#### `pages\AuthPage.tsx`
- **Hardcoded Strings**: 12
- **Sample Strings**:
    - "Please enter both email and password"
    - "Logged in successfully!"
    - "Sign in returned no user data"
    - "Sign in failed. Please try again."
    - "Sign in error:"
    - "Failed to sign in. Please check your credentials a..."
    - "Invalid email or password. Please check your crede..."
    - "Noto Sans Arabic"
    - "Bahij Nassim"
    - "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.27..."

#### `pages\LeaveManagement.tsx`
- **Hardcoded Strings**: 36
- **Sample Strings**:
    - "Name (Code) [Card]"
    - "Student, start date, and end date are required"
    - "Leave request created successfully"
    - "Sick - Medical condition requiring rest"
    - "Getting Outside"
    - "Getting outside of school - Personal errand"
    - "Family Emergency"
    - "Family emergency - Urgent family matter"
    - "Medical Appointment"
    - "Medical appointment - Doctor visit"

#### `pages\LibraryBooks.tsx`
- **Hardcoded Strings**: 11
- **Sample Strings**:
    - "Title is required"
    - "Title must be 255 characters or less"
    - "Author must be 255 characters or less"
    - "ISBN must be 100 characters or less"
    - "Book number must be 100 characters or less"
    - "Volume must be 50 characters or less"
    - "Price must be 0 or greater"
    - "Loan days must be at least 1"
    - "Initial copies must be 0 or greater"
    - "Copy added successfully"

#### `pages\LibraryCategories.tsx`
- **Hardcoded Strings**: 15
- **Sample Strings**:
    - "Name is required"
    - "Name must be 100 characters or less"
    - "Code must be 50 characters or less"
    - "Description must be 500 characters or less"
    - "Search categories..."
    - "No categories found matching your search."
    - "No categories yet. Create your first category to g..."
    - "Edit Category"
    - "Create Category"
    - "Update the category information below."

#### `pages\LibraryDistribution.tsx`
- **Hardcoded Strings**: 23
- **Sample Strings**:
    - "Book is required"
    - "Loan date is required"
    - "Borrower is required"
    - "No available copies for this book"
    - "Copy without ID:"
    - "Copy with invalid UUID:"
    - "Please select a borrower"
    - "Failed to issue copies:"
    - "Invalid loan ID. Please refresh the page and try a..."
    - "Invalid loan ID:"

#### `pages\StudentAdmissionsReport.tsx`
- **Hardcoded Strings**: 20
- **Sample Strings**:
    - "Admissions Report"
    - "Analyze admissions performance across schools and ..."
    - "Report filters"
    - "All schools"
    - "Academic Year"
    - "Select year"
    - "All residency"
    - "Boarders only"
    - "Show only boarding students"
    - "Invalid date range"

#### `pages\UserSettings.tsx`
- **Hardcoded Strings**: 6
- **Sample Strings**:
    - "Very Strong"
    - "Password changed successfully"
    - "Failed to change password"
    - "Confirm your new password"
    - "Changing Password..."
    - "Change Password"


## Usage Statistics by Category

- **academic**: 171/250 (68.4% used)
- **students**: 197/229 (86.0% used)
- **library**: 67/199 (33.7% used)
- **courses**: 93/139 (66.9% used)
- **toast**: 66/137 (48.2% used)
- **admissions**: 90/96 (93.8% used)
- **settings**: 56/78 (71.8% used)
- **assets**: 10/72 (13.9% used)
- **common**: 64/71 (90.1% used)
- **teacherSubjectAssignments**: 71/71 (100.0% used)
- **timetable**: 65/65 (100.0% used)
- **staff**: 1/61 (1.6% used)
- **schools**: 59/60 (98.3% used)
- **reportTemplates**: 50/57 (87.7% used)
- **attendancePage**: 50/50 (100.0% used)
- **attendanceTotalsReport**: 49/49 (100.0% used)
- **organizations**: 45/45 (100.0% used)
- **permissions**: 43/43 (100.0% used)
- **userPermissions**: 41/41 (100.0% used)
- **leave**: 0/39 (0.0% used)
- **userManagement**: 0/36 (0.0% used)
- **auth**: 4/34 (11.8% used)
- **nav**: 6/33 (18.2% used)
- **profileManagement**: 28/33 (84.8% used)
- **hostel**: 15/32 (46.9% used)
- **roles**: 30/32 (93.8% used)
- **validation**: 27/27 (100.0% used)
- **dashboard**: 17/25 (68.0% used)
- **certificateTemplates**: 3/21 (14.3% used)
- **attendanceReports**: 15/20 (75.0% used)
- **errorBoundary**: 0/17 (0.0% used)
- **resetPassword**: 15/15 (100.0% used)
- **pagination**: 7/7 (100.0% used)
- **forms**: 0/7 (0.0% used)
- **guards**: 7/7 (100.0% used)
- **ui**: 1/7 (14.3% used)

## Top Missing Keys (Most Frequently Used)

- `T` - Used 42 time(s) in 14 file(s)
- `a` - Used 14 time(s) in 14 file(s)
- ` ` - Used 7 time(s) in 5 file(s)
- `.` - Used 5 time(s) in 4 file(s)
- `style` - Used 4 time(s) in 3 file(s)
- `attendance` - Used 3 time(s) in 2 file(s)
- `@` - Used 3 time(s) in 2 file(s)
- `active` - Used 3 time(s) in 3 file(s)
- `,` - Used 3 time(s) in 2 file(s)
- `canvas` - Used 3 time(s) in 2 file(s)
- `2d` - Used 3 time(s) in 2 file(s)
- `common.total` - Used 3 time(s) in 3 file(s)
- `landing.pricing.period` - Used 3 time(s) in 1 file(s)
- `available` - Used 2 time(s) in 2 file(s)
- `iframe` - Used 2 time(s) in 2 file(s)
- `scheduled` - Used 2 time(s) in 2 file(s)
- `@/fonts/Bahij Nassim-Bold.woff?url` - Used 2 time(s) in 2 file(s)
- `dashboard` - Used 2 time(s) in 2 file(s)
- `settings` - Used 2 time(s) in 2 file(s)
- `leaveRequests` - Used 2 time(s) in 1 file(s)

## Recommendations

1. **Add missing keys** to `frontend/src/lib/translations/types.ts`
2. **Add translations** for missing keys in all language files (en.ts, ps.ts, fa.ts, ar.ts)
3. **Replace hardcoded strings** with translation keys in files listed above
4. **Focus on priority pages** (Staff Management, Attendance, Leave Requests, Reports)
5. **Consider removing unused keys** if they're truly not needed (or mark them for future use)

## Next Steps

1. Review missing keys and add them to TranslationKeys interface
2. Add translations for new keys in all 4 language files
3. Update components to use translation keys instead of hardcoded strings
4. Test translations in all languages (en, ps, fa, ar)
