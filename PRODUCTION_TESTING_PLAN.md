# Production Testing Plan - Nazim School Management System

**Version:** 1.0  
**Date:** 2025-01-XX  
**Scope:** Full application testing including subscription/plans hardening changes  
**Testing Environment:** Staging/Production-like environment  

---

## Table of Contents

1. [Pre-Testing Checklist](#pre-testing-checklist)
2. [Subscription System Testing](#subscription-system-testing)
3. [Feature Gating & Access Control](#feature-gating--access-control)
4. [Usage Limits Enforcement](#usage-limits-enforcement)
5. [Payment & Renewal Workflows](#payment--renewal-workflows)
6. [Status Transitions & Lifecycle](#status-transitions--lifecycle)
7. [Integration Testing](#integration-testing)
8. [Performance & Edge Cases](#performance--edge-cases)
9. [Security & Permissions](#security--permissions)
10. [Frontend Integration](#frontend-integration)
11. [Platform Admin Operations](#platform-admin-operations)
12. [Data Integrity & Recovery](#data-integrity--recovery)
13. [Production Readiness Checklist](#production-readiness-checklist)

---

## Pre-Testing Checklist

Before starting production testing, ensure:

- [ ] **Database is clean** (fresh migration + seeders)
- [ ] **Subscription seeder has run** (`php artisan db:seed --class=SubscriptionSeeder`)
- [ ] **Platform admin user exists** (can create via `/platform/users`)
- [ ] **Test organization(s) created** with different subscription states
- [ ] **Cron jobs scheduled** (verify `subscription:process-transitions` is scheduled)
- [ ] **Environment variables** configured correctly (APP_ENV, DB connection, storage disks)
- [ ] **Logs directory writable** (`storage/logs/`)
- [ ] **Storage directories exist** (`storage/app/organizations/`)
- [ ] **Queue worker running** (if using queues for notifications)
- [ ] **Frontend build is latest** (`npm run build`)
- [ ] **API documentation accessible** (if available)

---

## Subscription System Testing

### 1.1 Subscription Status & Access Levels

**Objective:** Verify subscription status endpoints return correct access levels and UI blocks appropriately.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 1.1.1 | **New organization with no subscription** | - `GET /api/subscription/status-lite` returns `status: 'none'`, `access_level: 'none'`, `can_read: false`, `can_write: false`<br>- Frontend shows "No subscription" message | 🔴 Critical |
| 1.1.2 | **Organization with trial subscription (active)** | - `status: 'trial'`, `access_level: 'full'`, `can_read: true`, `can_write: true`<br>- `trial_ends_at` is set and in future<br>- UI shows trial countdown banner | 🔴 Critical |
| 1.1.3 | **Organization with active subscription** | - `status: 'active'`, `access_level: 'full'`<br>- No trial/grace warnings in UI | 🔴 Critical |
| 1.1.4 | **Organization in grace period** | - `status: 'grace_period'`, `access_level: 'grace'`, `can_read: true`, `can_write: true`<br>- `grace_period_ends_at` is set and in past (overdue)<br>- UI shows renewal warning banner | 🔴 Critical |
| 1.1.5 | **Organization in readonly mode** | - `status: 'readonly'`, `access_level: 'readonly'`, `can_read: true`, `can_write: false`<br>- All write operations (POST/PUT/DELETE) blocked with 402 error<br>- UI disables all edit/create buttons | 🔴 Critical |
| 1.1.6 | **Organization with expired subscription** | - `status: 'expired'`, `access_level: 'blocked'`, `can_read: false`, `can_write: false`<br>- All API endpoints return 402 (except status-lite)<br>- UI shows "Subscription expired" message with renewal button | 🔴 Critical |
| 1.1.7 | **Organization with suspended subscription** | - `status: 'suspended'`, `access_level: 'blocked'`<br>- All access blocked<br>- UI shows suspension reason | 🟡 High |
| 1.1.8 | **Payment overdue (maintenance fee)** | - `maintenance_overdue: true`, `maintenance_days_overdue > 0`<br>- `access_level: 'blocked'` if overdue<br>- UI shows "Maintenance fee overdue" message | 🔴 Critical |
| 1.1.9 | **License fee unpaid** | - `license_fee_pending: true` if plan requires license fee<br>- `access_level: 'blocked'` if unpaid<br>- UI shows "License fee required" message | 🔴 Critical |

#### Test Steps:

```bash
# Create test organization
# Create subscription with specific status
# Call status-lite endpoint
# Verify response matches expected state
# Check frontend UI reflects correct status
```

---

### 1.2 Subscription Plan Management

**Objective:** Verify plan creation, updates, and feature/limit assignments work correctly.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 1.2.1 | **Create new plan via platform admin** | - Plan created with UUID<br>- Features and limits can be assigned<br>- Plan appears in `/api/subscription/plans` list | 🟡 High |
| 1.2.2 | **Update existing plan (features/limits)** | - Changes reflected immediately<br>- Existing subscriptions keep old plan data (plan snapshot)<br>- New subscriptions use updated plan | 🟡 High |
| 1.2.3 | **Deactivate plan** | - `is_active: false`<br>- Plan hidden from public `/api/subscription/plans` endpoint<br>- Existing subscriptions continue working<br>- Cannot create new subscriptions with inactive plan | 🟡 High |
| 1.2.4 | **Delete plan (soft delete)** | - Plan soft-deleted (`deleted_at` set)<br>- Existing subscriptions still reference plan<br>- Plan not visible in admin UI<br>- Cannot create new subscriptions | 🟢 Medium |
| 1.2.5 | **Plan with billing period (monthly/quarterly/yearly/custom)** | - Billing period stored correctly<br>- Maintenance fee calculations use correct period<br>- `next_maintenance_due_at` calculated correctly | 🔴 Critical |
| 1.2.6 | **Plan with license + maintenance fees** | - Both fees stored separately<br>- `hasLicenseFee()` and `hasMaintenanceFee()` return correct values<br>- Initial cost = license + maintenance | 🔴 Critical |
| 1.2.7 | **Plan inheritance (starter → pro → complete → enterprise)** | - Higher plans include all features from lower plans<br>- Feature inheritance works via `plan_order` config | 🟡 High |

---

## Feature Gating & Access Control

### 2.1 Feature Access Verification

**Objective:** Verify feature gating blocks/allows access based on subscription plan.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 2.1.1 | **Feature enabled in plan** | - `GET /api/subscription/features` returns `is_enabled: true`, `is_accessible: true`<br>- Feature UI is visible and functional<br>- API endpoints for feature return 200 | 🔴 Critical |
| 2.1.2 | **Feature disabled in plan** | - `is_enabled: false`, `is_accessible: false`<br>- Feature UI is hidden or disabled<br>- API endpoints return 402 with `FEATURE_NOT_AVAILABLE` | 🔴 Critical |
| 2.1.3 | **Feature with missing dependency** | - `missing_dependencies` array populated<br>- Feature shows "Dependency required" message<br>- Feature blocked until dependencies enabled | 🔴 Critical |
| 2.1.4 | **Feature with parent feature (subfeature)** | - Subfeature requires parent feature to be enabled<br>- Cannot enable subfeature without parent<br>- Parent removal disables subfeature | 🟡 High |
| 2.1.5 | **Feature addon (organization-level)** | - Admin can toggle feature addon via `/platform/organizations/{id}/features/{key}/toggle`<br>- Addon overrides plan features<br>- Addon expires when subscription expires | 🟡 High |
| 2.1.6 | **Feature access in readonly mode** | - Read-only features (reports, viewing) still accessible<br>- Write features (create, update, delete) blocked<br>- UI shows read-only badges | 🔴 Critical |

#### Test Features to Verify:

**Core Features:**
- [ ] Students (`students`)
- [ ] Staff (`staff`)
- [ ] Classes (`classes`)
- [ ] Attendance (`attendance`)
- [ ] Timetables (`timetables`)

**Academic Features:**
- [ ] Exams (Lite) (`exams`)
- [ ] Exams (Full) (`exams_full`)
- [ ] Question Bank (`question_bank`)
- [ ] Grades (`grades`)
- [ ] Library (`library`)

**Finance Features:**
- [ ] Finance System (`finance`)
- [ ] Fees Management (`fees`)
- [ ] Multi-Currency (`multi_currency`)

**Reporting Features:**
- [ ] PDF Reports (`pdf_reports`)
- [ ] Excel Export (`excel_export`)
- [ ] Report Templates (`report_templates`)
- [ ] Advanced Reports (`advanced_reports`)

**Admin Features:**
- [ ] Assets (`assets`)
- [ ] DMS (`dms`)
- [ ] Events (`events`)
- [ ] Certificates (`graduation`)
- [ ] ID Cards (`id_cards`)

#### Test Steps:

```bash
# 1. Assign organization to plan with specific features
# 2. Call /api/subscription/features endpoint
# 3. Verify feature status matches plan configuration
# 4. Attempt to access feature UI/API
# 5. Verify access is allowed/blocked correctly
```

---

### 2.2 Middleware Enforcement

**Objective:** Verify middleware blocks unauthorized feature access.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 2.2.1 | **EnsureFeatureAccess middleware blocks disabled feature** | - Request to feature endpoint returns 402<br>- Error message: "{FeatureName} is not available on your current plan"<br>- Frontend catches 402 and shows upgrade prompt | 🔴 Critical |
| 2.2.2 | **EnsureSubscriptionAccess middleware blocks expired subscription** | - Write operations return 402<br>- Read operations may be blocked if `access_level: 'blocked'` | 🔴 Critical |
| 2.2.3 | **Feature access with dependency missing** | - Feature endpoint returns dependency error<br>- Frontend shows "Enable {dependency} first" message | 🟡 High |

#### Routes to Test:

```php
// Example routes that should use feature middleware
Route::middleware(['feature:finance'])->group(function() {
    Route::get('/finance/accounts', ...);
    Route::post('/finance/accounts', ...);
});

Route::middleware(['limit:students'])->post('/students', ...);
Route::middleware(['subscription:write'])->post('/classes', ...);
```

---

## Usage Limits Enforcement

### 3.1 Resource Limit Checks

**Objective:** Verify usage limits block resource creation when reached.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 3.1.1 | **Create resource within limit** | - Resource created successfully<br>- Usage count increments<br>- No warnings/errors | 🔴 Critical |
| 3.1.2 | **Create resource at limit boundary** | - Last resource before limit succeeds<br>- Next creation attempt blocked with 402<br>- Error message: "You have reached your {resource} limit" | 🔴 Critical |
| 3.1.3 | **Create resource exceeding limit** | - Request returns 402 immediately<br>- No resource created<br>- Frontend shows limit reached message with upgrade option | 🔴 Critical |
| 3.1.4 | **Unlimited resource (-1 limit)** | - No limit checks performed<br>- Resource creation always succeeds<br>- Usage tracking still works | 🟡 High |
| 3.1.5 | **Disabled resource (0 limit)** | - All creation attempts blocked<br>- Error: "This feature is not available on your current plan" | 🟡 High |
| 3.1.6 | **Warning threshold (80% default)** | - Warning shown when usage ≥ 80%<br>- In-app notification sent<br>- UI shows warning badge/progress bar | 🟡 High |
| 3.1.7 | **Limit override (platform admin)** | - Admin can set custom limit via `/platform/organizations/{id}/limit-override`<br>- Override takes precedence over plan limit<br>- Override can expire at specific date | 🟢 Medium |

#### Resources to Test:

**Core Resources:**
- [ ] Students (`students`)
- [ ] Staff (`staff`)
- [ ] Users (`users`)
- [ ] Schools/Branches (`schools`)
- [ ] Classes (`classes`)

**Academic Resources:**
- [ ] Exams (`exams`)
- [ ] Questions (`questions`)
- [ ] Library Books (`library_books`)

**Finance Resources:**
- [ ] Finance Accounts (`finance_accounts`)
- [ ] Income Entries (`income_entries`)
- [ ] Expense Entries (`expense_entries`)

**Storage:**
- [ ] Storage (GB) (`storage_gb`) - **Critical for file uploads**

**Other:**
- [ ] Documents (`documents`)
- [ ] Assets (`assets`)
- [ ] Events (`events`)
- [ ] Certificate Templates (`certificate_templates`)
- [ ] ID Card Templates (`id_card_templates`)

#### Test Steps:

```bash
# 1. Set plan limit for resource (e.g., students: 10)
# 2. Create resources until limit reached
# 3. Verify usage count increments correctly
# 4. Attempt to create 11th resource
# 5. Verify 402 error returned
# 6. Check frontend shows limit reached message
# 7. Upgrade plan or add limit override
# 8. Verify creation succeeds again
```

---

### 3.2 Storage Limit Enforcement

**Objective:** Verify storage limits block file uploads when exceeded.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 3.2.1 | **Upload file within storage limit** | - File upload succeeds<br>- Storage usage increments<br>- File stored correctly | 🔴 Critical |
| 3.2.2 | **Upload file exceeding storage limit** | - Upload blocked before file is stored<br>- 402 error: "Uploading this file would exceed your storage limit"<br>- No partial file created | 🔴 Critical |
| 3.2.3 | **Multiple file uploads near limit** | - Concurrent uploads handled correctly<br>- Total storage usage calculated accurately<br>- No race conditions | 🔴 Critical |
| 3.2.4 | **Delete file reduces storage usage** | - Storage usage decrements correctly<br>- Deleted file space freed<br>- Can upload new files after deletion | 🔴 Critical |
| 3.2.5 | **Storage recalculation from disk** | - Admin can trigger recalculation via `/platform/organizations/{id}/recalculate-usage`<br>- Recalculated value matches actual disk usage<br>- Usage cache updated | 🟡 High |
| 3.2.6 | **Storage across multiple disks (public/private)** | - Storage usage includes both public and private disk files<br>- Files in `organizations/{orgId}/` counted correctly | 🟡 High |

#### File Types to Test:

- [ ] Student photos/avatars
- [ ] Staff photos/avatars
- [ ] Document uploads (DMS)
- [ ] Report exports (PDF/Excel)
- [ ] Certificate templates
- [ ] ID card templates
- [ ] Library book covers

---

### 3.3 Periodic Limits (Monthly/Yearly Resets)

**Objective:** Verify limits that reset periodically work correctly.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 3.3.1 | **Monthly reset (report_exports)** | - Limit resets at start of each month<br>- `period_start` and `period_end` updated<br>- Usage count resets to 0 | 🟡 High |
| 3.3.2 | **Yearly reset (exams_yearly)** | - Limit resets at start of each year<br>- Usage tracking continues correctly | 🟢 Medium |
| 3.3.3 | **Limit reached before reset** | - Once monthly limit reached, no more exports until next month<br>- UI shows "Limit resets on {date}" | 🟡 High |

---

## Payment & Renewal Workflows

### 4.1 Renewal Request Flow

**Objective:** Verify renewal request creation and approval works correctly.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 4.1.1 | **Create renewal request** | - Request created with `status: 'pending'`<br>- Plan, additional schools, discount code validated<br>- Request appears in `/api/subscription/renewal-history` | 🔴 Critical |
| 4.1.2 | **Submit payment for renewal** | - Payment record created with `status: 'pending'`<br>- Payment linked to renewal request<br>- Payment appears in `/api/subscription/payment-history` | 🔴 Critical |
| 4.1.3 | **Platform admin approves renewal** | - Payment confirmed (`status: 'confirmed'`)<br>- New subscription activated with correct plan<br>- Old subscription soft-deleted or marked expired<br>- Organization can continue using system | 🔴 Critical |
| 4.1.4 | **Platform admin rejects renewal** | - Payment rejected (`status: 'rejected'`)<br>- Renewal request rejected with reason<br>- Old subscription remains active (if still valid) or expires | 🟡 High |
| 4.1.5 | **Renewal with discount code** | - Discount applied correctly<br>- `discount_amount` calculated and stored<br>- Final amount = subtotal - discount | 🔴 Critical |
| 4.1.6 | **Renewal with additional schools** | - Additional schools fee calculated correctly<br>- Total schools allowed = plan limit + additional schools<br>- Subscription stores `additional_schools` count | 🔴 Critical |
| 4.1.7 | **Renewal with plan upgrade/downgrade** | - New plan features/limits applied immediately<br>- Old plan features disabled (if downgrade)<br>- Usage limits updated correctly | 🔴 Critical |

#### Test Steps:

```bash
# 1. Create renewal request via /api/subscription/renewal-request
# 2. Submit payment via /api/subscription/submit-payment
# 3. Login as platform admin
# 4. View pending payments at /platform/payments/pending
# 5. Confirm payment via /platform/payments/{id}/confirm
# 6. Verify subscription updated correctly
# 7. Verify organization can access all new plan features
```

---

### 4.2 License Fee Payment

**Objective:** Verify one-time license fee payment workflow.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 4.2.1 | **Plan requires license fee** | - `hasLicenseFee()` returns true<br>- `license_fee_afn` and `license_fee_usd` set<br>- Subscription shows `license_fee_pending: true` | 🔴 Critical |
| 4.2.2 | **Submit license fee payment** | - Payment created with `payment_type: 'license'`<br>- Payment status: 'pending'<br>- License status still pending until admin confirms | 🔴 Critical |
| 4.2.3 | **Platform admin confirms license payment** | - Payment confirmed<br>- Subscription `license_paid_at` set<br>- `license_payment_id` linked<br>- Organization access restored (if was blocked) | 🔴 Critical |
| 4.2.4 | **License fee unpaid blocks access** | - `isLicenseFeePending()` returns true<br>- `shouldBeSuspendedForPayment()` returns true<br>- Access level: 'blocked'<br>- UI shows "License fee required" message | 🔴 Critical |
| 4.2.5 | **License fee paid allows access** | - `hasLicensePaid()` returns true<br>- Access restored<br>- No license fee warnings | 🔴 Critical |

---

### 4.3 Maintenance Fee Payment

**Objective:** Verify recurring maintenance fee payment workflow.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 4.3.1 | **Maintenance fee due date calculation** | - `next_maintenance_due_at` calculated from `last_maintenance_paid_at` + billing period<br>- Billing period days used correctly (30/90/365/custom) | 🔴 Critical |
| 4.3.2 | **Maintenance fee overdue** | - `isMaintenanceOverdue()` returns true if `next_maintenance_due_at < now()`<br>- `daysMaintenanceOverdue()` returns correct count<br>- Access blocked until payment confirmed | 🔴 Critical |
| 4.3.3 | **Submit maintenance fee payment** | - Payment created with `payment_type: 'maintenance'`<br>- Payment linked to subscription<br>- Payment status: 'pending' | 🔴 Critical |
| 4.3.4 | **Platform admin confirms maintenance payment** | - Payment confirmed<br>- `last_maintenance_paid_at` updated<br>- `next_maintenance_due_at` recalculated (current date + billing period)<br>- Subscription status restored to 'active' (if was in grace) | 🔴 Critical |
| 4.3.5 | **Maintenance invoice generation** | - Admin can generate invoices via `/platform/maintenance-fees/generate-invoices`<br>- Invoices created for due/overdue subscriptions<br>- Invoice linked to payment when paid | 🟡 High |
| 4.3.6 | **Multiple maintenance payments** | - Each payment extends maintenance period correctly<br>- Payment history shows all maintenance payments<br>- No duplicate payments for same period | 🟡 High |

---

### 4.4 Payment Amount Validation

**Objective:** Verify payment amounts match calculated prices.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 4.4.1 | **Payment amount matches calculated price** | - Payment submitted with amount matching `calculatePrice()` output<br>- Payment accepted<br>- No validation errors | 🔴 Critical |
| 4.4.2 | **Payment amount mismatch** | - Admin should verify amount manually<br>- Consider adding validation: amount within ±5% tolerance<br>- If mismatch, admin can reject or override | 🟡 High |
| 4.4.3 | **Currency validation** | - Payment currency matches plan currency (AFN/USD)<br>- Multi-currency supported<br>- Currency conversion not required (manual) | 🟡 High |

---

## Status Transitions & Lifecycle

### 5.1 Automatic Status Transitions

**Objective:** Verify cron job processes subscription status transitions correctly.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 5.1.1 | **Trial/Active → Grace Period** | - When `expires_at < now()`, status changes to 'grace_period'<br>- `grace_period_ends_at` set (now + grace_period_days)<br>- History logged<br>- Notification sent (if configured) | 🔴 Critical |
| 5.1.2 | **Grace Period → Readonly** | - When `grace_period_ends_at < now()`, status changes to 'readonly'<br>- `readonly_period_ends_at` set (now + readonly_period_days)<br>- Write access blocked<br>- Notification sent | 🔴 Critical |
| 5.1.3 | **Readonly → Expired** | - When `readonly_period_ends_at < now()`, status changes to 'expired'<br>- All access blocked<br>- Notification sent<br>- Admin can see expired subscriptions | 🔴 Critical |
| 5.1.4 | **Cron job execution** | - `php artisan subscription:process-transitions` runs daily<br>- Logs show transition counts<br>- No errors in log file | 🔴 Critical |
| 5.1.5 | **Concurrent status transitions (race condition)** | - Database locks prevent duplicate transitions<br>- Only one transition per subscription per run<br>- No data corruption | 🔴 Critical |
| 5.1.6 | **Status transition with payment overdue** | - Payment overdue takes precedence<br>- Status may remain 'active' but access blocked<br>- Status message shows payment issue | 🔴 Critical |

#### Test Steps:

```bash
# 1. Create subscription with expires_at in past
# 2. Run: php artisan subscription:process-transitions
# 3. Verify status changed to 'grace_period'
# 4. Wait/advance time to grace_period_ends_at
# 5. Run transition command again
# 6. Verify status changed to 'readonly'
# 7. Repeat for readonly → expired
```

---

### 5.2 Manual Status Changes (Platform Admin)

**Objective:** Verify admin can manually change subscription status.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 5.2.1 | **Suspend subscription** | - Status changes to 'suspended'<br>- `suspension_reason` stored<br>- Access blocked immediately<br>- History logged | 🟡 High |
| 5.2.2 | **Reactivate suspended subscription** | - Status changes back to 'active'<br>- Access restored<br>- History logged | 🟡 High |
| 5.2.3 | **Cancel subscription** | - Status changes to 'cancelled'<br>- `cancelled_at` set<br>- Access blocked<br>- History logged | 🟡 High |

---

## Integration Testing

### 6.1 Feature Access Integration

**Objective:** Verify features are properly gated across all app modules.

#### Modules to Test:

**Students Module:**
- [ ] Create student (blocked if `students` feature disabled)
- [ ] Edit student (blocked if readonly)
- [ ] Delete student (blocked if readonly)
- [ ] Student limit reached (402 error)
- [ ] Student photos upload (storage limit check)

**Staff Module:**
- [ ] Create staff (blocked if `staff` feature disabled)
- [ ] Staff limit reached
- [ ] Leave management (blocked if `leave_management` disabled)

**Classes Module:**
- [ ] Create class (requires `classes` + dependencies `students`, `staff`)
- [ ] Class limit reached
- [ ] Class schedule (requires `timetables`)

**Exams Module:**
- [ ] Create exam (requires `exams` or `exams_full`)
- [ ] Question bank (requires `question_bank` + `exams_full`)
- [ ] Exam paper generator (requires `exam_paper_generator` + `question_bank`)
- [ ] Grades (requires `grades` + `exams_full`)

**Finance Module:**
- [ ] Finance accounts (requires `finance`)
- [ ] Fees management (requires `fees` + `finance`)
- [ ] Multi-currency (requires `multi_currency` + `finance`)
- [ ] Income/Expense entries (limits enforced)

**Reports Module:**
- [ ] PDF reports (requires `pdf_reports`)
- [ ] Excel export (requires `excel_export` + `pdf_reports`)
- [ ] Report templates (requires `report_templates` + `pdf_reports`)
- [ ] Advanced reports (requires `advanced_reports` + `pdf_reports`)
- [ ] Monthly report export limit

**DMS Module:**
- [ ] Document upload (requires `dms`)
- [ ] Document limit reached
- [ ] Storage limit check on upload

**Library Module:**
- [ ] Add book (requires `library`)
- [ ] Book limit reached

**Assets Module:**
- [ ] Create asset (requires `assets`)
- [ ] Asset limit reached

**Certificates Module:**
- [ ] Generate certificate (requires `graduation`)
- [ ] Certificate verification (requires `certificate_verification` + `graduation`)
- [ ] Certificate template limit

---

### 6.2 Cross-Feature Dependencies

**Objective:** Verify feature dependencies are enforced correctly.

#### Dependency Chains to Test:

1. **Classes → Students + Staff**
   - [ ] Cannot create class if students or staff features disabled
   - [ ] Error message shows missing dependencies

2. **Timetables → Students + Staff + Classes**
   - [ ] Cannot create timetable if any dependency missing

3. **Exams Full → Exams + Subjects**
   - [ ] Cannot use full exam features without base exams and subjects

4. **Question Bank → Exams Full + Subjects**
   - [ ] Dependency chain verified

5. **Fees → Finance**
   - [ ] Cannot manage fees without finance feature

6. **Multi-Currency → Finance**
   - [ ] Currency features blocked without finance

---

## Performance & Edge Cases

### 7.1 Performance Testing

**Objective:** Verify system handles load and large datasets efficiently.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 7.1.1 | **Large organization (1000+ students)** | - Subscription status endpoint responds < 500ms<br>- Usage calculation completes < 2s<br>- Feature checks don't cause N+1 queries | 🟡 High |
| 7.1.2 | **Multiple concurrent subscription checks** | - No database locks blocking requests<br>- Response times remain acceptable<br>- No deadlocks | 🟡 High |
| 7.1.3 | **Storage calculation for large orgs** | - Recalculation completes in reasonable time<br>- Cached values used for API requests<br>- Admin can trigger recalculation manually | 🟢 Medium |
| 7.1.4 | **Plan list caching** | - Plan list cached (1 hour TTL)<br>- Cache invalidated on plan update<br>- Response time < 100ms | 🟢 Medium |
| 7.1.5 | **Feature status caching** | - Feature status cached per organization (5 min TTL)<br>- Cache invalidated on plan/addon changes | 🟢 Medium |

#### Performance Benchmarks:

- `/api/subscription/status-lite`: < 200ms
- `/api/subscription/status`: < 300ms
- `/api/subscription/usage`: < 500ms
- `/api/subscription/features`: < 400ms
- Feature check middleware: < 50ms overhead
- Limit check middleware: < 100ms overhead

---

### 7.2 Edge Cases

**Objective:** Verify system handles edge cases gracefully.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 7.2.1 | **Subscription with deleted plan** | - Subscription still works (plan snapshot)<br>- Cannot renew to deleted plan<br>- Admin must assign new plan | 🟡 High |
| 7.2.2 | **Subscription with missing organization** | - System handles gracefully<br>- Status returns 'none'<br>- No errors thrown | 🟡 High |
| 7.2.3 | **Payment confirmation race condition** | - Only one confirmation succeeds<br>- Duplicate confirmations rejected<br>- Payment status remains consistent | 🔴 Critical |
| 7.2.4 | **Status transition during payment processing** | - Status changes don't interfere with payment<br>- Payment completion updates subscription correctly | 🔴 Critical |
| 7.2.5 | **Billing period change mid-subscription** | - Existing subscription keeps old billing period<br>- New subscriptions use new billing period<br>- Maintenance due dates calculated correctly | 🟡 High |
| 7.2.6 | **Additional schools added mid-subscription** | - Schools limit updated immediately<br>- Additional schools fee pro-rated (if applicable)<br>- Total schools allowed recalculated | 🟢 Medium |
| 7.2.7 | **Zero-value payments** | - Free plans handled correctly<br>- Trial subscriptions work without payment<br>- No payment records required for free plans | 🟡 High |
| 7.2.8 | **Negative limits or invalid data** | - System validates and rejects invalid data<br>- Database constraints prevent corruption<br>- Error messages are clear | 🟡 High |

---

## Security & Permissions

### 8.1 Permission Checks

**Objective:** Verify permission system works correctly with subscriptions.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 8.1.1 | **Subscription.read permission required** | - `/api/subscription/status`, `/usage`, `/features` require permission<br>- Users without permission get 403<br>- `status-lite` accessible to all authenticated users | 🔴 Critical |
| 8.1.2 | **Subscription.admin permission (platform)** | - Platform admin routes require global `subscription.admin` permission<br>- Permission not organization-scoped<br>- Platform admin can manage all subscriptions | 🔴 Critical |
| 8.1.3 | **Organization admin cannot manage other orgs** | - Org admin can only view their own subscription<br>- Cannot access other org's subscription endpoints<br>- 403 if attempting cross-org access | 🔴 Critical |
| 8.1.4 | **Payment submission validation** | - Users can only submit payments for their own organization<br>- Payment amount cannot be manipulated<br>- Renewal request ownership verified | 🔴 Critical |

---

### 8.2 Data Access Security

**Objective:** Verify subscription gating prevents unauthorized data access.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 8.2.1 | **Read-only mode blocks writes** | - All POST/PUT/DELETE requests return 402<br>- GET requests still work<br>- No data modification possible | 🔴 Critical |
| 8.2.2 | **Blocked subscription blocks all access** | - All API endpoints return 402<br>- Only status-lite accessible<br>- Frontend shows "Subscription expired" message | 🔴 Critical |
| 8.2.3 | **Feature disabled blocks related endpoints** | - Feature-specific endpoints return 402<br>- Related UI components hidden<br>- No workarounds possible | 🔴 Critical |

---

## Frontend Integration

### 9.1 Subscription Status UI

**Objective:** Verify frontend correctly displays subscription status and handles state changes.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 9.1.1 | **Status banner displays correctly** | - Banner shows trial/grace/readonly/expired status<br>- Message is clear and actionable<br>- Renewal button present when applicable | 🔴 Critical |
| 9.1.2 | **Subscription page loads** | - All subscription data displays correctly<br>- Usage charts/graphs render<br>- Features list shows enabled/disabled status | 🟡 High |
| 9.1.3 | **Usage warnings displayed** | - Warning badges shown when usage ≥ 80%<br>- Progress bars show percentage<br>- "Upgrade" links functional | 🟡 High |
| 9.1.4 | **Feature cards show access level** | - Enabled features show green checkmark<br>- Disabled features show gray/disabled state<br>- Read-only features show lock icon | 🟡 High |
| 9.1.5 | **Payment history displays** | - Payment list shows all payments<br>- Status badges (confirmed/pending/rejected) correct<br>- Payment dates formatted correctly | 🟢 Medium |

---

### 9.2 Feature Gating in UI

**Objective:** Verify UI components hide/disable based on feature access.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 9.2.1 | **Navigation menu items hidden** | - Disabled features not shown in sidebar<br>- Features with missing dependencies shown but disabled<br>- Dependency tooltip shown on hover | 🔴 Critical |
| 9.2.2 | **Action buttons disabled** | - Create/Edit/Delete buttons disabled in readonly mode<br>- Buttons hidden if feature disabled<br>- Tooltip explains why button disabled | 🔴 Critical |
| 9.2.3 | **Feature upgrade prompts** | - 402 errors caught and displayed as upgrade prompts<br>- Upgrade modal/links functional<br>- Redirects to subscription/plans page | 🟡 High |
| 9.2.4 | **Limit reached warnings** | - Warning shown before limit reached (80%)<br>- Error shown when limit reached<br>- Upgrade prompt includes resource name and current/limit | 🟡 High |

---

### 9.3 React Hooks Behavior

**Objective:** Verify React hooks handle subscription state correctly.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 9.3.1 | **useSubscriptionGateStatus hook** | - Returns correct status without permission<br>- Refetches when subscription changes<br>- Handles errors gracefully (returns null) | 🔴 Critical |
| 9.3.2 | **useSubscriptionAccess hook** | - Derives canRead/canWrite from gate status<br>- Updates when subscription status changes<br>- Used by ProtectedRoute component | 🔴 Critical |
| 9.3.3 | **useHasFeature hook** | - Returns boolean for feature access<br>- Updates when features change<br>- Handles loading/error states | 🟡 High |
| 9.3.4 | **useResourceUsage hook** | - Returns usage data for specific resource<br>- Updates when usage changes<br>- Shows unlimited (-1) correctly | 🟡 High |

---

## Platform Admin Operations

### 10.1 Platform Admin Dashboard

**Objective:** Verify platform admin can manage all subscriptions effectively.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 10.1.1 | **Dashboard statistics** | - Total organizations, subscriptions by status, revenue correct<br>- Revenue breakdown by payment type<br>- Pending payments/renewals count accurate | 🟡 High |
| 10.1.2 | **Subscription list filtering** | - Filter by status, plan, expiring soon works<br>- Pagination works correctly<br>- Search functionality (if implemented) | 🟡 High |
| 10.1.3 | **Organization subscription details** | - Full subscription info displayed<br>- Usage data shown<br>- Features status shown<br>- Payment history accessible | 🟡 High |

---

### 10.2 Plan Management

**Objective:** Verify platform admin can create/update plans correctly.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 10.2.1 | **Create plan with features/limits** | - Plan created successfully<br>- Features assigned correctly<br>- Limits assigned correctly<br>- Billing period saved | 🔴 Critical |
| 10.2.2 | **Update plan features** | - Features can be enabled/disabled<br>- Disabled features removed from plan<br>- Existing subscriptions unaffected (snapshot) | 🔴 Critical |
| 10.2.3 | **Update plan limits** | - Limits can be modified<br>- Existing subscriptions keep old limits<br>- New subscriptions use new limits | 🟡 High |
| 10.2.4 | **Delete plan** | - Plan soft-deleted<br>- Cannot create new subscriptions<br>- Existing subscriptions continue working | 🟡 High |

---

### 10.3 Subscription Management

**Objective:** Verify platform admin can manage organization subscriptions.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 10.3.1 | **Activate subscription manually** | - Subscription created with correct plan<br>- Status set to 'active'<br>- Expiry date calculated correctly<br>- History logged | 🔴 Critical |
| 10.3.2 | **Suspend subscription** | - Status changes to 'suspended'<br>- Reason stored<br>- Access blocked<br>- History logged | 🟡 High |
| 10.3.3 | **Add limit override** | - Override created for organization<br>- Override takes precedence over plan limit<br>- Expiry date supported<br>- History logged | 🟡 High |
| 10.3.4 | **Toggle feature addon** | - Feature enabled/disabled for organization<br>- Addon overrides plan features<br>- Expires with subscription<br>- History logged | 🟡 High |
| 10.3.5 | **Recalculate usage** | - Usage recalculated from database<br>- Storage recalculated from disk<br>- Usage_current table updated<br>- Accurate counts returned | 🟡 High |

---

### 10.4 Payment & Renewal Management

**Objective:** Verify platform admin can process payments and renewals.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 10.4.1 | **View pending payments** | - All pending payments listed<br>- Organization and plan info shown<br>- Payment details visible | 🟡 High |
| 10.4.2 | **Confirm payment** | - Payment status changes to 'confirmed'<br>- Associated renewal approved (if exists)<br>- Subscription activated/renewed<br>- History logged | 🔴 Critical |
| 10.4.3 | **Reject payment** | - Payment status changes to 'rejected'<br>- Reason stored<br>- Associated renewal rejected<br>- History logged | 🟡 High |
| 10.4.4 | **Approve renewal request** | - Renewal approved<br>- Payment linked<br>- New subscription activated<br>- Old subscription expired | 🔴 Critical |
| 10.4.5 | **Reject renewal request** | - Renewal rejected with reason<br>- Payment remains pending<br>- Old subscription continues (if valid) | 🟡 High |
| 10.4.6 | **Confirm maintenance payment** | - Payment confirmed<br>- Maintenance due date extended<br>- Subscription reactivated if was in grace<br>- History logged | 🔴 Critical |
| 10.4.7 | **Confirm license payment** | - Payment confirmed<br>- License marked as paid<br>- Access restored if was blocked<br>- History logged | 🔴 Critical |

---

## Data Integrity & Recovery

### 11.1 Data Consistency

**Objective:** Verify subscription data remains consistent across operations.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 11.1.1 | **Subscription history logged** | - All status changes logged<br>- Payment confirmations logged<br>- Feature toggles logged<br>- History queryable via API | 🟡 High |
| 11.1.2 | **Payment records linked correctly** | - Payments linked to subscriptions<br>- License payments linked via `license_payment_id`<br>- Maintenance invoices linked via `maintenance_invoice_id` | 🟡 High |
| 11.1.3 | **Soft deletes work correctly** | - Deleted subscriptions not visible in lists<br>- Can be restored if needed<br>- Related data (payments, history) preserved | 🟢 Medium |
| 11.1.4 | **Foreign key constraints** | - Cannot delete plan with active subscriptions<br>- Cannot delete organization with subscription<br>- Database enforces referential integrity | 🟡 High |

---

### 11.2 Recovery Scenarios

**Objective:** Verify system can recover from errors gracefully.

#### Test Cases:

| # | Test Scenario | Expected Result | Priority |
|---|---------------|-----------------|----------|
| 11.2.1 | **Transaction rollback on error** | - If payment confirmation fails, all changes rolled back<br>- No partial updates<br>- Error logged<br>- System remains consistent | 🔴 Critical |
| 11.2.2 | **Missing plan relationship** | - System handles gracefully if plan deleted<br>- Subscription continues with plan data snapshot<br>- Cannot renew without assigning new plan | 🟡 High |
| 11.2.3 | **Corrupted subscription data** | - Validation prevents invalid data<br>- Admin can manually fix via platform admin<br>- System continues working | 🟢 Medium |

---

## Production Readiness Checklist

### Final Verification Before Production

#### Code Quality:
- [ ] All critical bugs fixed (transactions, race conditions, validation)
- [ ] Code reviewed and approved
- [ ] No console errors in browser
- [ ] No PHP errors in logs
- [ ] Database migrations tested on clean database

#### Testing:
- [ ] All critical test cases passed (marked 🔴 Critical)
- [ ] All high-priority test cases passed (marked 🟡 High)
- [ ] Edge cases tested
- [ ] Performance benchmarks met
- [ ] Security tests passed

#### Deployment:
- [ ] Environment variables configured
- [ ] Database backups configured
- [ ] Cron jobs scheduled and tested
- [ ] Queue workers configured (if using)
- [ ] Log rotation configured
- [ ] Monitoring/alerting set up (optional but recommended)

#### Documentation:
- [ ] API endpoints documented
- [ ] Admin operations documented
- [ ] Known issues/limitations documented
- [ ] Rollback procedure documented

#### Communication:
- [ ] Stakeholders notified of deployment
- [ ] Support team trained on subscription system
- [ ] User-facing messages reviewed for clarity

---

## Test Execution Log

Use this section to track your testing progress:

**Date:** _______________  
**Tester:** _______________  
**Environment:** _______________

### Critical Tests (Must Pass):
- [ ] Subscription Status & Access Levels (1.1)
- [ ] Feature Gating (2.1)
- [ ] Usage Limits (3.1)
- [ ] Payment & Renewal (4.1-4.3)
- [ ] Status Transitions (5.1)
- [ ] Security & Permissions (8.1)

### High Priority Tests:
- [ ] Plan Management (1.2)
- [ ] Middleware Enforcement (2.2)
- [ ] Storage Limits (3.2)
- [ ] Integration Testing (6.1-6.2)
- [ ] Performance (7.1)
- [ ] Edge Cases (7.2)

### Medium/Low Priority Tests:
- [ ] Periodic Limits (3.3)
- [ ] Manual Status Changes (5.2)
- [ ] Frontend Integration (9.1-9.3)
- [ ] Platform Admin (10.1-10.4)
- [ ] Data Integrity (11.1-11.2)

---

## Test Data Requirements

To execute this testing plan, you'll need:

1. **Test Organizations:**
   - Org with no subscription
   - Org with trial subscription
   - Org with active subscription
   - Org with expired subscription
   - Org with grace period
   - Org with readonly mode
   - Org with suspended subscription
   - Org with payment overdue
   - Org with license fee unpaid

2. **Test Plans:**
   - Starter plan (minimal features)
   - Pro plan (moderate features)
   - Complete plan (most features)
   - Enterprise plan (all features)
   - Custom plan (for testing)

3. **Test Users:**
   - Regular user (no subscription.read permission)
   - Organization admin (with subscription.read)
   - Platform admin (with subscription.admin)

4. **Test Data:**
   - Students near limit (e.g., 9/10 students)
   - Files near storage limit
   - Payment records (pending, confirmed, rejected)
   - Renewal requests (pending, approved, rejected)

---

## Reporting Issues

When issues are found during testing:

1. **Document the issue:**
   - Test case number
   - Steps to reproduce
   - Expected vs actual result
   - Screenshots/logs (if applicable)
   - Priority (Critical/High/Medium/Low)

2. **Track in issue tracker:**
   - Create issue with detailed description
   - Assign to development team
   - Mark test case as "Blocked" until fixed

3. **Retest after fix:**
   - Verify fix resolves issue
   - Run related test cases to ensure no regressions
   - Mark test case as "Passed"

---

**End of Production Testing Plan**
