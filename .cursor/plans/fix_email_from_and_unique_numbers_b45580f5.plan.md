---
name: Fix email From and unique numbers
overview: Fix the subscription email "From" header so emails always send, and make all auto-generated numbers (course-student admission, and optionally maintenance invoice) concurrency-safe using the existing OrganizationCounter + lockForUpdate pattern so unique violations do not recur.
todos: []
isProject: false
---

# Fix Email From Header and Auto-Generated Number Duplicates

## Current state

- **Email:** [SubscriptionNotificationService.php](backend/app/Services/Subscription/SubscriptionNotificationService.php) uses `Mail::raw()` and only sets `to()` and `subject()`; it never sets `from()`, which triggers Symfony’s “An email must have a From or a Sender header” when the default is not applied (e.g. in queue workers).
- **Course students:** [CourseStudentController.php](backend/app/Http/Controllers/CourseStudentController.php) generates admission numbers with `generateAdmissionNumber()` / `generateAdmissionNumberWithoutCourse()`. They run in a `DB::transaction()` and compute `MAX(sequence)+1` from `course_students`, but **no row is locked**. Two concurrent requests can read the same max, get the same number, and one insert hits `course_students_admission_no_org_school_unique`. Retry logic (up to 3 attempts) mitigates user-facing failure but the first attempt still logs a 23505.
- **Main students / online admission / student import:** Already use [CodeGenerator.php](backend/app/Services/CodeGenerator.php) with [OrganizationCounter](backend/app/Models/OrganizationCounter.php) and `lockForUpdate()` — safe.
- **MaintenanceInvoice:** [MaintenanceInvoice.php](backend/app/Models/MaintenanceInvoice.php) `generateInvoiceNumber()` uses `orderBy('invoice_number', 'desc')->first()` then `+1` with no lock — susceptible to duplicate numbers under concurrency.
- **Library books:** `book_number` is user-supplied and only validated for uniqueness; no auto-generation.

---

## 1. Email: Always set From on raw subscription emails

**File:** [backend/app/Services/Subscription/SubscriptionNotificationService.php](backend/app/Services/Subscription/SubscriptionNotificationService.php)

**Change:** In `sendNotification()`, inside the `Mail::raw(..., function ($message) use ...)` closure, set the From address before sending so every path has a From header.

- Read From from config with fallbacks (same pattern as [DailyDigestMail.php](backend/app/Mail/DailyDigestMail.php) and [ActionRequiredMail.php](backend/app/Mail/ActionRequiredMail.php)):
  - `$from = config('mail.from');`
  - `$address = $from['address'] ?? 'noreply@nazim.local';`
  - `$name = $from['name'] ?? config('app.name', 'Nazim');`
- In the closure: call `$message->from($address, $name)` before `->to($email)->subject($subject)`.

**Deployment note:** Ensure production `.env` has `MAIL_FROM_ADDRESS` and `MAIL_FROM_NAME` set so the default mail config is correct; the code fallbacks prevent the Symfony exception even if env is missing.

---

## 2. Course-student admission: Locked counter (no more 23505)

**Goal:** Generate course-student admission numbers in a way that guarantees uniqueness under concurrency, so the unique constraint is never hit and retry logic is unnecessary (or only a rare safety net).

**Approach:** Reuse the same pattern as [CodeGenerator.php](backend/app/Services/CodeGenerator.php): use `organization_counters` with a counter type that identifies the “stream” (org + school + year + course code), and `lockForUpdate()` so only one request gets each next value.

**2.1 Add course-student admission generation (CodeGenerator or new service)**

- **Option A (recommended):** Add a new method in a dedicated service used only by course students, e.g. `App\Services\CourseStudentAdmissionService`, to keep course-specific format and dependencies (e.g. DateService for Jalali year) in one place.
- **Option B:** Extend [CodeGenerator.php](backend/app/Services/CodeGenerator.php) with something like `generateCourseStudentAdmissionNumber(string $organizationId, string $schoolId, string $courseCode, string $year2Digit): string` that:
  - Uses `counter_type = "course_student_{schoolId}_{year}_{courseCode}"` (e.g. `course_student_<uuid>_25_ABC`). No schema change; `counter_type` is already long enough.
  - In a `DB::transaction`, does `OrganizationCounter::lockForUpdate()->where('organization_id', $organizationId)->where('counter_type', $counterKey)->first()`, creates the row if missing, increments `last_value`, saves, then returns `sprintf('CS-%s-%s-%03d', $courseCode, $year, $counter->last_value)` (or same format as today with zero-padding as needed).
- **Format:** Keep current format `CS-{courseCode}-{year}-{seq}` (e.g. `CS-ABC-25-001`) so existing behaviour and constraints are unchanged.

**2.2 Use it in CourseStudentController**

- In [CourseStudentController.php](backend/app/Http/Controllers/CourseStudentController.php):
  - Replace calls to `$this->generateAdmissionNumber(...)` and `$this->generateAdmissionNumberWithoutCourse(...)` with the new service (or CodeGenerator) method. For “without course” use course code `GEN`.
  - Derive `$courseCode` and `$year` (2-digit Jalali) the same way as today (using existing DateService/course start date or now() for GEN).
- **Retry logic:** Either remove the 23505 retry loops (create, enroll, copy) or leave a single retry as a safety net; with a locked counter, the first attempt should always succeed.

**2.3 No migration required**

- `organization_counters` already has `(organization_id, counter_type)` unique; use a string `counter_type` that embeds `school_id`, year, and course code.

---

## 3. Optional: Maintenance invoice numbers (concurrency-safe)

**File:** [backend/app/Models/MaintenanceInvoice.php](backend/app/Models/MaintenanceInvoice.php)

**Current risk:** `generateInvoiceNumber()` uses a query for the last invoice and `+1` with no lock; under concurrency two callers can get the same number.

**Change:** Generate the next number using `OrganizationCounter` with `lockForUpdate()` and a counter type like `maintenance_invoice_{organizationId}_{Y}{m}` (e.g. `maintenance_invoice_<org>_202602`). In a transaction: lock or create the counter, increment `last_value`, then format as `MNT-{Y}{m}-{last_value}` with zero-padding (e.g. 4 digits). Keep the same format `MNT-YYYYMM-NNNN` so existing behaviour is preserved.

---

## 4. Summary of where numbers are generated


| Place                                     | Current                                        | After plan                                        |
| ----------------------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| Subscription emails                       | No From on `Mail::raw`                         | From set from config + fallbacks                  |
| Course students (create/enroll/copy)      | MAX+1 in transaction, no lock → 23505 possible | Locked counter (OrganizationCounter) → no 23505   |
| Main students (import / online admission) | CodeGenerator + lockForUpdate                  | No change (already safe)                          |
| Main students (manual create)             | admission_no required from client, validated   | No change                                         |
| MaintenanceInvoice                        | Last number + 1, no lock                       | Optional: use OrganizationCounter + lockForUpdate |
| Library book_number                       | User-supplied, uniqueness check only           | No change                                         |


---

## 5. Implementation order

1. **Email:** Implement the From header in `SubscriptionNotificationService::sendNotification()` and verify (e.g. trigger a subscription notification or run existing tests).
2. **Course students:** Implement the locked counter (new service or CodeGenerator), then refactor `CourseStudentController` to use it and simplify/remove 23505 retries.
3. **Optional:** Apply the same counter pattern to `MaintenanceInvoice::generateInvoiceNumber()` if you want to eliminate any risk of duplicate invoice numbers under concurrency.

No database migrations are required for the course-student or email fixes; only code changes. The same applies to maintenance invoices if you use the existing `organization_counters` table.