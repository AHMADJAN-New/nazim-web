---
name: Activity Logs Frontend
overview: Implement a complete frontend for viewing activity logs with org/school scoping, proper permission checks, filtering, and a clean audit-friendly UI.
todos:
  - id: backend-controller
    content: Create ActivityLogController with index() method, org/school scoping
    status: completed
  - id: backend-route
    content: Add /api/activity-logs route with proper middleware
    status: completed
  - id: backend-permission
    content: Create migration for activity_logs.read permission
    status: completed
  - id: frontend-types
    content: Create API and Domain types for ActivityLog
    status: completed
  - id: frontend-mapper
    content: Create activityLogMapper.ts for API to Domain conversion
    status: completed
  - id: frontend-hook
    content: Create useActivityLogs hook with pagination and filters
    status: pending
  - id: frontend-api
    content: Add activityLogsApi methods to API client
    status: in_progress
  - id: frontend-page
    content: Create ActivityLogsPage component with table and filters
    status: pending
  - id: frontend-route
    content: Add /settings/activity-logs route in App.tsx
    status: completed
  - id: frontend-sidebar
    content: Add Activity Logs menu item in SmartSidebar settings section
    status: completed
  - id: frontend-translations
    content: Add activityLogs translations to all language files
    status: completed
  - id: frontend-lazy
    content: Add ActivityLogsPage to LazyComponents.tsx
    status: completed
---

# Activity Logs Frontend Implementation

This plan creates a full-featured activity logs viewer for organization administrators, following existing patterns in the codebase.

## Architecture

```mermaid
flowchart TB
    subgraph Backend
        Controller[ActivityLogController]
        Service[ActivityLogService]
        Model[Activity Model]
    end
    
    subgraph Frontend
        Route[/settings/activity-logs]
        Hook[useActivityLogs]
        Page[ActivityLogsPage]
        API[apiClient.activityLogs]
    end
    
    Page --> Hook
    Hook --> API
    API --> Controller
    Controller --> Model
```

## Files to Create/Modify

### Backend (API Endpoint)

**1. Create API Controller**: [`backend/app/Http/Controllers/ActivityLogController.php`](backend/app/Http/Controllers/ActivityLogController.php)

- GET `/api/activity-logs` - List activity logs with pagination, filtering
- Permission check: `activity_logs.read`
- Filters: date range, log name, event type, causer (user), subject type, search
- Org/school scoped using `getCurrentSchoolId()` pattern

**2. Add API Route**: [`backend/routes/api.php`](backend/routes/api.php)

- Add route: `Route::get('/activity-logs', [ActivityLogController::class, 'index'])->middleware(['auth:sanctum', 'organization', 'school.context'])`

**3. Add Permission**: Create migration for `activity_logs.read` permission

- Add to global permissions table with `organization_id = NULL`
- Assign to admin role by default

### Frontend

**4. Create API Types**: `frontend/src/types/api/activityLog.ts`

```typescript
export interface ActivityLog {
  id: string;
  log_name: string | null;
  description: string;
  subject_type: string | null;
  subject_id: string | null;
  event: string | null;
  causer_type: string | null;
  causer_id: string | null;
  properties: Record<string, any> | null;
  organization_id: string | null;
  school_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_method: string | null;
  route: string | null;
  status_code: number | null;
  created_at: string;
  causer_name?: string; // Joined from profiles
}
```

**5. Create Domain Types**: `frontend/src/types/domain/activityLog.ts`

- ActivityLog interface with camelCase fields
- Filter types (ActivityLogFilters)

**6. Create Mapper**: `frontend/src/mappers/activityLogMapper.ts`

- `mapActivityLogApiToDomain()` function

**7. Create Hook**: `frontend/src/hooks/useActivityLogs.tsx`

- `useActivityLogs(filters)` - Paginated query with org/school scoping
- Query key: `['activity-logs', organizationId, schoolId, filters]`
- Pattern from [`useStaff`](frontend/src/hooks/useStaff.tsx) for pagination

**8. Add API Client**: [`frontend/src/lib/api/client.ts`](frontend/src/lib/api/client.ts)

- Add `activityLogsApi.list(params)` method

**9. Create Page Component**: `frontend/src/pages/settings/ActivityLogsPage.tsx`

- Permission check: `useHasPermission('activity_logs.read')`
- Filters: date picker, log name dropdown, event type, user search
- Table with columns: Date/Time, User, Event, Description, Entity, IP Address
- Expandable row details for properties JSON
- Export to Excel/PDF buttons
- Follow patterns from [`StaffList.tsx`](frontend/src/pages/StaffList.tsx)

**10. Add Route**: [`frontend/src/App.tsx`](frontend/src/App.tsx)

- Add route: `/settings/activity-logs` with `PermissionRoute` wrapper

**11. Add Sidebar Menu Item**: [`frontend/src/components/navigation/SmartSidebar.tsx`](frontend/src/components/navigation/SmartSidebar.tsx)

- Add `hasActivityLogsPermission` check (line ~568)
- Add menu item under settings children (line ~1618)
- Icon: `Activity` from lucide-react

**12. Add Translations**: [`frontend/src/lib/translations/types.ts`](frontend/src/lib/translations/types.ts) and all language files

- Add `activityLogs` section with keys: title, description, filters, columns, etc.

**13. Add Lazy Component**: [`frontend/src/components/LazyComponents.tsx`](frontend/src/components/LazyComponents.tsx)

- Export lazy-loaded `ActivityLogsPage`

## UI Design

The page will have:

- **Header**: Title "Activity Logs" with description and icon
- **Filter Card**: Collapsible with date range, log name, event type, user filter
- **Stats Cards** (optional): Total logs today, unique users, most common actions
- **Data Table**: Sortable columns with pagination
- **Row Expansion**: Click to see full JSON properties, user agent details
- **Export**: Excel and PDF buttons in header

## Permission Structure

- Permission name: `activity_logs.read`
- Resource: `activity_logs`
- Action: `read`
- Only org admins should have this permission by default
- Future: `activity_logs.export` for export functionality

## Todos