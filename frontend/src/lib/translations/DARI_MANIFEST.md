# Dari Translation Manifest

> This manifest tracks translation modules and their Dari (fa) status for the Nazim School Management System. Used by the Cursor rule `dari-translations-workflow.mdc` for systematic English-to-Dari translation. **Source of truth:** English (`*.en.ts`); **Target:** Dari (`*.fa.ts`).

## How to Use

1. Pick a module marked `needs_review` or `placeholder` (or `not_started` if any).
2. Ask Cursor: **"Translate to Dari the {module} module"** or **"Generate Dari translations for {module}"**.
3. Cursor will: read the EN file → translate using the rule’s terminology and grammar → write/update the `*.fa.ts` file → update this manifest.
4. After translation, set the module’s "Dari (fa) status" to `done` or keep as `needs_review` until reviewed.

## Status Legend

- `done` — Dari translation complete and reviewed; terminology and grammar applied.
- `placeholder` — fa file exists but contains placeholders or English fallbacks.
- `needs_review` — Translated but not yet checked for terminology/grammar consistency.
- `not_started` — fa file missing or effectively empty.

---

## Website

| Module | EN File | Dari (fa) File | EN Status | Dari (fa) Status | Notes |
|--------|---------|----------------|----------|------------------|--------|
| website/public | website/public-en.ts | website/public-fa.ts | done | needs_review | Public-facing website copy. |
| website/admin | website/admin-en.ts | website/admin-fa.ts | done | needs_review | Website manager admin UI. |

---

## Shared

| Module | EN File | Dari (fa) File | EN Status | Dari (fa) Status | Notes |
|--------|---------|----------------|----------|------------------|--------|
| shared/common | shared/common/common.en.ts | shared/common/common.fa.ts | done | needs_review | Common labels, actions, messages. |
| shared/nav | shared/nav/nav.en.ts | shared/nav/nav.fa.ts | done | done | Navigation menu. Afghan Dari applied. |
| shared/toast | shared/toast/toast.en.ts | shared/toast/toast.fa.ts | done | done | Toast notifications. Afghan Dari applied. |
| shared/forms | shared/forms/forms.en.ts | shared/forms/forms.fa.ts | done | needs_review | Form labels and validation. |
| shared/validation | shared/validation/validation.en.ts | shared/validation/validation.fa.ts | done | done | Validation messages. Afghan Dari applied. |
| shared/pagination | shared/pagination/pagination.en.ts | shared/pagination/pagination.fa.ts | done | done | Pagination UI. Afghan Dari applied. |
| shared/ui | shared/ui/ui.en.ts | shared/ui/ui.fa.ts | done | done | Generic UI strings. Afghan Dari applied. |
| shared/errorBoundary | shared/errorBoundary/errorBoundary.en.ts | shared/errorBoundary/errorBoundary.fa.ts | done | needs_review | Error boundary messages. |
| shared/notFound | shared/notFound/notFound.en.ts | shared/notFound/notFound.fa.ts | done | done | 404 page. Afghan Dari applied. |
| shared/footer | shared/footer/footer.en.ts | shared/footer/footer.fa.ts | done | done | Footer copy. Afghan Dari applied. |
| shared/search | shared/search/search.en.ts | shared/search/search.fa.ts | done | done | Search placeholders and labels. Afghan Dari applied. |
| shared/privacyPolicy | shared/privacyPolicy/privacyPolicy.en.ts | shared/privacyPolicy/privacyPolicy.fa.ts | done | needs_review | Privacy policy page. |
| shared/termsOfService | shared/termsOfService/termsOfService.en.ts | shared/termsOfService/termsOfService.fa.ts | done | needs_review | Terms of service page. |
| shared/resetPassword | shared/resetPassword/resetPassword.en.ts | shared/resetPassword/resetPassword.fa.ts | done | done | Reset password flow. Afghan Dari applied. |

---

## Pages

| Module | EN File | Dari (fa) File | EN Status | Dari (fa) Status | Notes |
|--------|---------|----------------|----------|------------------|--------|
| pages/academic | pages/academic/academic.en.ts | pages/academic/academic.fa.ts | done | needs_review | Classes, subjects, academic years, grades. |
| pages/admissions | pages/admissions/admissions.en.ts | pages/admissions/admissions.fa.ts | done | needs_review | Student admissions. |
| pages/activity-logs | pages/activity-logs/activityLogs.en.ts | pages/activity-logs/activityLogs.fa.ts | done | needs_review | Activity logs. |
| pages/assets | pages/assets/assets.en.ts | pages/assets/assets.fa.ts | done | needs_review | Asset management. |
| pages/attendance | pages/attendance/attendance.en.ts | pages/attendance/attendance.fa.ts | done | needs_review | Attendance. |
| pages/auth | pages/auth/auth.en.ts | pages/auth/auth.fa.ts | done | needs_review | Login, logout, auth messages. |
| pages/certificates | pages/certificates/certificates.en.ts | pages/certificates/certificates.fa.ts | done | needs_review | Certificates. |
| pages/courses | pages/courses/courses.en.ts | pages/courses/courses.fa.ts | done | needs_review | Short-term courses. |
| pages/dashboard | pages/dashboard/dashboard.en.ts | pages/dashboard/dashboard.fa.ts | done | needs_review | Dashboard. |
| pages/dms | pages/dms/dms.en.ts | pages/dms/dms.fa.ts | done | needs_review | Document management. |
| pages/events | pages/events/events.en.ts | pages/events/events.fa.ts | done | done | Events. |
| pages/exams | pages/exams/exams.en.ts | pages/exams/exams.fa.ts | done | needs_review | Exams. |
| pages/fees | pages/fees/fees.en.ts | pages/fees/fees.fa.ts | done | needs_review | Fees. |
| pages/finance | pages/finance/finance.en.ts | pages/finance/finance.fa.ts | done | done | Finance. |
| pages/grades | pages/grades/grades.en.ts | pages/grades/grades.fa.ts | done | needs_review | Grades. |
| pages/guards | pages/guards/guards.en.ts | pages/guards/guards.fa.ts | done | needs_review | Guards. |
| pages/help-center | pages/help-center/helpCenter.en.ts | pages/help-center/helpCenter.fa.ts | done | needs_review | Help center. |
| pages/hostel | pages/hostel/hostel.en.ts | pages/hostel/hostel.fa.ts | done | needs_review | Hostel. |
| pages/id-cards | pages/id-cards/idCards.en.ts | pages/id-cards/idCards.fa.ts | done | needs_review | ID cards. |
| pages/image-capture | pages/image-capture/imageCapture.en.ts | pages/image-capture/imageCapture.fa.ts | done | needs_review | Image capture. |
| pages/leave | pages/leave/leave.en.ts | pages/leave/leave.fa.ts | done | done | Leave. Afghan Dari applied. |
| pages/library | pages/library/library.en.ts | pages/library/library.fa.ts | done | done | Library. Afghan Dari applied. |
| pages/maintenance | pages/maintenance/maintenance.en.ts | pages/maintenance/maintenance.fa.ts | done | needs_review | Maintenance. |
| pages/onboarding | pages/onboarding/onboarding.en.ts | pages/onboarding/onboarding.fa.ts | done | needs_review | Onboarding. |
| pages/organizations | pages/organizations/organizations.en.ts | pages/organizations/organizations.fa.ts | done | done | Organizations. Afghan Dari applied. |
| pages/permissions | pages/permissions/permissions.en.ts | pages/permissions/permissions.fa.ts | done | done | Permissions. Afghan Dari applied. |
| pages/phone-book | pages/phone-book/phoneBook.en.ts | pages/phone-book/phoneBook.fa.ts | done | done | Phone book. Afghan Dari applied. |
| pages/profile-management | pages/profile-management/profileManagement.en.ts | pages/profile-management/profileManagement.fa.ts | done | done | Profile management. |
| pages/question-bank | pages/question-bank/questionBank.en.ts | pages/question-bank/questionBank.fa.ts | done | done | Question bank. |
| pages/reports | pages/reports/reports.en.ts | pages/reports/reports.fa.ts | done | done | Reports. |
| pages/roles | pages/roles/roles.en.ts | pages/roles/roles.fa.ts | done | done | Roles. |
| pages/schools | pages/schools/schools.en.ts | pages/schools/schools.fa.ts | done | needs_review | Schools. |
| pages/settings | pages/settings/settings.en.ts | pages/settings/settings.fa.ts | done | done | Settings. |
| pages/short-term-courses | pages/short-term-courses/shortTermCourses.en.ts | pages/short-term-courses/shortTermCourses.fa.ts | done | done | Short-term courses. |
| pages/staff | pages/staff/staff.en.ts | pages/staff/staff.fa.ts | done | done | Staff. |
| pages/student-report | pages/student-report/studentReport.en.ts | pages/student-report/studentReport.fa.ts | done | done | Student report. |
| pages/students | pages/students/students.en.ts | pages/students/students.fa.ts | done | done | Students. |
| pages/student-history | pages/student-history/studentHistory.en.ts | pages/student-history/studentHistory.fa.ts | done | done | Student history. |
| pages/subscription | pages/subscription/subscription.en.ts | pages/subscription/subscription.fa.ts | done | done | Subscription. Afghan Dari applied. |
| pages/subjects | pages/subjects/subjects.en.ts | pages/subjects/subjects.fa.ts | done | done | Subjects. Afghan Dari applied. |
| pages/teacher-subject-assignments | pages/teacher-subject-assignments/teacherSubjectAssignments.en.ts | pages/teacher-subject-assignments/teacherSubjectAssignments.fa.ts | done | done | Teacher subject assignments. Afghan Dari applied. |
| pages/timetable | pages/timetable/timetable.en.ts | pages/timetable/timetable.fa.ts | done | done | Timetable. Afghan Dari applied. |
| pages/user-management | pages/user-management/userManagement.en.ts | pages/user-management/userManagement.fa.ts | done | done | User management. Afghan Dari applied. |
| pages/user-permissions | pages/user-permissions/userPermissions.en.ts | pages/user-permissions/userPermissions.fa.ts | done | done | User permissions. Afghan Dari applied. |
| pages/watermarks | pages/watermarks/watermarks.en.ts | pages/watermarks/watermarks.fa.ts | done | done | Watermarks. Afghan Dari applied. |
| pages/graduation | pages/graduation/graduation.en.ts | pages/graduation/graduation.fa.ts | done | done | Graduation. |
| pages/website-admin | pages/website-admin/websiteAdmin.en.ts | pages/website-admin/websiteAdmin.fa.ts | done | needs_review | Website admin. |
| pages/platform | pages/platform/platform.en.ts | pages/platform/platform.fa.ts | done | needs_review | Platform admin. |
| pages/misc | pages/misc/misc.en.ts | pages/misc/misc.fa.ts | done | needs_review | Misc. |
