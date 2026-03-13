---
name: nazim-org-hr-payroll
description: Documents the Organization HR Payroll module in Nazim: compensation profiles, payroll periods, payroll runs, and the run lifecycle (create run, calculate, finalize, mark paid). Use when working on the payroll page, run calculation, finalization, compensation profiles, payroll periods, or org_hr_payroll feature.
---

# Nazim Org HR Payroll

## Overview

Payroll lives under **Org Admin** (`/org-admin/hr/payroll`). It is gated by the `org_hr_payroll` feature and uses three building blocks: **compensation profiles** (per-staff salary), **payroll periods** (date ranges), and **payroll runs** (one run per period, with a strict lifecycle). Running payroll means creating a run for a period, calculating pay from compensation and assignments, then finalizing and marking it paid.

## Run lifecycle

Payroll runs follow a fixed state flow:

| Status      | Meaning | Allowed actions |
|------------|--------|------------------|
| **draft**  | Run created, not yet calculated | Calculate |
| **processing** | Calculated; has run items (gross/deduction/net per staff) | Finalize |
| **finalized** | Locked; payslips generated | Mark paid |
| **paid**   | Period closed | None (read-only) |

Rules:

- One run per payroll period (backend rejects a second run for the same period).
- **Calculate** (`hr_payroll.run`): Only when status is draft or processing. Recomputes run items from active compensation profiles and assignments for the period date range; sets status to `processing`.
- **Finalize** (`hr_payroll.approve`): Only when status is `processing` and run has items. Locks run, creates payslips for each run item; sets status to `finalized`.
- **Mark paid** (`hr_payroll.approve`): Only when status is `finalized`. Sets run and period to `paid`; no further changes.

Backend rejects: recalculating finalized/paid runs; finalizing without items; marking paid when not finalized.

## Permissions

| Permission | Use |
|------------|-----|
| `hr_payroll.read` | View compensation, periods, runs, run detail |
| `hr_payroll.create` | Create compensation profiles, periods, runs |
| `hr_payroll.run` | Trigger calculate on a run |
| `hr_payroll.approve` | Finalize run, mark run paid |

UI shows Calculate only when `hr_payroll.run` and status is draft/processing; Finalize when `hr_payroll.approve` and status is processing; Mark paid when `hr_payroll.approve` and status is finalized.

## Page structure (OrganizationHrPayrollPage)

- **Tabs**: Payroll Runs | Payroll Periods | Compensation Profiles.
- **Runs tab**: Table of runs (name, period range, staff count, total net, status). Actions: View (opens run detail), Create run (period picker; periods that already have a run are excluded), Calculate, Finalize, Mark paid (by status and permission).
- **Periods tab**: Table of periods (name, period start/end, pay date, status). Add period dialog: name, period_start, period_end, pay_date (optional). Backend validates no overlapping periods.
- **Compensation tab**: Table of profiles (staff, base salary, pay frequency, effective from/to, status). Add/Edit dialog: staff_id, base_salary, pay_frequency, currency, effective_from, effective_to, grade, step, status, legacy_salary_notes. One active compensation profile per staff (backend enforces).
- **Run detail**: When a run is selected, a sheet/section shows run summary and run items (staff, gross, deduction, net, payslip number when finalized).

## Frontend hooks and API

**Queries**

- `useOrgHrCompensation(staffId?)` → compensation profiles (optional filter by staff).
- `useOrgHrPayrollPeriods()` → list of periods.
- `useOrgHrPayrollRuns({ payrollPeriodId?, status? })` → list of runs.
- `useOrgHrPayrollRun(runId)` → single run + run items (for detail view).

**Mutations**

- `useCreateOrgHrCompensation`, `useUpdateOrgHrCompensation`, `useDeleteOrgHrCompensation`.
- `useCreateOrgHrPayrollPeriod`.
- `useCreateOrgHrPayrollRun` (payload: `payroll_period_id`, `run_name` optional).
- `useCalculateOrgHrPayrollRun(runId)`.
- `useFinalizeOrgHrPayrollRun(runId)`.
- `useMarkOrgHrPayrollRunPaid(runId)`.

After calculate/finalize/mark paid, invalidate `org-hr-payroll-runs`, `org-hr-payroll-run`, and `org-hr-analytics-overview`.

**API (orgHrApi)**  
Prefix `/org-hr`. All payroll endpoints use middleware `feature:org_hr_payroll`.

- Compensation: `GET/POST /compensation/profiles`, `PUT/DELETE /compensation/profiles/{id}`.
- Periods: `GET /payroll/periods`, `POST /payroll/periods`.
- Runs: `GET /payroll/runs`, `POST /payroll/runs`, `GET /payroll/runs/{id}`.
- Run actions: `POST /payroll/runs/{id}/calculate`, `POST /payroll/runs/{id}/finalize`, `POST /payroll/runs/{id}/mark-paid`.

## Validation (Zod)

- **Compensation**: `orgHrCompensationCreateSchema` / `orgHrCompensationUpdateSchema` in `frontend/src/lib/validations/orgHr.ts`. Base schema is an object; create schema adds a refine (effective_to >= effective_from). Update schema uses base `.partial().extend({ staff_id: optional })` (do not call `.partial()` on the refined create schema).
- **Period**: `orgHrPayrollPeriodCreateSchema` (name, period_start, period_end, pay_date optional; refine period_end >= period_start).
- **Run**: `orgHrPayrollRunCreateSchema` (payroll_period_id, run_name optional).

## Backend (OrganizationHrController)

- **Calculate**: Load run (draft/processing only) and period; for each staff with active assignment in period and active compensation profile effective for the period, compute gross (from profile + components); build run items (gross, deduction, net); replace existing items, set run status `processing`, period status `processing`.
- **Finalize**: Require run status `processing` and at least one run item; in a transaction: set run status `finalized`, period `finalized`, create payslip per run item.
- **Mark paid**: Require run status `finalized`; set run and period status `paid`.

Compensation and period create/update validate organization and (for compensation) no duplicate active profile per staff. Period create checks no overlapping period dates.

## Data model (summary)

- **staff_compensation_profiles**: staff_id, base_salary, pay_frequency, currency, effective_from, effective_to, grade, step, status (active/inactive).
- **payroll_periods**: name, period_start, period_end, pay_date, status.
- **payroll_runs**: payroll_period_id, run_name, status (draft | processing | finalized | paid).
- **payroll_run_items**: payroll_run_id, staff_id, gross_amount, deduction_amount, net_amount, breakdown (JSON).
- **payslips**: payroll_run_item_id, payslip_number, generated_at (created on finalize).

## File locations

| Area | Path |
|------|------|
| Page | `frontend/src/pages/organization/hr/OrganizationHrPayrollPage.tsx` |
| Hooks | `frontend/src/hooks/orgHr/useOrgHr.ts` (compensation, periods, runs, calculate, finalize, mark paid) |
| API | `frontend/src/lib/api/client.ts` (orgHrApi compensation, payroll periods/runs) |
| Validation | `frontend/src/lib/validations/orgHr.ts` |
| Types | `frontend/src/types/domain/orgHr.ts`, `frontend/src/types/api/orgHr.ts` |
| Mapper | `frontend/src/mappers/orgHrMapper.ts` |
| Backend | `backend/app/Http/Controllers/OrganizationHrController.php` (compensationIndex, payrollPeriods, payrollRuns, createPayrollRun, calculatePayrollRun, finalizePayrollRun, markPayrollRunPaid) |
| Routes | `backend/routes/api.php` under `org-hr` prefix, `feature:org_hr_payroll` |

## Checklist (payroll changes)

- [ ] Run lifecycle: only allow calculate when draft/processing; finalize when processing with items; mark paid when finalized.
- [ ] Permissions: use `hr_payroll.read` / `hr_payroll.create` / `hr_payroll.run` / `hr_payroll.approve` for visibility and actions.
- [ ] Create run: only periods that do not already have a run are selectable.
- [ ] Compensation: one active profile per staff; effective_to >= effective_from; use base schema for update `.partial()` (not the refined create schema).
- [ ] After run mutations, invalidate runs list, run detail, and analytics overview.
- [ ] Backend: all payroll endpoints behind `feature:org_hr_payroll`; validate organization and run/period ownership.
