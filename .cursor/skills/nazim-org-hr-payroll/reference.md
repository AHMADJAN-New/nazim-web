# Org HR Payroll — Reference

## Who is included in a run (calculate)

Backend **calculate** builds run items only for staff who:

1. Have an **active assignment** in the period (staff_assignments with status active, start_date/end_date overlapping period).
2. Have an **active compensation profile** effective for the period (effective_from <= period_end, effective_to either null or >= period_start, status active).

Gross is derived from the profile’s base_salary and pay_frequency (prorated to the period) plus any **staff_compensation_items** (compensation_components) linked to that profile. Deductions and net are set per run item (breakdown JSON can hold component details).

## Period overlap rule

When creating a payroll period, the backend checks that no existing period for the organization overlaps the new (period_start, period_end). Overlap is defined as ranges intersecting.

## Payslips

Created during **finalize**: one payslip per payroll_run_item, with a generated payslip_number (e.g. PS-YYYYMMDDHHMMSS-<item_id_prefix>). Payslips are read-only after creation; run detail and reports can show payslip numbers and status.

## Feature gate

All payroll endpoints use middleware `feature:org_hr_payroll`. Ensure the organization has the addon or plan feature enabled (e.g. enterprise plan or organization_feature_addons).
