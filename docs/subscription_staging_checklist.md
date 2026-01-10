## Subscription / Plans staging checklist (production-focused)

### Pre-flight
- **Database**
  - Ensure all new migrations ran successfully.
  - Confirm subscription seed data exists (plans, feature definitions, limit definitions).
- **Access**
  - Have 2 test users ready:
    - **Org user** (has an `organization_id` in `profiles`)
    - **Platform admin** (has `subscription.admin`; `profiles.organization_id` can be null)

### 1) Gate status (must work for ALL authenticated users)
- **Login as org user**
  - Call `GET /api/subscription/status-lite` and confirm it returns:
    - `status`, `access_level`, `can_read`, `can_write`, and message fields.
  - Verify navigation gating:
    - When `access_level = none/blocked` (expired/suspended/cancelled), app redirects to `/subscription`.

### 2) Full status / usage / features (permissioned)
- **As org user without `subscription.read`**
  - `GET /api/subscription/status` → **403**
  - `GET /api/subscription/usage` → **403**
  - `GET /api/subscription/features` → **403**
- **Grant `subscription.read`**
  - Re-test the endpoints → **200** and payload is non-empty / structurally correct.

### 3) Renewal lifecycle (org → platform admin)
- **Org user**
  - Create renewal: `POST /api/subscription/renewal-request` (choose an active plan, set `additional_schools`, optional discount code).
  - Submit payment: `POST /api/subscription/submit-payment`
    - Validate the backend enforces **amount correctness** (reject mismatched totals).
    - Re-submit the same payment request and confirm it is **idempotent** (returns existing pending payment).
- **Platform admin**
  - Confirm payment: `POST /api/platform/payments/{paymentId}/confirm`
    - Verify subscription becomes **active** and plan changes as expected.
    - Confirming the same payment again is **idempotent** (“already processed”) and does **not** create a duplicate active subscription.

### 4) Status transitions (trial → grace → readonly → expired)
- Prepare a test org subscription with a short expiry/trial (or backdate timestamps).
- Run the transition job:
  - Either scheduled command or manual trigger (if enabled): `subscription:process-transitions`
- Verify transitions:
  - Trial expired → grace period
  - Grace period expired → readonly
  - Readonly expired → expired (blocked)
- Confirm frontend behavior matches:
  - Grace: read allowed, write allowed (or per your policy)
  - Readonly: read allowed, write blocked
  - Expired: blocked (redirect to subscription page)

### 5) Limits + warnings + blocking
- Set a low limit for one resource (students/report_exports/storage) via:
  - Plan limit definition, or
  - Platform admin limit override endpoint.
- Verify:
  - Approaching limit shows warnings in UI.
  - At limit, creation endpoints/UI actions are blocked and show the expected message.
  - Storage checks (upload) return payment-required style response when over limit.

### 6) Addons + feature dependencies
- Toggle a purchasable addon feature for the org (platform admin):
  - Verify `/api/subscription/features` reflects addon status.
- Dependency enforcement:
  - For a feature that depends on another (e.g. `classes` depends on `students` + `staff`),
    confirm the API returns `dependency_missing` and the UI blocks the feature until deps are enabled.

### 7) Regression checks (quick)
- `GET /api/subscription/plans` returns all active plans and correct billing-period fields.
- Ensure no cross-organization leakage:
  - Confirm org A cannot create/submit/see renewal/payment records for org B.

