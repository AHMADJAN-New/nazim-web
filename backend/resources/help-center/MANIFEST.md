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

### [ ] `attendance` (4 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `attendance.md` | generic | placeholder | `frontend/src/pages/Attendance.tsx` |
| `attendance-marking.md` | generic | placeholder | `frontend/src/pages/Attendance.tsx` (marking mode) |
| `attendance-reports.md` | generic | placeholder | `frontend/src/pages/attendance/AttendanceReportsPage.tsx` |
| `attendance-reports-totals.md` | generic | placeholder | `frontend/src/pages/AttendanceTotalsReports.tsx` |

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

### [ ] `academic` (6 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `academic-timetable-generation.md` | generic | placeholder | `frontend/src/pages/TimetableGeneration.tsx` |
| `classes.md` | generic | placeholder | Settings > Classes |
| `subjects.md` | generic | placeholder | Settings > Subjects |
| `academic-years.md` | generic | placeholder | Settings > Academic Years |
| `timetables.md` | generic | placeholder | `frontend/src/pages/TimetableGeneration.tsx` |
| `grades.md` | generic | placeholder | Settings > Grades |

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

### [ ] `library` (6 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `library.md` | generic | placeholder | Library overview |
| `library-dashboard.md` | generic | placeholder | `frontend/src/pages/LibraryDashboard.tsx` |
| `library-books.md` | generic | placeholder | Library books management |
| `library-categories.md` | generic | placeholder | Library categories |
| `library-distribution.md` | generic | placeholder | Book distribution/loans |
| `library-reports.md` | generic | placeholder | `frontend/src/pages/LibraryReports.tsx` |

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

### [ ] `events` (2 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `events.md` | generic | placeholder | `frontend/src/pages/events/EventsPage.tsx` |
| `events-types.md` | generic | placeholder | `frontend/src/pages/events/EventTypesPage.tsx` |

### [ ] `hostel` (2 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `hostel.md` | generic | placeholder | `frontend/src/pages/HostelManagement.tsx` |
| `hostel-reports.md` | generic | placeholder | `frontend/src/pages/HostelReports.tsx` |

### [ ] `assets` (5 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `assets.md` | generic | placeholder | Assets overview |
| `assets-dashboard.md` | generic | placeholder | `frontend/src/pages/assets/AssetsDashboard.tsx` |
| `assets-assignments.md` | generic | placeholder | Asset assignments |
| `assets-categories.md` | generic | placeholder | Asset categories |
| `assets-reports.md` | generic | placeholder | Asset reports |

### [ ] `subscription` (5 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `subscription.md` | generic | placeholder | `frontend/src/pages/subscription/SubscriptionPage.tsx` |
| `subscription-plans.md` | generic | placeholder | `frontend/src/pages/subscription/PlansPage.tsx` |
| `subscription-renew.md` | generic | placeholder | Subscription renewal flow |
| `subscription-maintenance-fees.md` | generic | placeholder | `frontend/src/pages/subscription/MaintenanceFeesPage.tsx` |
| `subscription-license-fees.md` | generic | placeholder | `frontend/src/pages/subscription/LicenseFeesPage.tsx` |

### [ ] `courses` (7 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `short-term-courses.md` | generic | placeholder | `frontend/src/pages/ShortTermCourses.tsx` |
| `course-students.md` | generic | placeholder | `frontend/src/pages/CourseStudents.tsx` |
| `course-students-reports.md` | generic | placeholder | `frontend/src/pages/CourseStudentReports.tsx` |
| `course-dashboard.md` | generic | placeholder | Course dashboard |
| `course-attendance.md` | generic | placeholder | `frontend/src/pages/CourseAttendance.tsx` |
| `course-certificates.md` | generic | placeholder | Course certificates |
| `course-documents.md` | generic | placeholder | Course documents |

### [ ] `graduation` (3 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `graduation.md` | generic | placeholder | `frontend/src/pages/graduation/GraduationDashboard.tsx` |
| `graduation-batches.md` | generic | placeholder | `frontend/src/pages/graduation/GraduationBatchesPage.tsx` |
| `graduation-certificate-templates.md` | generic | placeholder | `frontend/src/pages/graduation/CertificateTemplatesPage.tsx` |

### [ ] `certificates` (3 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `certificate-templates.md` | generic | placeholder | Certificate template management |
| `certificates-templates.md` | generic | placeholder | Certificate templates list |
| `certificates-issued.md` | generic | placeholder | `frontend/src/pages/graduation/IssuedCertificatesPage.tsx` |

### [ ] `id-cards` (3 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `id-cards-templates.md` | generic | placeholder | ID card template management |
| `id-cards-assignment.md` | generic | placeholder | `frontend/src/pages/IdCardAssignment.tsx` |
| `id-cards-export.md` | generic | placeholder | `frontend/src/pages/IdCardExport.tsx` |

### [~] `reports` (2 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `reports-student-registrations.md` | generic | placeholder | Student registration reports |
| `reports-staff-registrations.md` | done | done | `frontend/src/pages/StaffReport.tsx` |

### [ ] `leave` (2 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `leave-requests.md` | generic | placeholder | Leave requests management |
| `leave-requests-reports.md` | generic | placeholder | Leave reports |

### [ ] `general` (5 articles)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `getting-started.md` | generic | placeholder | Getting started guide |
| `account-profile.md` | generic | placeholder | Account & profile settings |
| `general-questions.md` | generic | placeholder | FAQ / general questions |
| `dashboard.md` | generic | placeholder | `frontend/src/pages/Dashboard.tsx` |
| `phonebook.md` | generic | placeholder | Phonebook feature |

### [ ] `admin` (1 article)
| Article File | EN Status | PS Status | Frontend Page Reference |
|---|---|---|---|
| `admin-users.md` | generic | placeholder | Admin user management |

---

## Summary

| Folder | Articles | EN Done | PS Done |
|---|---|---|---|
| students | 5 | 0 | 0 |
| staff | 2 | 2 | 2 |
| attendance | 4 | 0 | 0 |
| finance | 22 | 0 | 0 |
| academic | 6 | 0 | 0 |
| exams | 20 | 0 | 0 |
| library | 6 | 0 | 0 |
| settings | 19 | 0 | 0 |
| dms | 11 | 0 | 0 |
| events | 2 | 0 | 0 |
| hostel | 2 | 0 | 0 |
| assets | 5 | 0 | 0 |
| subscription | 5 | 0 | 0 |
| courses | 7 | 0 | 0 |
| graduation | 3 | 0 | 0 |
| certificates | 3 | 0 | 0 |
| id-cards | 3 | 0 | 0 |
| reports | 2 | 1 | 1 |
| leave | 2 | 0 | 0 |
| general | 5 | 0 | 0 |
| admin | 1 | 0 | 0 |
| **TOTAL** | **133** | **0** | **0** |
