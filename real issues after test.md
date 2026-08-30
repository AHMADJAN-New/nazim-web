# Post-Test Fix Manifest

Use this file as the source of truth for bugs and UX issues found during testing. Each item includes the route, expected behavior, likely root cause, and files to change.

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` fixed · `[—]` won't fix

---

## Summary by module

| # | Module | Priority | Route(s) |
|---|--------|----------|----------|
| 1 | Academic → Subjects | High | `/settings/subjects` |
| 2 | Academic → Subjects (copy) | High | `/settings/subjects` |
| 3 | Admissions → UI | Medium | `/students/admissions` |
| 4 | Admissions → Status labels | Medium | `/students/admissions` |
| 5 | Student history → List | High | `/students/history` |
| 6 | Student history → Status | High | `/students/:studentId/history` |
| 7 | Student history / Admissions → Export language | Medium | History + admissions report |
| 8 | Staff → Report export | Medium | `/staff/reports` |
| 9 | Staff → Pashto labels (Islamic studies) | Low | `/staff` |
| 10 | Settings → Schedule slots | High | `/settings/schedule-slots` |
| 11 | Academic → Timetables | Medium | `/academic/timetable-generation` |
| 12 | Settings → Academic years | Low | `/settings/academic-years` |
| 13 | Leave requests → Card scan + attendance | High | `/leave-requests`, `/attendance` |
| 14 | Leave requests → History tab | High | `/leave-requests` |
| 15 | Events → Dialogs i18n | Medium | `/events` |
| 16 | Assets → i18n | Medium | `/assets` |
| 17 | Documents → i18n | Medium | Various |
| 18 | Course certificates → Edit dialog i18n | Medium | `/course-certificates` |
| 19 | ID card templates → Field labels i18n | Medium | `/id-cards/templates` |
| 20 | Exams → Report card print layout | Medium | `/exams/reports/student` |

---

## 1. Subjects dropdowns only show paginated page

- **Status:** `[x]`
- **Route:** `/settings/subjects`
- **Problem:** Subject dropdowns in assign/copy dialogs only show ~25 subjects (current table page), not the full list.
- **Expected:** All organization subjects appear in every subject dropdown.
- **Root cause:** `SubjectsManagement.tsx` reuses the same paginated `useSubjects()` data for both the table and dropdowns.
- **Files to change:**
  - `frontend/src/components/settings/SubjectsManagement.tsx`
  - `frontend/src/hooks/useSubjects.tsx`
  - `backend/app/Http/Controllers/SubjectController.php` (optional: add unpaginated list endpoint or `per_page=all`)
- **Fix approach:** Add a separate unpaginated query for dropdowns (e.g. `useSubjects(orgId, { paginate: false })`) or fetch all when a dialog opens.

---

## 2. Copy subjects — class dropdown limited to one academic year

- **Status:** `[x]`
- **Route:** `/settings/subjects` → Copy between years dialog
- **Problem:** Copy dialog shows all classes for the selected year but does not list classes from other academic years in the from/to dropdowns.
- **Expected:** User can pick source and target classes across different academic years.
- **Root cause:** Copy dialog loads `classAcademicYears` scoped to a single `selectedAcademicYearId`.
- **Files to change:**
  - `frontend/src/components/settings/SubjectsManagement.tsx` (copy dialog ~1715+)
  - `frontend/src/hooks/useSubjects.tsx` (`useCopySubjectsBetweenYears`)
  - `frontend/src/hooks/useClasses.tsx` (`useClassAcademicYears`)
- **Fix approach:** Load class academic years for both source and target year selections, or load org-wide class-year list with year labels in each option.

---

## 3. Show father name under student name (admissions)

- **Status:** `[x]`
- **Route:** `/students/admissions`
- **Problem:** Father name is missing in three places:
  1. Admissions list/table
  2. Admission details side panel
  3. Student dropdown inside admission form dialog
- **Expected:** Student name with father name shown underneath or as secondary text (e.g. `Ahmad` / `Father: Mohammad`).
- **Root cause:** API returns `father_name`; UI only renders `fullName` / `full_name`.
- **Files to change:**
  - `frontend/src/pages/StudentAdmissions.tsx`
  - `frontend/src/components/admissions/AdmissionDetailsPanel.tsx`
  - `frontend/src/components/admissions/AdmissionFormDialog.tsx` (student Combobox)
  - `frontend/src/components/students/StudentAdmissionsDialog.tsx` (if used)
- **Translation keys:** `students.fatherName`, `admissions.*`

---

## 4. Wrong “active” label when student has multiple admissions

- **Status:** `[x]`
- **Route:** `/students/admissions`
- **Problem:** When a student has 2–3 admissions and one is inactive, the UI shows the wrong admission as “active” or uses generic active/inactive wording.
- **Expected:** Each admission row/panel shows **that admission’s** enrollment status with correct localized label.
- **Root cause:** Status badges use `events.active` / `events.inactive` instead of admission-specific keys; possible mismatch between selected admission and displayed status.
- **Files to change:**
  - `frontend/src/components/admissions/AdmissionDetailsPanel.tsx`
  - `frontend/src/components/admissions/AdmissionFormDialog.tsx`
  - `frontend/src/pages/StudentAdmissions.tsx`
- **Fix approach:** Use `admissions.enrollmentStatus`, `admissions.admitted`, `admissions.pending`, etc. Tie badge to the admission being viewed, not a global student flag.

---

## 5. Student history list — search and pagination broken

- **Status:** `[x]`
- **Route:** `/students/history`
- **Problem:**
  1. Search only filters the current page, not all students.
  2. Pagination pages do not change correctly (or totals are wrong).
- **Expected:** Search queries the server across all students; pagination navigates full result set.
- **Root cause:** Client-side filter on already-paginated data; `search` not sent to API.
- **Files to change:**
  - `frontend/src/pages/students/StudentHistoryListPage.tsx`
  - `frontend/src/hooks/useStudents.tsx`
  - `backend/app/Http/Controllers/StudentController.php`
- **Fix approach:** Pass `search` (and filters) to API; remove client-side filter on paginated rows; use server pagination meta for page controls.

---

## 6. Student history detail — status from wrong year

- **Status:** `[x]`
- **Route:** `/students/:studentId/history`
- **Problem:** Student is active in the current year but inactive in a previous year; history header still shows **inactive**.
- **Expected:** Current-year active enrollment drives the displayed status; historical years show their own status in timeline sections.
- **Root cause:** `StudentHistoryService` picks “current” admission by latest `admission_date` globally, not current academic year or active enrollment.
- **Files to change:**
  - `backend/app/Services/StudentHistoryService.php`
  - `backend/app/Http/Controllers/StudentHistoryController.php`
  - `frontend/src/pages/students/StudentHistoryPage.tsx`
  - `frontend/src/hooks/useStudentHistory.tsx`
- **Fix approach:** Resolve status from current academic year’s admission, or prefer `enrollment_status = active` for the org’s current year.

---

## 7. Exports ignore user language (English instead of Pashto/Dari/Arabic)

- **Status:** `[x]`
- **Routes:** `/students/:studentId/history`, admissions report page
- **Problem:** PDF/Excel download from student history and admission form/report always appears in English.
- **Expected:** Export uses selected UI language and calendar preference (same as rest of app).
- **Root cause:** Export calls omit `language` and `calendar_preference`; backend defaults may not match user locale.
- **Files to change:**
  - `frontend/src/pages/students/StudentHistoryPage.tsx`
  - `frontend/src/hooks/useStudentHistory.tsx`
  - `frontend/src/pages/StudentAdmissionsReport.tsx` (or equivalent report page)
  - `frontend/src/components/reports/ReportExportButtons.tsx`
  - `frontend/src/hooks/useServerReport.ts`
  - `backend/app/Http/Controllers/StudentHistoryController.php`
- **Fix approach:** Pass `language` from `useLanguage()` and calendar from `calendarState` on every `generateReport` / export mutation.

---

## 8. Staff report — names merged into one column

- **Status:** `[x]`
- **Route:** `/staff/reports`
- **Problem:** Download (and possibly table) shows full name, father name, and grandfather name in a single line/column.
- **Expected:** Separate columns: first name, father name, grandfather name (in table and Excel/PDF).
- **Root cause:** Export emphasizes concatenated `full_name` alongside or instead of separate fields.
- **Files to change:**
  - `frontend/src/pages/StaffReport.tsx`
  - `backend/app/Http/Controllers/StaffReportController.php`
  - `frontend/src/mappers/staffMapper.ts`
- **Fix approach:** Default export columns to `first_name`, `father_name`, `grandfather_name`; align on-screen table columns the same way.

---

## 9. Staff Islamic studies — Pashto label corrections

- **Status:** `[x]`
- **Route:** `/staff` (forms, profile, list)
- **Problem:** Wrong terminology in Pashto for Islamic school context:

| Current (wrong) | Should be |
|-----------------|-----------|
| `پوهنتون/موسسه` (university/institution) | **مدرسه** (madrasa) |
| `دیپارتمنت / څانګه` | **Remove department label** (not used in Islamic studies staff) |
| `دنده / بست` | **بست** only |

- **Expected:** Labels match madrasa terminology; department field hidden or relabeled where applicable.
- **Files to change:**
  - `frontend/src/lib/translations/pages/staff/staff.ps.ts` (`universityInstitution`, `department`, `position`, `religiousDepartment`)
  - Review `staff.fa.ts` / `staff.ar.ts` for consistency
  - Staff form components if field visibility must change

---

## 10. Schedule slot edit sends organization_id (should not)

- **Status:** `[x]`
- **Route:** `/settings/schedule-slots`
- **Problem:** Editing a time slot tries to update `organization_id` (validation error or wrong behavior).
- **Expected:** Updates must never change `organization_id` or `school_id`; tenant context stays from middleware.
- **Root cause:** Frontend update payload includes `organizationId`; Form Request may still allow it.
- **Files to change:**
  - `frontend/src/components/settings/ScheduleSlotsManagement.tsx`
  - `frontend/src/hooks/useScheduleSlots.tsx`
  - `frontend/src/mappers/scheduleSlotMapper.ts`
  - `backend/app/Http/Requests/UpdateScheduleSlotRequest.php`
- **Fix approach:** Strip `organization_id` / `school_id` from update payload on frontend; remove from update validation rules if present.

---

## 11. Timetables — teacher “father name” includes grandfather

- **Status:** `[x]`
- **Route:** `/academic/timetable-generation`, teacher subject assignments
- **Problem:** Teacher father name column/label shows `father_name + grandfather_name` on one line.
- **Expected:** Father name column shows father name only.
- **Root cause:** UI concatenates `first_name`, `father_name`, `grandfather_name` for display.
- **Files to change:**
  - `frontend/src/components/settings/TeacherSubjectAssignments.tsx`
  - `frontend/src/components/timetable/TimetableGenerator.tsx`
  - `frontend/src/components/timetable/ClassTimetableTable.tsx`
  - `frontend/src/components/timetable/TeacherTimetableTable.tsx`
- **Fix approach:** Use `father_name` only in father column; keep full name separate if needed elsewhere.

---

## 12. Academic year name — max 20 characters + localized validation

- **Status:** `[x]`
- **Route:** `/settings/academic-years`
- **Problem:**
  1. Field allows up to 100 characters; should be **20 max**.
  2. Validation message is hardcoded English (e.g. user saw: “تعليمي کال بايد لس حروفو څخه کم وي” requirement not enforced consistently).
- **Expected:** Max 20 characters; error message in all four locales.
- **Files to change:**
  - `frontend/src/components/settings/AcademicYearsManagement.tsx` (Zod schema)
  - `frontend/src/lib/validations/` (shared schema if exists)
  - `backend/app/Http/Controllers/AcademicYearController.php` or Form Request
  - `frontend/src/lib/translations/pages/academic/academic.{en,ps,fa,ar}.ts`
- **Fix approach:** Set `max(20)` frontend + backend; add translation key for max-length message.

---

## 13. Leave request — card scan, save, history, and attendance integration

- **Status:** `[x]`
- **Routes:** `/leave-requests`, `/attendance`, `/attendance/marking`
- **Problems:**
  1. After card scan: class is selected but **student name is not auto-selected** in the students dropdown.
  2. After creating a leave request, it **does not appear** in leave history (or save appears to fail).
  3. Approved leave should show on the **attendance date view** without opening leave reports to print.
- **Expected:**
  1. Scan → class + student both selected when student is found.
  2. Create → history tab lists new request; queries invalidated/refetched.
  3. Attendance marking/date tab shows leave status for that date (linked to leave module).
- **Root cause (confirmed):**
  - `useEffect` cleared `selectedStudent` whenever `selectedClass` changed, including after card scan set both.
  - History query shared create-tab `studentId`/`classId` filters.
  - Attendance sessions opened after leave approval did not sync approved leave into session records.
- **Files changed:**
  - `frontend/src/pages/LeaveManagement.tsx` — scan ref + scanned student option; history query decoupled from create form
  - `frontend/src/hooks/useLeaveRequests.tsx` — refetch on create/approve; omit empty filter params
  - `backend/app/Http/Controllers/AttendanceSessionController.php` — sync approved leaves on open session `show`
  - `backend/app/Http/Controllers/LeaveRequestController.php` — month overlap filter (shared with #14)
- **Fix applied:** Card scan preserves student via `pendingStudentFromScanRef`; history uses month/year only; mutations invalidate+refetch; open attendance sessions auto-mark approved leave on load (approve still marks via existing `markAttendanceForLeave`).

---

## 14. Leave requests — History tab empty / date filter wrong

- **Status:** `[x]`
- **Route:** `/leave-requests` → History tab
- **Problem:** Date/history tab does not show leave requests (empty or wrong month).
- **Expected:** History tab lists leave requests for selected month/year (and optional filters), independent of create-tab student/class selection.
- **Root cause (confirmed):** History `useLeaveRequests` passed create-tab `studentId`/`classId`; backend `whereMonth(start_date)` missed multi-month ranges.
- **Files changed:**
  - `frontend/src/pages/LeaveManagement.tsx` — history query month/year only; reset page on month change
  - `frontend/src/hooks/useLeaveRequests.tsx` — send only defined filter params
  - `backend/app/Http/Controllers/LeaveRequestController.php` — overlap filter: `start_date <= month_end AND end_date >= month_start`
- **Fix applied:** History tab independent of create-form selections; backend returns any leave overlapping selected month.

---

## 15. Events — dialogs still in English

- **Status:** `[x]`
- **Route:** `/events`
- **Problem:** Event create/edit dialog titles and some labels are hardcoded English (e.g. “Edit Event”, “Create Event”, “Select a school”).
- **Expected:** All dialog strings use `t('events.*')` in en/ps/fa/ar.
- **Files to change:**
  - `frontend/src/components/events/EventFormDialog.tsx` (lines ~171+ — hardcoded titles)
  - `frontend/src/components/events/EventTypeFormDialog.tsx`
  - `frontend/src/lib/translations/pages/events/events.{en,ps,fa,ar}.ts`
- **Note:** Some strings already use `t()` with English fallbacks; remove fallbacks once keys exist in all locales.

---

## 16. Assets — tables and dialogs partially untranslated

- **Status:** `[x]`
- **Route:** `/assets`, `/assets/dashboard`, `/assets/categories`
- **Problem:** Table headers and dialog buttons still in English (e.g. “Total Assets”, “Create Asset”, “Purchase Date”).
- **Expected:** All visible strings via `assets.*` translation keys.
- **Files to change:**
  - `frontend/src/components/assets/AssetManagement.tsx`
  - `frontend/src/components/assets/AssetListTab.tsx`
  - `frontend/src/lib/translations/pages/assets/assets.{en,ps,fa,ar}.ts`

---

## 17. Documents dialogs — incomplete translations

- **Status:** `[x]`
- **Routes:** Student profile, courses, exams, finance, DMS
- **Problem:** Document upload/list dialogs show English or mixed strings; some keys missing in ps/fa/ar.
- **Expected:** Full coverage in all four language files; no `t('key') || 'English fallback'` for user-facing text.
- **Files to change:**
  - `frontend/src/components/students/StudentDocumentsDialog.tsx`
  - `frontend/src/components/courses/CourseDocumentsDialog.tsx`
  - Exam/finance/DMS document components
  - `frontend/src/lib/translations/` (students, courses, documents modules)
- **Fix approach:** Audit each dialog string → add missing keys to `types.ts` + en/ps/fa/ar.

---

## 18. Course certificate — edit dialog not translated

- **Status:** `[x]`
- **Route:** `/course-certificates`, certificate templates settings
- **Problem:** Certificate template edit dialog and layout editor field names are English literals (“Student Name”, “Father Name”, etc.).
- **Expected:** All editor labels and dialog actions translated.
- **Files to change:**
  - `frontend/src/pages/CertificateTemplates.tsx`
  - `frontend/src/components/certificates/CertificateLayoutEditor.tsx`
  - `frontend/src/lib/translations/pages/certificates/certificates.{en,ps,fa,ar}.ts`

---

## 19. ID card template designer — field names not translated

- **Status:** `[x]`
- **Route:** `/id-cards/templates`
- **Problem:** Field palette and default label texts mix hardcoded English/Pashto (e.g. “Student Name”, “Label: Name (نوم)”, “Residency:”).
- **Expected:** Field names and default labels use `idCards.*` keys per current language.
- **Files to change:**
  - `frontend/src/pages/IdCardTemplates.tsx`
  - `frontend/src/components/id-cards/IdCardLayoutEditor.tsx`
  - `frontend/src/lib/id-cards/idCardFieldUtils.ts` (`DEFAULT_LABEL_TEXTS`)
  - `frontend/src/lib/translations/pages/id-cards/idCards.{en,ps,fa,ar}.ts`

---

## 20. Exam student report card — print is a table, not a card layout

- **Status:** `[x]`
- **Route:** `/exams/reports/student` (`StudentExamReport`)
- **Problem:** Print/export renders a plain HTML table inside a card, not a proper report-card design (photo, summary blocks, styled grades).
- **Expected:** Print/PDF looks like a physical report card (school branding, student info block, subject grades in card layout).
- **Root cause:** `GradeCard` + `<Table>` used for on-screen and print; no dedicated print template or PDF report type.
- **Files to change:**
  - `frontend/src/pages/StudentExamReport.tsx`
  - Consider: `backend` report template + `ReportService` (report_key e.g. `exam_student_report_card`) for PDF with branding
  - `frontend/src/lib/translations/pages/studentReport/studentReport.{en,ps,fa,ar}.ts`
- **Fix approach:** Add print-specific CSS (`@media print`) with card layout **or** use server PDF report with branding templates (preferred for RTL and consistency with other reports).

---

## Cross-cutting fixes (do once, helps multiple items)

| Pattern | Helps issues | Action |
|---------|--------------|--------|
| Pass `language` + calendar on exports | 7, 8 | Wire `useLanguage()` + `calendarState` into all `generateReport` / export hooks |
| Unpaginated fetch for dropdowns | 1, 5 | Never reuse paginated list hooks for `<Select>` / Combobox options |
| Replace hardcoded English in dialogs | 15–19 | Grep for quoted strings in dialog components; add keys to all 4 locale files |
| Separate query params per tab | 13, 14 | Leave create tab vs history tab must not share the same filter state |
| Admission/status by academic year | 4, 6 | Backend + frontend must scope “current” status to current academic year |

---

## Suggested fix order

1. **High — data correctness:** 1, 2, 5, 6, 10, 13, 14  
2. **Medium — UX / reports:** 3, 4, 7, 8, 11, 20  
3. **Medium — i18n sweep:** 9, 12, 15, 16, 17, 18, 19  

---

## Notes

- All fixes must keep **organization_id** and **school_id** isolation (multi-tenant rules).
- Toasts: use `showToast` + translation keys, not hardcoded strings.
- After i18n changes, update `frontend/src/lib/translations/types.ts` and all four locale files (en, ps, fa, ar).
- Re-test in **RTL** (Pashto/Dari/Arabic) after UI and export fixes.
