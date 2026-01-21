# Multi-Tenancy, Subscriptions, Plans, Licenses, and Maintenance Fees (Brief)

## Multi-tenancy & School Scoping
- **Organization-scoped multi-tenancy**: Organizations are the primary tenant boundary. Users belong to one organization; super admins with `organization_id = null` can access all organizations.【F:README.md†L452-L481】
- **School-level separation**: Schools are stored in `school_branding` and linked to organizations via `organization_id`. This table holds school metadata and branding.【F:backend/database/migrations/2025_12_01_081600_create_school_branding_table.php†L15-L86】

## Subscription & Plan Architecture
- **Plans** (`subscription_plans`): Define pricing, trial/grace/readonly periods, school limits, and per-school pricing. Plans, features, limits, addons, usage, payments, and history are created in the core SaaS migration.【F:backend/database/migrations/2025_12_28_200000_create_saas_subscription_tables.php†L11-L214】
- **Billing period + fee separation**: Plans separate **license fee (one-time)** from **maintenance fee (recurring)** and allow custom billing periods. Existing yearly prices are migrated into maintenance fees.【F:backend/database/migrations/2026_01_08_100000_add_billing_period_and_fee_separation_to_subscription_plans.php†L12-L61】
- **Plan model helpers**: Provides methods to compute license fees, maintenance fees (including per-school), and billing period details/labels.【F:backend/app/Models/SubscriptionPlan.php†L33-L196】

## Organization Subscription Tracking
- **Organization subscriptions** link an organization to a plan and track status, dates, amounts, and notes.【F:backend/database/migrations/2025_12_28_200000_create_saas_subscription_tables.php†L142-L199】
- **Billing tracking in subscriptions**: Tracks license payments, billing period, and maintenance due dates to support renewal enforcement.【F:backend/database/migrations/2026_01_08_100100_add_billing_tracking_to_organization_subscriptions.php†L13-L49】
- **Subscription model logic**: Checks license payment status, maintenance overdue state, and calculates next maintenance due date by plan billing period.【F:backend/app/Models/OrganizationSubscription.php†L121-L206】

## Maintenance Fees & Invoices
- **Maintenance invoices**: Auto-generated invoices track amount, billing period coverage, due dates, status, and payment linkage for maintenance fees.【F:backend/database/migrations/2026_01_08_100300_create_maintenance_invoices_table.php†L12-L93】

## License System
- **Desktop licenses**: Separate system for desktop licensing with signed payloads, expiry, seat count, and file storage path.【F:backend/database/migrations/2026_01_15_050319_create_desktop_licenses_table.php†L13-L40】

## School Website / Domain Readiness (Current State)
- **Website field exists**: `school_branding` includes `school_website` for each school’s website URL, tied to its organization.【F:backend/database/migrations/2025_12_01_081600_create_school_branding_table.php†L27-L40】
- **No explicit domain mapping**: There is no dedicated domain model/field for routing per-school domains yet; that would require additional schema and routing work later.【F:backend/database/migrations/2025_12_01_081600_create_school_branding_table.php†L27-L40】
