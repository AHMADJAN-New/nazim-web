---
name: Activity logger rollout
overview: "Add ActivityLogService to all controllers in the provided list using the same pattern as PermissionController: inject the service, then call logCreate / logUpdate / logDelete (and logEvent or logAction for custom actions) inside try/catch after successful write operations, without failing the main request if logging fails."
todos: []
isProject: false
---

# Activity Logger Rollout Plan

## Reference implementation

- **Service**: [backend/app/Services/ActivityLogService.php](backend/app/Services/ActivityLogService.php) — provides `logCreate()`, `logUpdate()`, `logDelete()`, `logEvent()`, `logAction()`.
- **Pattern**: [backend/app/Http/Controllers/PermissionController.php](backend/app/Http/Controllers/PermissionController.php) — constructor injection, then after each successful write:
  - **store**: `logCreate($model, "Created {Entity}: {$model->name}", ['key' => $model->key], $request)` inside `try { ... } catch (\Exception $e) { Log::warning('Failed to log...'); }`.
  - **update**: optionally capture `$oldValues` before update; after update call `logUpdate($model, "Updated {Entity}: {$model->name}", ['old_values' => $oldValues, 'new_values' => $model->only([...])], $request)` in try/catch.
  - **destroy**: for soft delete, call `logDelete($model, "Deleted {Entity}: ...", ['deleted_entity' => $model->toArray()], request())` in try/catch after `$model->delete()`. For hard delete, log before delete (subject still in memory) or use `logEvent()` with a snapshot in `properties`.

Logging must never break the HTTP response: always wrap in try/catch and `Log::warning()` on failure.

---

## Standard changes per controller

1. **Add import**: `use App\Services\ActivityLogService;`
2. **Constructor**: Add `private ActivityLogService $activityLogService` (append to existing promoted params if any).
3. **store**: After successful create and before `return`, add try/catch calling `$this->activityLogService->logCreate($model, description, properties, $request)`.
4. **update**: After successful update, add try/catch calling `$this->activityLogService->logUpdate($model, description, properties, $request)`. Optionally capture old attribute values before update for `properties`.
5. **destroy**: After successful delete (or before if hard delete), add try/catch calling `$this->activityLogService->logDelete($model, description, properties, request())`.
6. **Custom write actions** (e.g. assign, approve, export, generate): Use `logEvent()` or `logAction()` with a clear description and relevant `properties`.

Descriptions should be human-readable and include entity identifiers (e.g. name or id) where useful. Use a consistent log name per area (e.g. `'finance_accounts'`, `'students'`) when calling `logEvent`/`logAction` via the `logName` parameter.

---

## Controllers without store/update/destroy

- **Read-only or report controllers** (e.g. DashboardController, StatsController, SearchController, FeeReportController, FinanceReportController, StudentReportController, StaffReportController, ExamReportController): Add logging only for **write or export actions** (e.g. report generation, export) using `logEvent()` with description and properties. If there are no such actions, no change.
- **LandingController, PublicWebsiteController, CertificateVerifyController, PublicExamResultController, PublicFatwaController, PublicOnlineAdmissionController**: Typically public/read-only; add logging only for any write or submit endpoints (e.g. form submit) via `logEvent()`.

---

## Abstract / base controllers

- **BaseDmsController** ([backend/app/Http/Controllers/Dms/BaseDmsController.php](backend/app/Http/Controllers/Dms/BaseDmsController.php)): Add `use App\Services\ActivityLogService;` and constructor `public function __construct(protected ActivityLogService $activityLogService)` (and `parent::__construct()` if base Controller needs it). Each concrete DMS controller that defines its own constructor must accept `ActivityLogService` and pass it to `parent::__construct($activityLogService)`.
- **CertificateTemplateController** vs **Certificates\CertificateTemplateController**: Confirm which one is in use (possible duplicate); add logging to the one(s) actually routed.

---

## Grouping and order of implementation

Implement in batches to keep PRs reviewable and to catch integration issues early.


| Phase                                                | Controllers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 – Finance & fees**                               | FinanceAccountController, FinanceDocumentController, FinanceProjectController, FinanceReportController (writes/exports only), ExpenseEntryController, ExpenseCategoryController, IncomeEntryController, IncomeCategoryController, ExchangeRateController, FeeAssignmentController, FeeExceptionController, FeePaymentController, FeeReportController (writes/exports), FeeStructureController                                                                                                                                                                                                                                                                                                                                                                                             |
| **2 – Students & staff**                             | StudentController, StudentHistoryController, StudentIdCardController, StudentAdmissionController, StudentDocumentController, StudentDisciplineRecordController, StudentEducationalHistoryController, StudentImportController, StudentReportController (writes/exports), StaffController, StaffDocumentController, StaffTypeController, StaffReportController (writes/exports)                                                                                                                                                                                                                                                                                                                                                                                                             |
| **3 – Academic & exams**                             | ClassController, ClassSubjectController, ClassSubjectTemplateController, SubjectController, GradeController, AcademicYearController, TeacherSubjectAssignmentController, TeacherTimetablePreferenceController, TimetableController, ScheduleSlotController; ExamController, ExamResultController, ExamTimeController, ExamNumberController, ExamStudentController, ExamDocumentController, ExamClassController, ExamAttendanceController, ExamReportController, ExamTypeController, ExamSubjectController, ExamPaperTemplateController, ExamPaperTemplateFileController, ExamPaperPreviewController                                                                                                                                                                                       |
| **4 – Courses, attendance, events, library, assets** | ShortTermCourseController, CourseStudentController, CourseAttendanceSessionController, CourseDocumentController, CourseStudentDisciplineRecordController; AttendanceSessionController; EventController, EventTypeController, EventGuestController, EventUserController, EventCheckinController; LibraryBookController, LibraryCategoryController, LibraryCopyController, LibraryLoanController; AssetController, AssetCategoryController, AssetAssignmentController, AssetMaintenanceController                                                                                                                                                                                                                                                                                           |
| **5 – DMS**                                          | BaseDmsController (constructor + property), then IncomingDocumentsController, OutgoingDocumentsController, DocumentFilesController, DocumentSettingsController, DocumentReportsController, ArchiveSearchController, DepartmentsController, LetterheadsController, LetterTemplatesController, LetterTypesController                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **6 – Certificates, settings, other**                | CertificateTemplateController, Certificates\CertificateTemplateController, Certificates\IssuedCertificateController, IdCardTemplateController, CertificateVerifyController (writes if any); SchoolBrandingController, RoomController, BuildingController, ProfileController, ReportGenerationController, ReportTemplateController, TranslationController; CurrencyController, DonorController, HostelController, LeaveRequestController, MaintenanceController, MaintenanceFeeController, LicenseFeeController, DesktopLicenseController, HelpCenterCategoryController, HelpCenterArticleController, ContactMessageController, NotificationController, UserTourController, ResidencyTypeController, RoleController, PhoneBookController, TestimonialController, GraduationBatchController |
| **7 – Optional / read-only**                         | StorageController (log uploads/deletes), BackupController (log backup/restore), DashboardController, StatsController, SearchController, LandingController — only for write or high-value actions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |


---

## Edge cases and rules

- **Soft delete**: Log after `$model->delete()`; pass the same model instance to `logDelete` (it remains in memory with `deleted_at` set). Spatie stores `subject_type` and `subject_id`; the Activity model will still reference the record.
- **Hard delete**: Call `logDelete($model, ...)` **before** `$model->delete()`, or use `logEvent()` with a full snapshot in `properties` if the subject would be invalid after delete.
- **Existing constructor dependencies**: Add `ActivityLogService $activityLogService` as an additional parameter; Laravel resolves it via the container.
- **Platform / subscription controllers**: SubscriptionController and SubscriptionAdminController were not in your list; if they perform sensitive writes (e.g. plan changes, renewals), consider adding activity logging in a follow-up.
- **Consistent naming**: Use entity-specific descriptions (e.g. "Created finance account: Main Cash", "Deleted fee payment for student X") and, for `logEvent`/`logAction`, a stable `logName` (e.g. `'finance_accounts'`) so the Activity Log UI can filter by resource.

---

## Verification

- After each phase, run existing controller/feature tests and confirm no regressions.
- Manually or via test: perform create/update/delete (and any custom actions) and assert that `nazim_logs.activity_log` (or configured table) has the expected new rows with correct `organization_id`, `school_id`, `description`, `event`, and `subject_type`/`subject_id`.
- Ensure failed logging only produces a warning log and never changes the HTTP status or response body of the main action.

