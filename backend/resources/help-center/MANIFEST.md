# Help Center Article Manifest

> This manifest tracks all help center article folders, their articles, and generation status.
> Used by the Cursor rule `help-center-workflow-generation.mdc` for systematic article creation.

## How to Use

1. Pick a folder marked `[ ] Not started` below
2. Ask Cursor: **"Generate help center articles for the `{folder}` folder"**
3. Cursor will: read frontend pages → write EN articles → translate to PS
4. After generation, mark the folder `[x] Done` in this file
5. Run `php artisan db:seed --class=HelpCenterArticleSeeder` to load into DB

## Status Legend

- `[ ]` = Not started (EN is generic placeholder, PS is placeholder)
- `[~]` = EN done, PS still placeholder
- `[x]` = Both EN and PS complete

---

## Folders & Articles

### [ ] `students` (5 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `students.md` | generic | placeholder | `frontend/src/pages/Students.tsx` |
| `students-import.md` | generic | placeholder | `frontend/src/pages/students/StudentsImportPage.tsx` |
| `students-history.md` | generic | placeholder | `frontend/src/pages/students/StudentHistoryPage.tsx`, `StudentHistoryListPage.tsx` |
| `admissions.md` | generic | placeholder | `frontend/src/pages/StudentAdmissions.tsx` |
| `admissions-report.md` | generic | placeholder | `frontend/src/pages/StudentAdmissionsReport.tsx` |

### [x] `staff` (2 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `staff.md` | done | done | `frontend/src/pages/StaffList.tsx` |
| `staff-report.md` | done | done | `frontend/src/pages/StaffReport.tsx`, links to reports |

### [x] `attendance` (4 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `attendance.md` | done | done | `frontend/src/pages/Attendance.tsx` |
| `attendance-marking.md` | done | done | `frontend/src/pages/AttendanceMarking.tsx` |
| `attendance-reports.md` | done | done | `frontend/src/pages/AttendanceReports.tsx` |
| `attendance-reports-totals.md` | done | done | `frontend/src/pages/AttendanceTotalsReports.tsx` |

### [ ] `finance` (22 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `finance.md` | generic | placeholder | `frontend/src/pages/finance/` (overview) |
| `finance-dashboard.md` | generic | placeholder | `frontend/src/pages/finance/FinanceDashboard.tsx` |
| `finance-accounts.md` | generic | placeholder | `frontend/src/pages/finance/FinanceAccounts.tsx` |
| `finance-income.md` | generic | placeholder | `frontend/src/pages/finance/IncomeEntries.tsx` |
| `finance-income-categories.md` | generic | placeholder | `frontend/src/pages/finance/IncomeCategories.tsx` |
| `finance-expenses.md` | generic | placeholder | `frontend/src/pages/finance/ExpenseEntries.tsx` |
| `finance-expenses-categories.md` | generic | placeholder | `frontend/src/pages/finance/ExpenseCategories.tsx` |
| `finance-projects.md` | generic | placeholder | `frontend/src/pages/finance/FinanceProjects.tsx` |
| `finance-donors.md` | generic | placeholder | `frontend/src/pages/finance/Donors.tsx` |
| `finance-documents.md` | generic | placeholder | `frontend/src/pages/finance/FinanceDocuments.tsx` |
| `finance-currencies.md` | generic | placeholder | `frontend/src/pages/finance/Currencies.tsx` |
| `finance-exchange-rates.md` | generic | placeholder | `frontend/src/pages/finance/ExchangeRates.tsx` |
| `finance-reports.md` | generic | placeholder | `frontend/src/pages/finance/FinanceReports.tsx` |
| `finance-settings.md` | generic | placeholder | `frontend/src/pages/finance/FinanceSettings.tsx` |
| `fees.md` | generic | placeholder | `frontend/src/pages/fees/` (overview) |
| `finance-fees-dashboard.md` | generic | placeholder | `frontend/src/pages/fees/FeeDashboard.tsx` |
| `finance-fees-structures.md` | generic | placeholder | `frontend/src/pages/fees/FeeStructuresPage.tsx` |
| `finance-fees-assignments.md` | generic | placeholder | `frontend/src/pages/fees/FeeAssignmentsPage.tsx` |
| `finance-fees-payments.md` | generic | placeholder | `frontend/src/pages/fees/FeePaymentsPage.tsx` |
| `finance-fees-exceptions.md` | generic | placeholder | `frontend/src/pages/fees/FeeExceptionsPage.tsx` |
| `finance-fees-reports.md` | generic | placeholder | `frontend/src/pages/fees/FeeReportsPage.tsx` |

### [x] `academic` (6 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `academic-timetable-generation.md` | done | done | `frontend/src/pages/TimetableGeneration.tsx` |
| `classes.md` | done | done | Settings > Classes |
| `subjects.md` | done | done | Settings > Subjects |
| `academic-years.md` | done | done | Settings > Academic Years |
| `timetables.md` | done | done | `frontend/src/pages/TimetableGeneration.tsx` |
| `grades.md` | done | done | Settings > Grades |

### [ ] `exams` (20 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `exams.md` | generic | placeholder | `frontend/src/pages/Exams.tsx` |
| `exams-timetables.md` | generic | placeholder | `frontend/src/pages/ExamTimetablePage.tsx` |
| `exams-enrollment.md` | generic | placeholder | Exam enrollment flow |
| `exams-student-enrollment.md` | generic | placeholder | Exam student enrollment |
| `exams-marks.md` | generic | placeholder | Exam marks entry |
| `exams-reports.md` | generic | placeholder | `frontend/src/pages/ExamReportsPage.tsx` |
| `exams-analytics.md` | generic | placeholder | Exam analytics |
| `exams-attendance.md` | generic | placeholder | `frontend/src/pages/ExamAttendancePage.tsx` |
| `exams-roll-numbers.md` | generic | placeholder | Roll number management |
| `exams-secret-numbers.md` | generic | placeholder | Secret number management |
| `exams-number-reports.md` | generic | placeholder | Number reports |
| `exams-reports-hub.md` | generic | placeholder | Reports hub |
| `exams-reports-consolidated.md` | generic | placeholder | Consolidated reports |
| `exams-reports-class-subject.md` | generic | placeholder | Class-subject reports |
| `exams-reports-student.md` | generic | placeholder | Student reports |
| `exams-question-bank.md` | generic | placeholder | `frontend/src/pages/QuestionBank.tsx` |
| `exams-papers.md` | generic | placeholder | Exam papers |
| `exams-paper-templates.md` | generic | placeholder | `frontend/src/pages/ExamPaperTemplates.tsx` |
| `exams-papers-print-tracking.md` | generic | placeholder | Print tracking |
| `exam-documents.md` | generic | placeholder | `frontend/src/pages/ExamDocuments.tsx` |

### [x] `library` (6 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `library.md` | done | done | Library overview, `frontend/src/pages/Library.tsx` |
| `library-dashboard.md` | done | done | `frontend/src/pages/LibraryDashboard.tsx` |
| `library-books.md` | done | done | `frontend/src/pages/LibraryBooks.tsx` |
| `library-categories.md` | done | done | `frontend/src/pages/LibraryCategories.tsx` |
| `library-distribution.md` | done | done | `frontend/src/pages/LibraryDistribution.tsx` |
| `library-reports.md` | done | done | `frontend/src/pages/LibraryReports.tsx` |

### [ ] `settings` (19 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `settings-organizations.md` | generic | placeholder | Settings > Organizations |
| `settings-buildings.md` | generic | placeholder | Settings > Buildings |
| `settings-rooms.md` | generic | placeholder | Settings > Rooms |
| `settings-profile.md` | generic | placeholder | Settings > Profile |
| `settings-permissions.md` | generic | placeholder | Settings > Permissions |
| `settings-roles.md` | generic | placeholder | Settings > Roles |
| `settings-user-permissions.md` | generic | placeholder | Settings > User Permissions |
| `settings-schools.md` | generic | placeholder | Settings > Schools |
| `settings-report-templates.md` | generic | placeholder | Settings > Report Templates |
| `settings-residency-types.md` | generic | placeholder | Settings > Residency Types |
| `settings-academic-years.md` | generic | placeholder | Settings > Academic Years |
| `settings-exam-types.md` | generic | placeholder | Settings > Exam Types |
| `settings-classes.md` | generic | placeholder | Settings > Classes |
| `settings-subjects.md` | generic | placeholder | Settings > Subjects |
| `settings-schedule-slots.md` | generic | placeholder | Settings > Schedule Slots |
| `settings-teacher-subject-assignments.md` | generic | placeholder | Settings > Teacher-Subject Assignments |
| `settings-staff-types.md` | generic | placeholder | Settings > Staff Types |
| `settings-grades.md` | generic | placeholder | Settings > Grades |
| `settings-user.md` | generic | placeholder | Settings > User Management |

### [ ] `dms` (11 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `dms-dashboard.md` | generic | placeholder | `frontend/src/pages/dms/DmsDashboard.tsx` |
| `dms-incoming.md` | generic | placeholder | `frontend/src/pages/dms/IncomingDocuments.tsx` |
| `dms-outgoing.md` | generic | placeholder | `frontend/src/pages/dms/OutgoingDocuments.tsx` |
| `dms-issue-letter.md` | generic | placeholder | `frontend/src/pages/dms/IssueLetter.tsx` |
| `dms-templates.md` | generic | placeholder | `frontend/src/pages/dms/TemplatesPage.tsx` |
| `dms-letterheads.md` | generic | placeholder | `frontend/src/pages/dms/LetterheadsPage.tsx` |
| `dms-letter-types.md` | generic | placeholder | `frontend/src/pages/dms/LetterTypesPage.tsx` |
| `dms-departments.md` | generic | placeholder | `frontend/src/pages/dms/DepartmentsPage.tsx` |
| `dms-archive.md` | generic | placeholder | `frontend/src/pages/dms/ArchiveSearch.tsx` |
| `dms-reports.md` | generic | placeholder | `frontend/src/pages/dms/DmsReports.tsx` |
| `dms-settings.md` | generic | placeholder | `frontend/src/pages/dms/DmsSettings.tsx` |

### [x] `events` (2 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `events.md` | done | done | `frontend/src/pages/events/EventsPage.tsx` |
| `events-types.md` | done | done | `frontend/src/pages/events/EventTypesPage.tsx` |

### [x] `hostel` (2 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `hostel.md` | done | done | `frontend/src/pages/HostelManagement.tsx` |
| `hostel-reports.md` | done | done | `frontend/src/pages/HostelReports.tsx` |

### [x] `assets` (5 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `assets.md` | done | done | Assets overview; `frontend/src/pages/Assets.tsx`, AssetListTab, AssetMaintenanceTab |
| `assets-dashboard.md` | done | done | `frontend/src/pages/assets/AssetsDashboard.tsx` |
| `assets-assignments.md` | done | done | `frontend/src/pages/AssetAssignments.tsx`, AssetAssignmentsTab |
| `assets-categories.md` | done | done | `frontend/src/pages/AssetCategories.tsx` |
| `assets-reports.md` | done | done | `frontend/src/pages/AssetReports.tsx`, AssetReportsTab |

### [x] `subscription` (5 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `subscription.md` | done | done | `frontend/src/pages/subscription/SubscriptionPage.tsx` |
| `subscription-plans.md` | done | done | `frontend/src/pages/subscription/PlansPage.tsx` |
| `subscription-renew.md` | done | done | `frontend/src/pages/subscription/RenewPage.tsx` |
| `subscription-maintenance-fees.md` | done | done | `frontend/src/pages/subscription/MaintenanceFeesPage.tsx` |
| `subscription-license-fees.md` | done | done | `frontend/src/pages/subscription/LicenseFeesPage.tsx` |

### [x] `courses` (7 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `short-term-courses.md` | done | done | `frontend/src/pages/ShortTermCourses.tsx` |
| `course-students.md` | done | done | `frontend/src/pages/CourseStudents.tsx` |
| `course-students-reports.md` | done | done | `frontend/src/pages/CourseStudentReports.tsx` |
| `course-dashboard.md` | done | done | `frontend/src/pages/CourseDashboard.tsx` |
| `course-attendance.md` | done | done | `frontend/src/pages/CourseAttendance.tsx` |
| `course-certificates.md` | done | done | `frontend/src/pages/CourseCertificates.tsx` |
| `course-documents.md` | done | done | `frontend/src/pages/CourseDocuments.tsx` |

### [x] `graduation` (3 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `graduation.md` | done | done | `frontend/src/pages/graduation/GraduationDashboard.tsx` |
| `graduation-batches.md` | done | done | `frontend/src/pages/graduation/GraduationBatchesPage.tsx` |
| `graduation-certificate-templates.md` | done | done | `frontend/src/pages/graduation/CertificateTemplatesPage.tsx` |

### [x] `certificates` (3 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `certificate-templates.md` | done | done | `frontend/src/pages/CertificateTemplates.tsx` (course) |
| `certificates-templates.md` | done | done | `frontend/src/pages/graduation/GraduationCertificateTemplates.tsx` |
| `certificates-issued.md` | done | done | `frontend/src/pages/graduation/IssuedCertificatesPage.tsx` |

### [x] `id-cards` (3 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `id-cards-templates.md` | done | done | `frontend/src/pages/IdCardTemplates.tsx` |
| `id-cards-assignment.md` | done | done | `frontend/src/pages/IdCardAssignment.tsx` |
| `id-cards-export.md` | done | done | `frontend/src/pages/IdCardExport.tsx` |

### [~] `reports` (2 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `reports-student-registrations.md` | generic | placeholder | Student registration reports |
| `reports-staff-registrations.md` | done | done | `frontend/src/pages/StaffReport.tsx` |

### [x] `leave` (2 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `leave-requests.md` | done | done | `frontend/src/pages/LeaveManagement.tsx` |
| `leave-requests-reports.md` | done | done | `frontend/src/pages/LeaveReports.tsx` |

### [x] `general` (5 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `getting-started.md` | done | done | Getting started guide |
| `account-profile.md` | done | done | `frontend/src/pages/UserProfile.tsx`, Settings |
| `general-questions.md` | done | done | FAQ / general questions |
| `dashboard.md` | done | done | `frontend/src/pages/Dashboard.tsx` |
| `phonebook.md` | done | done | `frontend/src/pages/PhoneBook.tsx` |

### [ ] `admin` (1 article)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `admin-users.md` | generic | placeholder | Admin user management |

---

## Summary

| Folder | Articles | EN Done | PS Done |
|---|---|---|---|
| students | 5 | 5 | 5 |
| staff | 2 | 2 | 2 |
| attendance | 4 | 4 | 4 |
| finance | 22 | 0 | 0 |
| academic | 6 | 6 | 6 |
| exams | 20 | 0 | 0 |
| library | 6 | 6 | 6 |
| settings | 19 | 0 | 0 |
| dms | 11 | 0 | 0 |
| events | 2 | 2 | 2 |
| hostel | 2 | 2 | 2 |
| assets | 5 | 5 | 5 |
| subscription | 5 | 5 | 5 |
| courses | 7 | 7 | 7 |
| graduation | 3 | 3 | 3 |
| certificates | 3 | 3 | 3 |
| id-cards | 3 | 3 | 3 |
| reports | 2 | 1 | 1 |
| leave | 2 | 2 | 2 |
| general | 5 | 5 | 5 |
| admin | 1 | 0 | 0 |
| **TOTAL** | **133** | **20** | **20** |
