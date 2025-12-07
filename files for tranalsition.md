Searching for files that need translation updates. Identifying components and pages with hardcoded English strings.


[15 tools called]


Checking a few more files to complete the list:


[6 tools called]


## Files that need translation updates

### Priority 1: Main page components (no `useLanguage`)

#### Assets module
1. `frontend/src/components/assets/AssetManagement.tsx` — Asset management component
2. `frontend/src/pages/AssetCategories.tsx` — Categories page
3. `frontend/src/pages/AssetAssignments.tsx` — Assignments page
4. `frontend/src/pages/AssetReports.tsx` — Reports page

#### Short-term courses module
5. `frontend/src/components/short-term-courses/ShortTermCourseFormDialog.tsx` — Course form dialog
6. `frontend/src/components/short-term-courses/EnrollFromMainDialog.tsx` — Enrollment dialog
7. `frontend/src/components/short-term-courses/AssignToCourseDialog.tsx` — Assignment dialog
8. `frontend/src/components/short-term-courses/CourseStudentFormDialog.tsx` — Student form dialog
9. `frontend/src/components/short-term-courses/CourseStudentDetailsPanel.tsx` — Student details panel
10. `frontend/src/components/short-term-courses/CourseDocumentsDialog.tsx` — Documents dialog
11. `frontend/src/components/short-term-courses/CertificatePdfGenerator.tsx` — Certificate generator

#### Hostel module
18. `frontend/src/pages/HostelManagement.tsx` — Uses translations (partial)
19. `frontend/src/pages/HostelReports.tsx` — Reports page

#### Leave management module
20. `frontend/src/pages/LeaveReports.tsx` — Reports page

#### Staff module
21. `frontend/src/pages/StaffList.tsx` — Uses translations (partial)
22. `frontend/src/pages/StaffReport.tsx` — Reports page
23. `frontend/src/components/staff/StaffProfile.tsx` — Staff profile component

#### Library module
24. `frontend/src/pages/LibraryBooks.tsx` — Books page
25. `frontend/src/pages/LibraryCategories.tsx` — Categories page
26. `frontend/src/pages/LibraryDistribution.tsx` — Distribution page
27. `frontend/src/pages/LibraryReports.tsx` — Reports page

#### User management module
28. `frontend/src/components/admin/UserManagement.tsx` — User management component
29. `frontend/src/pages/UserSettings.tsx` — User settings page
30. `frontend/src/pages/UserProfile.tsx` — User profile page

#### Certificate templates
31. `frontend/src/components/certificates/CertificateLayoutEditor.tsx` — Layout editor

### Priority 2: Settings components

32. `frontend/src/components/settings/BuildingsManagement.tsx` — Buildings management
19. `frontend/src/components/settings/RoomsManagement.tsx` — Rooms management
20. `frontend/src/components/settings/ClassesManagement.tsx` — Classes management
21. `frontend/src/components/settings/SubjectsManagement.tsx` — Subjects management
22. `frontend/src/components/settings/ScheduleSlotsManagement.tsx` — Schedule slots
23. `frontend/src/components/settings/ResidencyTypesManagement.tsx` — Residency types
24. `frontend/src/components/settings/AcademicYearsManagement.tsx` — Academic years
25. `frontend/src/components/settings/StaffTypesManagement.tsx` — Staff types
26. `frontend/src/components/settings/TeacherSubjectAssignments.tsx` — Teacher assignments
27. `frontend/src/components/settings/SchoolsManagement.tsx` — Schools management
28. `frontend/src/components/settings/RolesManagement.tsx` — Roles management
29. `frontend/src/components/settings/PermissionsManagement.tsx` — Permissions management
30. `frontend/src/components/settings/OrganizationsManagement.tsx` — Organizations management
31. `frontend/src/components/settings/UserPermissionsManagement.tsx` — User permissions
32. `frontend/src/components/settings/ReportTemplatesManagement.tsx` — Report templates
33. `frontend/src/components/settings/ProfileManagement.tsx` — Profile management

### Priority 3: Timetable components

34. `frontend/src/pages/TimetableGeneration.tsx` — Timetable generation page
35. `frontend/src/components/timetable/TimetableGenerator.tsx` — Generator component
36. `frontend/src/components/timetable/TeacherPreferencesDialog.tsx` — Teacher preferences
37. `frontend/src/components/timetable/LoadTimetableDialog.tsx` — Load dialog
38. `frontend/src/components/timetable/SaveTimetableDialog.tsx` — Save dialog
39. `frontend/src/components/timetable/TeacherTimetableTable.tsx` — Teacher table
40. `frontend/src/components/timetable/ClassTimetableTable.tsx` — Class table

### Priority 4: Student components (partial translations)

41. `frontend/src/components/students/StudentFormDialog.tsx` — Student form (uses translations, may need more)
42. `frontend/src/components/students/StudentProfileView.tsx` — Profile view (has hardcoded English strings)
43. `frontend/src/components/students/StudentDocumentsDialog.tsx` — Documents dialog
44. `frontend/src/components/students/StudentEducationalHistoryDialog.tsx` — Educational history
45. `frontend/src/components/students/StudentDisciplineRecordsDialog.tsx` — Discipline records
46. `frontend/src/components/students/StudentFormSections.tsx` — Form sections
47. `frontend/src/components/students/StudentProfilePrint.tsx` — Profile print
48. `frontend/src/components/students/StudentPictureUpload.tsx` — Picture upload
49. `frontend/src/components/students/StudentAutocompleteInput.tsx` — Autocomplete input

### Priority 5: Other pages

50. `frontend/src/pages/Dashboard.tsx` — Dashboard (may need updates)
51. `frontend/src/pages/Attendance.tsx` — Attendance page (uses translations, may need more)
52. `frontend/src/pages/AttendanceReports.tsx` — Attendance reports
53. `frontend/src/pages/AttendanceTotalsReports.tsx` — Totals reports
54. `frontend/src/pages/StudentAdmissions.tsx` — Admissions page (uses translations, may need more)
55. `frontend/src/pages/StudentAdmissionsReport.tsx` — Admissions report
56. `frontend/src/pages/StudentReport.tsx` — Student report
57. `frontend/src/pages/Index.tsx` — Index page
58. `frontend/src/pages/NotFound.tsx` — 404 page
59. `frontend/src/pages/ResetPasswordPage.tsx` — Reset password page
60. `frontend/src/pages/AuthPage.tsx` — Auth page

### Priority 6: Layout components

61. `frontend/src/components/layout/AppHeader.tsx` — App header (may need updates)
62. `frontend/src/components/layout/AppSidebar.tsx` — App sidebar (may need updates)
63. `frontend/src/components/layout/MainLayout.tsx` — Main layout

### Summary

- Total files: ~85 files
- Priority 1 (main pages): 25 files (14 completed ✅)
- Priority 2 (settings): 16 files
- Priority 3 (timetable): 7 files
- Priority 4 (student components): 9 files
- Priority 5 (other pages): 10 files
- Priority 6 (layout): 3 files

### Quick check method

To find files that need updates, search for:
- Hardcoded English strings in quotes
- Missing `useLanguage` hook imports
- Components without `const { t } = useLanguage()`

### Recommended approach

1. Start with Priority 1 (main pages) — highest impact
2. Then Priority 2 (settings) — frequently used
3. Then Priority 3–6 — as needed

Should I start updating specific files, or do you want a detailed breakdown for a particular module first?