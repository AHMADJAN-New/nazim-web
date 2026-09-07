# Client Error Reports (Platform Admin Inbox)

**Date:** 2026-09-07  
**Status:** Approved for implementation

## Goal

Replace the ErrorBoundary `mailto:` bug report with a database-backed inbox in Platform Admin so operators can see crashes (page/URL, message, stacks) and triage them.

## Decisions

| Topic | Choice |
|-------|--------|
| Capture | Auto-save on every ErrorBoundary catch |
| Report button | Flags `user_reported` + optional user note; no email |
| Triage | Statuses + admin notes + filters (contact-messages style) |
| Approach | Dedicated `client_error_reports` table + platform page |

## Data model

Table: `client_error_reports` (global, not org-scoped for access; org/school stored for context)

| Column | Type | Notes |
|--------|------|--------|
| id | UUID PK | |
| client_error_id | string | Frontend-generated id |
| message | text | |
| stack | text nullable | Truncated if huge |
| component_stack | text nullable | React component stack |
| url | text | Page URL |
| user_agent | text nullable | |
| level | string | `page` \| `component` \| `critical` |
| user_id | UUID nullable | Authenticated user if any |
| organization_id | UUID nullable | From profile when available |
| school_id | UUID nullable | From profile when available |
| user_reported | boolean | Default false; set true on Report |
| user_note | text nullable | Optional description from Report dialog |
| status | string | `new` \| `read` \| `resolved` \| `ignored` |
| admin_notes | text nullable | |
| reviewed_by | UUID nullable | Platform admin user |
| reviewed_at | timestamptz nullable | |
| ip_address | string nullable | |
| created_at / updated_at | timestamptz | |

Indexes: `status`, `user_reported`, `organization_id`, `created_at`, `client_error_id`.

## API

### App (authenticated optional / sanctum if token present)

- `POST /api/client-error-reports` — create row on catch (rate-limited). Body: message, stack, component_stack, url, client_error_id, level. Attach user/org/school from auth when present.
- `PATCH /api/client-error-reports/{id}/report` — set `user_reported=true`, optional `user_note`. Caller must own the report or be authenticated creator; allow by id if recently created for same session.

### Platform admin (`platform.admin`)

- `GET /api/platform/error-reports` — paginated list; filters: status, user_reported, organization_id, search, date range
- `GET /api/platform/error-reports/stats` — counts (total, new, user_reported, today, …)
- `GET /api/platform/error-reports/{id}` — detail
- `PUT /api/platform/error-reports/{id}` — update status, admin_notes
- `DELETE /api/platform/error-reports/{id}` — soft or hard delete

## Frontend

### ErrorBoundary

1. On `componentDidCatch`: POST create; keep returned DB `id` in state.
2. Replace `mailto` Report with dialog: optional note → PATCH report.
3. Fail silently if API unavailable (still show UI actions).

### Platform Admin

- Page: `/platform/error-reports` (Contact Messages pattern)
- Sidebar nav + badge for `new` count
- List columns: date, message (truncated), URL/page, level, user-reported badge, status, org
- Detail: full stacks, user note, user/org context, admin notes, status actions

## Out of scope

- Email notifications
- Sentry (keep optional existing hooks)
- Deduplication / fingerprint grouping (v1 = one row per catch)
- Backend PHP exception capture (frontend only)

## Success criteria

- Crashes appear in platform admin without user action
- Report flags the row and stores optional note
- Admins can filter and update status/notes
- No mailto flow remains on ErrorBoundary
