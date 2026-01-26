# Nazim School Management System - Cursor Rules

## Project Overview
This is a comprehensive Islamic school management system built with React, TypeScript, and Laravel. The application serves educational institutions with features for student management, academics, finance, communication, and more.

**⚠️ CRITICAL: This is a MULTI-TENANT SaaS application. ALL code must enforce organization isolation. See "Multi-Tenancy Architecture" section below.**

## Tech Stack
- **Frontend**: React 18.3.1, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Laravel 12 (PHP 8.2+), PostgreSQL, Laravel Sanctum (API Authentication)
- **Database**: PostgreSQL with `auth` schema
- **Permission System**: Spatie Laravel Permission with organization scoping
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router DOM v6 (frontend), Laravel API routes (backend)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Testing**: Vitest, Testing Library (frontend), PHPUnit (backend)

## Code Style & Standards

### TypeScript
- Use strict TypeScript with proper type definitions
- Define interfaces for all data structures
- Use generic types where appropriate
- Avoid `any` type – use proper typing
- Export types from dedicated type files
- When React Query generics cause `TS2589: Type instantiation is excessively deep and possibly infinite` (usually with complex `useQuery` return types):

  1. **First**, simplify types:
     - Give `useQuery` an explicit data type: `useQuery<Permission[]>({...})`
     - Make the `queryFn` return `Promise<Permission[]>` directly
     - Avoid deeply nested inferred types in `queryKey` and `select` callbacks

  2. If the error still persists and only at the **call site**, it is acceptable to:

     ```ts
     // @ts-expect-error TS2589 – React Query type depth workaround
     return useQuery<Permission[]>({
       queryKey: ['permissions', profile?.organization_id],
       queryFn: fetchPermissions,
       enabled: !!profile,
     });
     ```

     - Only use `// @ts-expect-error` **above the minimal line** that triggers TS2589
     - Add a clear comment explaining it is a React Query type depth workaround
     - Do **not** use `@ts-ignore` for this;

prefer `@ts-expect-error` so the compiler verifies it

  3. Do **not** refactor working logic just to appease TS depth if the runtime code is correct and the types are already explicit at the hook boundary.

- **Never use `// @ts-ignore` in this project.**
  - If a suppression is truly needed, use `// @ts-expect-error <short_reason>` and keep it as close as possible to the line causing the error (primarily for TS2589 React Query depth issues).

### React Patterns
- Use functional components with hooks
- Implement proper error boundaries
- Use React.memo for performance optimization
- Follow React best practices for state management
- Use custom hooks for reusable logic

### File Organization
- Components in `/src/components/`
- Pages in `/src/pages/`
- Hooks in `/src/hooks/`
- Types in `/src/types/`
- Utils in `/src/lib/`
- Use index files for clean imports

### Naming Conventions
- Components: PascalCase (e.g., `StudentDashboard`)
- Files: PascalCase for components, camelCase for utilities
- Variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Database tables: snake_case

## Database & Backend

### Database Schema
- **PostgreSQL** with `public` and `auth` schemas
- Use proper foreign key relationships
- **ALWAYS add `organization_id` to tenant tables** (see Multi-Tenancy section)
- **Users stored in `auth.users` table**
- Use enums for status fields
- Follow naming conventions: snake_case for tables/columns
- **ALWAYS create index on `organization_id`** for performance

### Academic Data Architecture - Subject Assignment Flow

**CRITICAL: The application uses a two-step subject assignment workflow:**

1. **Step 1: Assign Subjects to Classes** (`class_subject_templates` table)
   - Defines which subjects are available for a class
   - Acts as a template/blueprint for subject offerings
   - Used to filter available subjects in Step 2

2. **Step 2: Assign Subjects to Class Academic Years** (`class_subjects` table)
   - Links subjects to specific class instances in academic years
   - Represents actual subject assignments for a class in a specific academic year
   - Includes additional details like teacher assignment, room, schedule, etc.

**Future Features Must Use `class_subjects` Table:**
- **Exams**: When creating exams, use subjects from `class_subjects` table (not `subjects` directly)
- **Grades/Assessments**: Link to `class_subjects` to ensure grades are for subjects actually taught
- **Attendance**: Track attendance per `class_subjects` (subject + class + academic year combination)
- **Timetables**: Build timetables using `class_subjects` entries
- **Reports**: Generate reports based on `class_subjects` to show actual subject offerings

**Key Rules:**
- ✅ **ALWAYS** query subjects from `class_subjects` for academic year-specific features
- ✅ **ALWAYS** filter by `class_academic_year_id` when working with subject assignments
- ✅ **ALWAYS** validate that subjects exist in `class_subject_templates` before allowing assignment in Step 2
- ❌ **NEVER** directly link exams/grades/attendance to `subjects` table without going through `class_subjects`
- ❌ **NEVER** bypass the two-step workflow (Step 1: templates → Step 2: actual assignments)

**Example Pattern:**
```typescript
// ✅ CORRECT: Get subjects for a class academic year
const { data: classSubjects } = useClassSubjects(classAcademicYearId, organizationId);
// Returns subjects from class_subjects table for this specific class instance

// ❌ WRONG: Getting all subjects without class academic year context
const { data: subjects } = useSubjects(organizationId);
// This returns all subjects, not the ones assigned to this class instance
```

### UUID Primary Keys - REQUIRED FOR ALL TABLES

**CRITICAL: ALL tables MUST use UUID primary keys. This is mandatory for the entire application.**

#### Database Migrations
- **ALWAYS** use `UUID` type for primary keys in migrations
- **ALWAYS** use `DEFAULT gen_random_uuid()` in PostgreSQL migrations
- **Example:**
  ```sql
  CREATE TABLE public.your_table (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      -- other columns...
  );
  ```

#### Laravel Models
- **ALWAYS** configure models to use UUIDs:
  ```php
  public $incrementing = false;
  protected $keyType = 'string';
  ```
- **ALWAYS** add `'id'` to `$fillable` array
- **ALWAYS** implement UUID generation in model boot method:
  ```php
  protected static function boot()
  {
      parent::boot();
      
      static::creating(function ($model) {
          if (empty($model->id)) {
              $model->id = (string) Str::uuid();
          }
      });
  }
  ```
- **ALWAYS** import `Illuminate\Support\Str` for UUID generation

#### Frontend Types/Interfaces
- **ALWAYS** define `id` as `string` type (UUIDs are strings)
- **Example:**
  ```typescript
  export interface YourResource {
    id: string; // UUID as string
    organization_id: string;
    // other fields...
  }
  ```

#### API Responses
- **ALWAYS** return UUIDs as strings in JSON responses
- Laravel automatically serializes UUIDs as strings
- Frontend should always treat IDs as strings, never numbers

#### Foreign Keys
- **ALWAYS** use `UUID` type for foreign key columns
- **ALWAYS** reference UUID primary keys
- **Example:**
  ```sql
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE
  ```

#### Exceptions
- **NO exceptions** - all tables must use UUIDs
- Even lookup/reference tables use UUIDs
- Even junction/pivot tables use UUIDs for their primary keys

### Laravel API Integration
- Use custom `ApiClient` from `/src/lib/api/client.ts` for all API calls
- All API calls use RESTful endpoints (e.g., `/api/organizations`, `/api/auth/login`)
- Implement proper error handling with try/catch
- Use TanStack Query for data fetching and caching
- All API calls in hooks must:
  - Handle errors gracefully and throw descriptive errors
  - Return **parsed, typed data** (never raw API response objects) to components
  - Include authentication token in headers (handled automatically by ApiClient)

### API Client Pattern
```typescript
import { apiClient } from '@/lib/api/client';

// GET request
const { data } = await apiClient.organizations.list();

// POST request
const result = await apiClient.auth.login({ email, password });

// PUT/PATCH request
const updated = await apiClient.organizations.update(id, data);

// DELETE request
await apiClient.organizations.delete(id);
```

### Query Patterns
```typescript
// Use TanStack Query for data fetching with Laravel API
// CRITICAL: queryKey MUST include both organization_id AND default_school_id
const { data, isLoading, error } = useQuery({
  queryKey: ['students', profile?.organization_id, profile?.default_school_id ?? null, page, search],
  queryFn: () => apiClient.students.list({ 
    organization_id: profile.organization_id,
    school_id: profile.default_school_id,
    page, 
    search 
  }),
  staleTime: 5 * 60 * 1000, // 5 minutes
  enabled: !!profile?.organization_id && !!profile?.default_school_id, // Only fetch when both are available
});
```

## Multi-Tenancy Architecture

**CRITICAL: This is a multi-tenant SaaS application. ALL code must follow organization AND school isolation patterns.**

### Core Principles
- **Every tenant table MUST have `organization_id` column**
- **Every tenant table MUST have `school_id` column** (for school-scoped resources)
- **RLS policies MUST enforce organization isolation**
- **Frontend hooks MUST filter by both `organization_id` AND `default_school_id`**
- **Storage paths MUST include organization_id**
- **All users MUST belong to an organization (organization_id is required)**
- **All users MUST have a default school (default_school_id is required for school-scoped operations)**

### School-Level Isolation

**CRITICAL: In addition to organization-level isolation, the application enforces school-level isolation. Each organization can have multiple schools, and users are scoped to their default school.**

#### Key Requirements
- **All school-scoped resources MUST include `school_id` column**
- **Frontend query keys MUST include `profile?.default_school_id`**
- **API calls MUST pass `school_id` parameter**
- **Backend controllers MUST use `getCurrentSchoolId()` method**
- **Backend queries MUST filter by both `organization_id` AND `school_id`**

#### Frontend Query Key Pattern
```typescript
// ✅ CORRECT: Include both organization_id and default_school_id
queryKey: ['resource-name', profile?.organization_id, profile?.default_school_id ?? null, ...otherKeys]

// ❌ WRONG: Missing default_school_id
queryKey: ['resource-name', profile?.organization_id, ...otherKeys]
```

#### Frontend API Call Pattern
```typescript
// ✅ CORRECT: Pass both organization_id and school_id
const data = await apiClient.resource.list({
  organization_id: profile.organization_id,
  school_id: profile.default_school_id,
});

// ❌ WRONG: Missing school_id
const data = await apiClient.resource.list({
  organization_id: profile.organization_id,
});
```

#### Backend Controller Pattern
```php
// ✅ CORRECT: Use getCurrentSchoolId() and filter by both
public function index(Request $request)
{
    $user = $request->user();
    $profile = DB::table('profiles')->where('id', $user->id)->first();
    
    if (!$profile || !$profile->organization_id) {
        return response()->json(['error' => 'User must be assigned to an organization'], 403);
    }
    
    // Get current school from middleware context
    $currentSchoolId = $this->getCurrentSchoolId($request);
    
    $query = YourModel::whereNull('deleted_at')
        ->where('organization_id', $profile->organization_id)
        ->where('school_id', $currentSchoolId);
    
    // ... rest of controller logic
}
```

#### Backend getCurrentSchoolId() Method
All controllers extend the base `Controller` class which provides:
```php
protected function getCurrentSchoolId(Request $request): string
{
    $schoolId = $request->get('current_school_id');
    if (!is_string($schoolId) || $schoolId === '') {
        abort(403, 'School context is required');
    }
    return $schoolId;
}
```

**Note**: The `current_school_id` is injected by the `school.context` middleware. Controllers should NEVER trust client-provided `school_id` parameters.

### Database Schema - Multi-Tenancy

#### Required Pattern for Tenant Tables
```sql
-- ALWAYS add organization_id to tenant tables
CREATE TABLE IF NOT EXISTS public.your_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    -- other columns...
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ALWAYS create index on organization_id
CREATE INDEX IF NOT EXISTS idx_your_table_organization_id ON public.your_table(organization_id);

-- ALWAYS enable RLS
ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;

-- ALWAYS create RLS policies (5 standard policies)
-- 1. Service role full access
CREATE POLICY "Service role full access to your_table"
    ON public.your_table FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 2. Users can read their organization's data
CREATE POLICY "Users can read their organization's your_table"
    ON public.your_table FOR SELECT TO authenticated
    USING (
        organization_id = (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
        OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
    );

-- 3. Users can insert in their organization
CREATE POLICY "Users can insert your_table in their organization"
    ON public.your_table FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
        OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
    );

-- 4. Users can update their organization's data
CREATE POLICY "Users can update their organization's your_table"
    ON public.your_table FOR UPDATE TO authenticated
    USING (
        organization_id = (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
        OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
    )
    WITH CHECK (
        organization_id = (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
        OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
    );

-- 5. Users can delete their organization's data
CREATE POLICY "Users can delete their organization's your_table"
    ON public.your_table FOR DELETE TO authenticated
    USING (
        organization_id = (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
        OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
    );
```

#### Tables with Organization Isolation (Current)
- ✅ `organizations` - Root tenant table
- ✅ `profiles` - User profiles (organization_id is REQUIRED for all users)
- ✅ `buildings` - Organization-scoped
- ✅ `rooms` - Organization-scoped (inherits from building)
- ✅ `staff` - Organization-scoped

#### Future Tables That Need Organization Isolation
When creating new tables, ALWAYS add organization_id:
- `students` - Student records
- `classes` - Class management
- `subjects` - Subject management
- `exams` - Examination records
- `attendance` - Attendance tracking
- `fees` - Fee management
- `library_books` - Library management
- `assets` - Asset management
- Any other tenant-specific data

### Frontend Hooks - Multi-Tenancy Pattern

#### Standard Hook Pattern with Organization Filtering
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useProfile } from './useProfiles';
import { useAuth } from './useAuth';

export interface YourResource {
  id: string;
  organization_id: string;
  // other fields...
}

// ALWAYS filter by user's organization AND school
export const useYourResources = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    // CRITICAL: queryKey MUST include both organization_id AND default_school_id
    queryKey: ['your-resources', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !profile.organization_id || !profile.default_school_id) return [];

      // Users can only see their organization's and school's data
      return await apiClient.yourResources.list({ 
        organization_id: profile.organization_id,
        school_id: profile.default_school_id,
      });
    },
    enabled: !!user && !!profile && !!profile.organization_id && !!profile.default_school_id,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

// ALWAYS validate organization_id AND school_id in mutations
export const useCreateYourResource = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (resourceData: { /* fields */; organization_id?: string; school_id?: string }) => {
      if (!user || !profile || !profile.organization_id || !profile.default_school_id) {
        throw new Error('User must be assigned to an organization and school');
      }

      // Always use user's organization_id and school_id (ignore provided values for security)
      const organizationId = profile.organization_id;
      const schoolId = profile.default_school_id;

      return await apiClient.yourResources.create({
        ...resourceData,
        organization_id: organizationId,
        school_id: schoolId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['your-resources'] });
    },
  });
};

// ALWAYS check organization_id in update mutations
export const useUpdateYourResource = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<YourResource> & { id: string }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get current resource to check organization (Laravel validates this server-side)
      // Frontend validation is for UX, but server enforces security
      const currentResource = await apiClient.yourResources.get(id);

      // Validate organization access - user can only update their organization's resources
      if (currentResource.organization_id !== profile.organization_id) {
        throw new Error('Cannot update resource from different organization');
      }

      // Prevent organization_id changes - users cannot change organization_id
      if (updates.organization_id) {
        throw new Error('Cannot change organization_id');
      }

      return await apiClient.yourResources.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['your-resources'] });
    },
  });
};
```

## Multi-Tenant Permission Pattern

**CRITICAL: Permissions system supports true multi-tenancy with organization-scoped permissions using Spatie Laravel Permission.**

### Permission System (Spatie Laravel Permission)
- **Package**: `spatie/laravel-permission` with custom organization scoping
- **Custom Models**: `App\Models\Permission` and `App\Models\Role` extend Spatie models
- **Organization Scoping**: All permissions and roles support `organization_id` field
- **Teams Feature**: Enabled for organization-based permission isolation

### Permission Table Structure

#### Permissions Table (Spatie)
- **`organization_id`**: `UUID | NULL`
  - `NULL` = Global/system permissions (available to all organizations)
  - `UUID` = Organization-specific permissions
- **Unique constraint**: `(name, organization_id, guard_name)` - allows same permission name for different orgs
- **Index**: Always create index on `organization_id` for performance
- **Additional fields**: `resource`, `action`, `description` for better permission management

#### Roles Table (Spatie)
- **`organization_id`**: `UUID` (REQUIRED - no NULL values)
  - All roles are organization-specific
- **Unique constraint**: `(name, organization_id, guard_name)`
- **Index**: Always create index on `organization_id` for performance

#### Model Has Roles Table (Spatie)
- Links users to roles with organization context
- Managed automatically by Spatie package

#### Model Has Permissions Table (Spatie)
- Links users directly to permissions (per-user overrides)
- Supports organization scoping
- Soft delete support via `deleted_at` column

### RLS Policies for Permissions

#### Permissions Table RLS (Laravel handles this via middleware)
**Note**: Since we're using Laravel, RLS policies are replaced by Laravel middleware and controller logic. However, if you need RLS for direct database access:

```sql
-- Authenticated users can only read permissions for their organization
CREATE POLICY "Authenticated users can read permissions"
    ON public.permissions
    FOR SELECT
    TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );
```

#### Role Permissions Table RLS (Laravel handles this via middleware)
**Note**: Since we're using Laravel, RLS policies are replaced by Laravel middleware and controller logic. However, if you need RLS for direct database access:

```sql
-- Authenticated users can only read role permissions for their organization
CREATE POLICY "Authenticated users can read role_permissions"
    ON public.role_permissions
    FOR SELECT
    TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );
```

### Permission Query Pattern

#### Permission Name Format
**CRITICAL: Permission names do NOT use prefixes like `academic.*`**
- ✅ **CORRECT**: `classes.read`, `subjects.create`, `timetables.read`, `schedule_slots.update`
- ❌ **WRONG**: `academic.classes.read`, `academic.subjects.create`, `academic.timetables.read`
- **Resource values**: Match the resource name (e.g., `resource='classes'` for `name='classes.read'`)
- **Pattern**: `{resource}.{action}` (e.g., `classes.read`, `students.create`, `timetables.export`)

#### Frontend Hook Pattern
```typescript
// ALWAYS query permissions via Laravel API
// Laravel backend uses Spatie to get all permissions (roles + direct permissions)
// CRITICAL: Use organization_id, NOT role (profiles.role column is deprecated)
export const useUserPermissions = () => {
  const { profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery({
    queryKey: ['user-permissions', profile?.organization_id, profile?.id, orgIds.join(',')],
    queryFn: async () => {
      // Require organization_id - backend enforces this
      if (!profile?.organization_id) return [];

      if (orgsLoading) return [];

      // Use Laravel API - it handles all permission logic on backend
      const response = await permissionsApi.userPermissions();

      // Laravel returns { permissions: string[] }
      const permissions = (response as { permissions?: string[] })?.permissions || [];

      return permissions.sort();
    },
    // CRITICAL: Check organization_id, NOT role (role column is deprecated)
    enabled: !!profile?.organization_id && !orgsLoading,
    staleTime: 60 * 60 * 1000, // 1 hour - permissions don't change often
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in cache longer
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    placeholderData: (previousData) => previousData ?? [],
    initialData: [],
  });
};
```

> **Note:** 
> - The `useUserPermissions` hook MUST use `organization_id` for the `enabled` condition, NOT `role`
> - The `profiles.role` column is deprecated - roles are now managed via Spatie's `model_has_roles` table
> - Laravel backend automatically handles: user permissions + role permissions + organization scoping
> - Spatie checks direct user permissions first (per-user overrides), then role-based permissions

### Navigation Visibility Pattern

#### Menu Visibility Logic
```typescript
// ALWAYS use permission checks, NOT role checks
const allNavigationItems = useMemo((): NavigationItem[] => {
  const items: NavigationItem[] = [
    {
      titleKey: "settings",
      children: [
        // Only show if user has permission
        ...(hasBackupPermission ? [{
          title: "Backup & Restore",
          url: "/settings/backup",
          icon: Package,
        }] : []),
        ...(hasBuildingsPermission ? [{
          title: "Buildings Management",
          url: "/settings/buildings",
          icon: Building2,
        }] : []),
        // ... other children
      ],
    },
  ];

  // Filter menus: Show only if they have visible children
  return items.filter(item => {
    if (item.children && item.children.length > 0) {
      // Show menu only if at least one child is visible
      return item.children.length > 0;
    }
    // For menus without children, check parent permission
    if (item.titleKey === 'settings') {
      return hasSettingsPermission;
    }
    return true;
  });
}, [hasSettingsPermission, hasBackupPermission, hasBuildingsPermission, /* ... */]);
```

#### Key Rules
1. **NO role-based fallbacks**: Remove all `isSuperAdmin || role === 'admin'` checks
2. **Permission-only checks**: Use `useHasPermission('permission.name')` for all visibility
3. **Hide empty menus**: Hide parent menu if no children are visible
4. **Show if any child visible**: Show parent menu if at least one child has permission

### Permission Assignment Pattern

#### Permission Name Format
**CRITICAL: Use direct resource names, NOT prefixed names**
- ✅ **CORRECT**: `classes.read`, `subjects.create`, `timetables.read`, `schedule_slots.update`, `teacher_subject_assignments.read`
- ❌ **WRONG**: `academic.classes.read`, `academic.subjects.create`, `academic.timetables.read`
- **Resource values**: Must match the resource name (e.g., `resource='classes'` for `name='classes.read'`)

#### Migration Pattern
```sql
-- 1. Create global permissions (organization_id = NULL)
-- Use direct resource names: {resource}.{action}
INSERT INTO public.permissions (name, resource, action, description, organization_id) VALUES
    ('settings.read', 'settings', 'read', 'Access to Settings', NULL),
    ('backup.read', 'backup', 'read', 'Access to Backup', NULL),
    ('classes.read', 'classes', 'read', 'View classes', NULL),
    ('classes.create', 'classes', 'create', 'Create classes', NULL),
    ('classes.update', 'classes', 'update', 'Update classes', NULL),
    ('classes.delete', 'classes', 'delete', 'Delete classes', NULL),
    ('classes.assign', 'classes', 'assign', 'Assign classes', NULL),
    ('classes.copy', 'classes', 'copy', 'Copy classes', NULL),
    ('subjects.read', 'subjects', 'read', 'View subjects', NULL),
    ('timetables.read', 'timetables', 'read', 'View timetables', NULL),
    ('timetables.export', 'timetables', 'export', 'Export timetables', NULL),
    ('schedule_slots.read', 'schedule_slots', 'read', 'View schedule slots', NULL),
    ('teacher_subject_assignments.read', 'teacher_subject_assignments', 'read', 'View teacher assignments', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- 2. Assign permissions to roles per organization
-- For each organization, assign permissions to roles
INSERT INTO public.role_permissions (role, permission_id, organization_id)
SELECT 'admin', p.id, o.id
FROM public.permissions p
CROSS JOIN public.organizations o
WHERE p.organization_id IS NULL -- Only global permissions
  AND p.resource != 'organizations' -- Exclude org management
ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

-- 3. Assign permissions to roles per organization
-- Each organization's roles get their organization's permissions
INSERT INTO public.role_permissions (role, permission_id, organization_id)
SELECT 'admin', p.id, o.id
FROM public.permissions p
CROSS JOIN public.organizations o
WHERE p.organization_id = o.id
ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

-- 4. Assign per-user permissions (for staff with specific roles like clerk, librarian, etc.)
-- Example: Assign attendance permissions to a specific staff user
INSERT INTO public.user_permissions (user_id, permission_id, organization_id)
SELECT 
    'user-uuid-here'::UUID, -- Specific user ID
    p.id,
    'org-uuid-here'::UUID -- User's organization
FROM public.permissions p
WHERE p.organization_id = 'org-uuid-here'::UUID -- Permissions from user's organization
  AND p.name IN ('attendance.read', 'attendance.create', 'attendance.update')
ON CONFLICT (user_id, permission_id, organization_id) DO NOTHING;

```

#### RLS Policy Pattern with Permission Checks
``` sql
-- ALWAYS use has_permission_for_resource() function for permission checks
-- This function checks user_permissions first, then role_permissions
CREATE POLICY "Users can read your_table" ON public.your_table FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id ()
        AND public.has_permission_for_resource ('your_table', 'read')
    );

CREATE POLICY "Users can create your_table" ON public.your_table FOR
INSERT
    TO authenticated
WITH
    CHECK (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id ()
        AND public.has_permission_for_resource ('your_table', 'create')
    );

```

**Key Points:**
- In Laravel, use Spatie's ` hasPermissionTo () ` method with organization context
- Spatie automatically checks:
  1. Direct user permissions first (per-user overrides)
  2. Role-based permissions second
- Resource name must match the permission's ` resource ` column (e.g., ` 'classes' `, ` 'subjects' `, ` 'timetables' `)
- Action name must match the permission's ` action ` column (e.g., ` 'read' `, ` 'create' `, ` 'update' `, ` 'delete' `)
- All permission checks are organization-scoped - users can only have permissions for their organization

### Organization-Scoped Permissions Management

**CRITICAL: Permissions management is organization-scoped. Each organization can create and manage their own permissions.**

#### RLS Policies for Write Operations

``` sql
-- Permissions table: Users can only modify their organization's permissions
-- Note: Laravel middleware handles this, but if using RLS:
CREATE POLICY "Authenticated users can insert their organization's permissions" ON public.permissions FOR
INSERT
    TO authenticated
WITH
    CHECK (
        organization_id = (
            SELECT organization_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

-- Similar policies for UPDATE and DELETE on permissions and role_permissions
-- All policies enforce organization_id = user's organization_id
```

#### Permission Management Hooks Pattern

```typescript
// ALWAYS use organization context in permission management hooks
export const useCreatePermission = () => {
  const { data: profile } = useProfile();

return useMutation({
    mutationFn: async (permissionData: { name: string;

resource: string;

action: string;

description?: string }) => {
      if (!profile?.organization_id) {
        throw new Error('User must be assigned to an organization');

}

/
/
Users can only create permissions for their organization
      return await apiClient.permissions.create({
        ...permissionData,
        organization_id: profile.organization_id,
      });

}, });

};

/
/
ALWAYS validate organization scope when assigning permissions to roles
export const useAssignPermissionToRole = () => {
  const { data: profile } = useProfile();

return useMutation({
    mutationFn: async ({ role, permissionId }: { role: string;

permissionId: string }) => {
      if (!profile?.organization_id) {
        throw new Error('User must be assigned to an organization');

}

/
/
Get permission to validate organization scope const permission = await apiClient.permissions.get (permissionId);

/
/
Users can only assign permissions from their organization
      if (permission.organization_id !== profile.organization_id) {
        throw new Error('Cannot assign permission from different organization');

}

/
/
Assign permission to role within user 's organization
      return await apiClient.permissions.assignToRole({
        role,
        permission_id: permissionId,
        organization_id: profile.organization_id,
      });
    },
  });
};

// Assign permission to specific user (for staff with custom permissions)
export const useAssignPermissionToUser = () => {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  
  return useMutation({
    mutationFn: async ({ userId, permissionId }: { userId: string; permissionId: string }) => {
      if (!profile?.organization_id) {
        throw new Error(' User must be assigned to an organization ');
      }
      
      // Get permission to validate organization scope
      const permission = await apiClient.permissions.get(permissionId);
      
      // Get user profile to get their organization
      const userProfile = await apiClient.profiles.get(userId);
      
      // Users can only assign permissions within their organization
      if (userProfile.organization_id !== profile.organization_id) {
        throw new Error(' Cannot assign permissions to users in different organization ');
      }
      if (permission.organization_id !== profile.organization_id) {
        throw new Error(' Cannot assign permission
from
    different organization ');
      }
      
      // Assign permission to user within same organization
      const result = await apiClient.permissions.assignToUser({
        user_id: userId,
        permission_id: permissionId,
        organization_id: profile.organization_id,
      });
      
      // Invalidate user permissions query
      queryClient.invalidateQueries({ queryKey: [' user - permissions '] });
      
      return result;
    },
  });
};

// Remove permission from user (soft delete)
export const useRemovePermissionFromUser = () => {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  
  return useMutation({
    mutationFn: async ({ userId, permissionId }: { userId: string; permissionId: string }) => {
      if (!profile?.organization_id) {
        throw new Error(' User must be assigned to an organization ');
      }
      
      // Users can only remove permissions within their organization
      await apiClient.permissions.removeFromUser({
        user_id: userId,
        permission_id: permissionId,
        organization_id: profile.organization_id,
      });
      
      // Invalidate user permissions query
      queryClient.invalidateQueries({ queryKey: [' user - permissions '] });
    },
  });
};
```

#### UI Pattern for Permissions Management

```typescript
// ALWAYS filter permissions by organization
const permissions = useMemo(() => {
  if (!allPermissions || !profile || !profile.organization_id) return [];
  
  // Users only see their organization' s permissions
return allPermissions.filter (
    p = > p.organization_id = = = profile.organization_id
);

}, [allPermissions, profile]);

/
/
ALWAYS show organization context
{profile?.organization_id && (
  <Card className="bg-blue-50">
    <CardContent>
      <p>Managing permissions for: <strong>{currentOrg?.name}</strong></p>
      <p className="text-xs">You can manage permissions for your organization</p>
    </CardContent>
  </Card>
)}

/
/
ALWAYS validate edit/delete permissions
const isPermissionEditable = (permission: Permission): boolean => {
  return permission.organization_id === profile?.organization_id;

};

const isPermissionDeletable = (permission: Permission): boolean => {
  // Users can only delete permissions from their organization
  return permission.organization_id === profile?.organization_id;

};


```

#### Key Rules for Organization-Scoped Permissions

1. **Create Permissions**: Users can only create permissions for their organization
2. **Edit Permissions**: Users can only edit their organization's permissions
3. **Delete Permissions**: Users can only delete their organization's permissions
4. **Assign to Roles**: Users can only assign permissions to roles within their organization
5. **Assign to Users**: Users can only assign permissions to users within their organization (via `user_permissions` table)
6. **View Permissions**: Users only see their organization's permissions
7. **Laravel Enforcement**: All write operations are enforced by Laravel middleware and controllers with organization filtering
8. **UI Context**: Always show organization context banner in permissions management UI
9. **Permission Name Format**: Use direct resource names (e.g., `classes.read`, `subjects.create`) - NO `academic.` prefix
10. **Permission Checking**: Always use Spatie's `hasPermissionTo()` with organization context in Laravel controllers
11. **User Permissions Priority**: Direct user permissions take precedence over role-based permissions (handled by Spatie)
12. **Soft Deletes**: Use `UPDATE ... SET deleted_at = NOW()` for `user_permissions`, never hard DELETE
13. **Organization Required**: All users must have an organization_id - no NULL values allowed

### Storage - Multi-Tenancy Pattern

**CRITICAL: ALL file storage operations MUST use the centralized FileStorageService. NEVER use direct Storage:: calls or move_uploaded_file().**

#### FileStorageService - Centralized File Storage

**Location**: `backend/app/Services/Storage/FileStorageService.php`

**Purpose**: Provides consistent, standardized file storage with:
- Consistent folder structure: `organizations/{org_id}/schools/{school_id}/resource_type/...`
- Public/Private disk separation (public for direct URLs, private for sensitive files)
- School-scoped organization (DMS and events under school scope)
- UUID-based file naming
- Type-safe methods for each resource type

#### Standardized Folder Structure

```
storage/app/
├── private/                    # Private files (sensitive, requires auth)
│   └── organizations/
│       └── {organization_id}/
│           └── schools/
│               └── {school_id}/
│                   ├── students/{student_id}/
│                   │   ├── pictures/
│                   │   └── documents/{document_type}/
│                   ├── staff/{staff_id}/
│                   │   └── documents/{document_type}/
│                   ├── courses/{course_id}/
│                   │   └── documents/{document_type}/
│                   ├── dms/{document_type}/{document_id}/files/
│                   ├── events/{event_id}/
│                   │   ├── attachments/
│                   │   └── photos/
│                   ├── templates/
│                   │   ├── id-cards/{template_id}/
│                   │   └── certificates/{template_id}/
│                   └── reports/{report_key}/
│
└── public/                     # Public files (direct URL access)
    └── organizations/
        └── {organization_id}/
            └── schools/
                └── {school_id}/
                    ├── staff/{staff_id}/pictures/
                    ├── events/{event_id}/
                    │   ├── banners/
                    │   └── thumbnails/
                    └── shared/{resource_type}/
```

#### Public vs Private Decision Matrix

| Resource Type | File Category | Disk | Reason |
|--------------|---------------|------|--------|
| Students | Pictures | Private | Sensitive data |
| Students | Documents | Private | Sensitive data |
| Staff | Pictures | Public | Display in UI, non-sensitive |
| Staff | Documents | Private | Sensitive data |
| Courses | Documents | Private | May contain sensitive info |
| DMS | All files | Private | Sensitive documents |
| Events | Attachments | Private | May contain sensitive info |
| Events | Photos | Private | May contain sensitive info |
| Events | Banners | Public | Public display |
| Events | Thumbnails | Public | Public display |
| Templates | Backgrounds | Private | Internal use |
| Reports | All | Private | Sensitive data |

#### Backend Controller Pattern

**CRITICAL: ALWAYS use FileStorageService in controllers. NEVER use direct Storage:: calls.**

```php
use App\Services\Storage\FileStorageService;

class YourController extends Controller
{
    public function __construct(
        private FileStorageService $fileStorageService
    ) {}

    public function uploadFile(Request $request, string $id)
    {
        // ... validation and permission checks ...
        
        $file = $request->file('file');
        
        // Store file using FileStorageService
        $filePath = $this->fileStorageService->storeYourResourceFile(
            $file,
            $resource->organization_id,
            $resource->id,
            $resource->school_id
        );
        
        // Update resource with file path
        $resource->update(['file_path' => $filePath]);
        
        // Get URL (public or private download URL)
        $url = $this->fileStorageService->getPrivateDownloadUrl($filePath);
        // OR for public files:
        // $url = $this->fileStorageService->getPublicUrl($filePath);
        
        return response()->json(['path' => $filePath, 'url' => $url]);
    }

    public function downloadFile(Request $request, string $id)
    {
        // ... validation ...
        
        $resource = YourResource::find($id);
        
        // Download using FileStorageService
        return $this->fileStorageService->downloadFile(
            $resource->file_path,
            $resource->file_name
        );
    }

    public function deleteFile(Request $request, string $id)
    {
        // ... validation ...
        
        $resource = YourResource::find($id);
        
        // Delete file using FileStorageService
        if ($resource->file_path) {
            $this->fileStorageService->deleteFile($resource->file_path);
        }
        
        $resource->delete();
        
        return response()->noContent();
    }
}
```

#### Available FileStorageService Methods

**Student Files:**
- `storeStudentPicture($file, $orgId, $studentId, $schoolId)` - PRIVATE
- `storeStudentDocument($file, $orgId, $studentId, $schoolId, $docType)` - PRIVATE

**Staff Files:**
- `storeStaffPicturePublic($file, $orgId, $staffId, $schoolId)` - PUBLIC
- `storeStaffDocument($file, $orgId, $staffId, $schoolId, $docType)` - PRIVATE

**Course Files:**
- `storeCourseDocument($file, $orgId, $courseId, $schoolId, $docType)` - PRIVATE

**DMS Files (School-Scoped):**
- `storeDmsFile($file, $orgId, $schoolId, $docType, $docId)` - PRIVATE

**Event Files (School-Scoped):**
- `storeEventAttachment($file, $orgId, $eventId, $schoolId)` - PRIVATE
- `storeEventPhoto($file, $orgId, $eventId, $schoolId)` - PRIVATE
- `storeEventBannerPublic($file, $orgId, $eventId, $schoolId)` - PUBLIC
- `storeEventThumbnailPublic($file, $orgId, $eventId, $schoolId)` - PUBLIC

**Template Files:**
- `storeIdCardTemplateBackground($file, $orgId, $schoolId, $templateId, $side)` - PRIVATE
- `storeCertificateTemplateBackground($file, $orgId, $schoolId, $templateId)` - PRIVATE

**Report Files:**
- `storeReport($content, $filename, $orgId, $schoolId, $reportKey)` - PRIVATE

**File Operations:**
- `deleteFile($path, $disk)` - Delete a file
- `fileExists($path, $disk)` - Check if file exists
- `getFile($path, $disk)` - Get file contents
- `getPublicUrl($path)` - Get public URL (for public files)
- `getPrivateDownloadUrl($path)` - Get download route (for private files)
- `downloadFile($path, $filename, $disk)` - Download file response
- `getFileSize($path, $disk)` - Get file size
- `getMimeType($path, $disk)` - Get MIME type

#### School ID Handling

- **Always include school_id in path** when available
- **Handle null school_id** gracefully (organization-level files)
- **Extract school_id from resource** (student, staff, course, etc.)
- **Validate school belongs to organization** before storage

#### Key Rules

- ✅ **ALWAYS** use FileStorageService for all file operations
- ✅ **ALWAYS** use public disk for files that need direct URL access (staff pictures, event banners)
- ✅ **ALWAYS** use private disk for sensitive files (student documents, staff documents, DMS files)
- ✅ **ALWAYS** include organization_id and school_id in paths
- ✅ **ALWAYS** use UUID-based file naming (handled automatically by service)
- ✅ **ALWAYS** validate organization access before file operations
- ❌ **NEVER** use direct `Storage::disk()` calls in controllers
- ❌ **NEVER** use `move_uploaded_file()` directly
- ❌ **NEVER** use `storage_path()` for file storage
- ❌ **NEVER** hardcode file paths
- ❌ **NEVER** store files without organization_id and school_id in path

### Helper Functions - Multi-Tenancy

#### Use Laravel API Endpoints
```typescript
// ALWAYS use Laravel API endpoints for organization-related queries
// Laravel backend enforces security server-side

/
/
Get user's organization_id (from profile)
const { data: profile } = useProfile();
const organizationId = profile?.organization_id;

// Validate user has organization
if (!organizationId) {
  throw new Error('User must be assigned to an organization');
}

// Get user's organization
const { data: organization } = await apiClient.organizations.get(organizationId);

```

### Components - Multi-Tenancy Pattern

#### Component Organization Context
```typescript
import { useProfile } from '@/hooks/useProfiles';

import { useCurrentOrganization } from '@/hooks/useOrganizations';

export function YourComponent() {
  const { data: profile } = useProfile();

const { data: organization } = useCurrentOrganization();

/
/
ALWAYS check organization context
  if (!profile?.organization_id) {
    return <div>No organization assigned. Please contact administrator.</div>;

}

/
/
Use organization context in data fetching
  const { data: resources } = useYourResources();

return (
    <div>
      {organization && <h1>{organization.name}</h1>}
      {/* Component content */}
    </div>
  );

}
```

### Migration Files - Multi-Tenancy

#### Migration Pattern
```sql
-- Migration: YYYYMMDDHHMMSS_add_organization_to_your_table.sql

-- Step 1: Add organization_id column
ALTER TABLE public.your_table
ADD COLUMN IF NOT EXISTS organization_id UUID NULL REFERENCES public.organizations (id) ON DELETE CASCADE;

-- Step 2: Create index
CREATE INDEX IF NOT EXISTS idx_your_table_organization_id ON public.your_table (organization_id);

-- Step 3: Update existing data (if any)
-- For new tables, this step is not needed
UPDATE public.your_table
SET
    organization_id = (
        SELECT id
        FROM public.organizations
        LIMIT 1
    )
WHERE
    organization_id IS NULL;

-- Step 4: Make NOT NULL (after data migration)
ALTER TABLE public.your_table
ALTER COLUMN organization_id
SET
    NOT NULL;

-- Step 5: Enable RLS
ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies (use the 5-policy pattern above)
```

#### New Table Migration Pattern (with UUID - REQUIRED)
``` sql
-- Migration: YYYYMMDDHHMMSS_create_your_table.sql

-- REQUIRED: ALL tables MUST use UUID primary keys
CREATE TABLE IF NOT EXISTS public.your_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (), -- REQUIRED: UUID primary key
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    -- other columns...
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now()
);

-- ALWAYS create index on organization_id
CREATE INDEX IF NOT EXISTS idx_your_table_organization_id ON public.your_table (organization_id);

-- ALWAYS enable RLS
ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;

-- ALWAYS create RLS policies (use the 5-policy pattern above)
```

#### Laravel Migration Pattern (with UUID - REQUIRED)
```php
// Migration: YYYY_MM_DD_HHMMSS_create_your_table.php
use Illuminate\Database\Migrations\Migration;

use Illuminate\Database\Schema\Blueprint;

use Illuminate\Support\Facades\Schema;

use Illuminate\Support\Facades\DB;

Schema::create('your_table', function (Blueprint $table) {
    // REQUIRED: UUID primary key
    $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));

/
/
REQUIRED: organization_id for multi-tenancy
    $table->uuid('organization_id')->nullable();

$table -> foreign ('organization_id') -> references ('id') -> on ('organizations') -> onDelete ('cascade');

/
/
other columns... $table->timestamps();

$table -> timestamp('deleted_at') -> nullable ();

/
/
ALWAYS
create index on organization_id $table -> index ('organization_id');

});

```

#### Migration Security & Performance Best Practices

**CRITICAL: All migrations must follow these security and performance guidelines.**

##### Function Security - SET search_path

**ALWAYS** set ` search_path = public ` on all functions to prevent search_path injection attacks:

``` sql
-- ✅ CORRECT: Function with secure search_path
CREATE
OR
REPLACE
    FUNCTION public.your_function () RETURNS TRIGGER LANGUAGE plpgsql
SET
    search_path = public -- REQUIRED for security
    AS $$ BEGIN
    -- function body
RETURN NEW;

END;

$$;

-- ❌ WRONG: Function without search_path (security vulnerability)
CREATE OR REPLACE FUNCTION public.your_function()
RETURNS TRIGGER AS $$
BEGIN
    -- function body
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

```

**Required for:**
- All trigger functions
- All helper functions
- All SECURITY DEFINER functions (especially critical)
- All stored procedures

##### Policy Naming - Character Limit

**ALWAYS** keep policy names under 63 characters to avoid PostgreSQL truncation warnings:

```sql
-- ✅ CORRECT: Short, descriptive policy name (35 chars)
CREATE POLICY "Users can insert org role_permissions" ON public.role_permissions
    FOR INSERT TO authenticated
    WITH CHECK (...);

-- ❌ WRONG: Policy name too long (will be truncated, causes warnings)
CREATE POLICY "Authenticated users can insert their organization's role_permissions" ON public.role_permissions
    FOR INSERT TO authenticated
    WITH CHECK (...);

```

**Guidelines:**
- Use abbreviations where clear: "org" instead of "organization", "role_perms" instead of "role_permissions"
- Prioritize clarity but stay under 63 characters
- Test policy names before committing

##### Policy Consolidation - Avoid Multiple Permissive Policies

**ALWAYS** consolidate multiple permissive policies for the same action into a single policy:

``` sql
-- ✅ CORRECT: Single consolidated policy
CREATE POLICY "Users can read profiles" ON public.profiles FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            id = (
                SELECT auth.uid ()
            )
            OR organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_organization_id () IS NULL
        )
    );

-- ❌ WRONG: Multiple permissive policies (causes security warnings)
CREATE POLICY "Users can read their own profile" ON public.profiles FOR
SELECT TO authenticated USING (
        id = (
            SELECT auth.uid ()
        )
    );

CREATE POLICY "Users can read profiles in their organization" ON public.profiles FOR
SELECT TO authenticated USING (
        organization_id = public.get_current_user_organization_id ()
    );

```

**Benefits:**
- Eliminates "multiple permissive policies" security warnings
- Better performance (single policy evaluation)
- Easier to maintain and understand
- Cleaner migration output

##### DROP Statements - Fresh Database Migrations

**For fresh database migrations** (initial schema, new projects), **DO NOT** include `DROP IF EXISTS` statements:

```sql
-- ✅ CORRECT: Clean migration for fresh database
CREATE TRIGGER update_your_table_updated_at
    BEFORE UPDATE ON public.your_table
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users can read your_table" ON public.your_table
    FOR SELECT TO authenticated
    USING (...);

-- ❌ WRONG: Unnecessary DROP statements (causes NOTICE noise)
DROP TRIGGER IF EXISTS update_your_table_updated_at ON public.your_table;

CREATE TRIGGER update_your_table_updated_at
    BEFORE UPDATE ON public.your_table
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Users can read your_table" ON public.your_table;

CREATE POLICY "Users can read your_table" ON public.your_table
    FOR SELECT TO authenticated
    USING (...);

```

**When to use DROP IF EXISTS:**
- **Only** for migrations that modify existing objects (ALTER migrations)
- **Only** when migrating from an older schema version
- **Never** for initial schema migrations on fresh databases

**Benefits of omitting DROP statements:**
- Cleaner migration output (no NOTICE messages)
- Faster execution (no unnecessary DROP operations)
- Simpler, more readable migrations
- Clearer intent (creating new objects, not modifying existing)

##### Function Format Standard

**ALWAYS** use this standard format for all functions:

```sql
CREATE OR REPLACE FUNCTION public.function_name()
RETURNS TYPE
LANGUAGE plpgsql
SECURITY DEFINER  -- Only if needed
SET search_path = public  -- REQUIRED
STABLE  -- If function is STABLE or IMMUTABLE
AS $$
DECLARE
    -- variables
BEGIN
    -- function body
END;
$$;

```

**Key points:**
- Always specify `LANGUAGE plpgsql` explicitly
- Always include `SET search_path = public`
- Use `SECURITY DEFINER` only when necessary
- Add `STABLE` or `IMMUTABLE` when applicable for performance
- Use `AS $$` syntax (not `$$ LANGUAGE plpgsql`)

##### Migration Checklist

Before committing a migration, verify:

- [ ] All functions have `SET search_path = public`
- [ ] All policy names are under 63 characters
- [ ] No multiple permissive policies for same action (consolidated)
- [ ] No unnecessary `DROP IF EXISTS` statements (for fresh migrations)
- [ ] All functions use standard format
- [ ] All policies follow organization isolation patterns
- [ ] All triggers are properly defined
- [ ] Migration runs cleanly without NOTICE warnings (except extension notices)

### Testing - Multi-Tenancy

#### Test Organization Isolation
```typescript
describe('useYourResources', () => {
  it('should filter by organization_id for all users', async () => {
    // Test that users only see their organization's data
  });

  it('should prevent cross-organization access', async () => {
    // Test that users cannot access other organizations' data
  });

it('should require organization_id for all operations', async () => {
    // Test that users without organization_id cannot perform operations
  });

});


```

### Security Checklist - Multi-Tenancy

**ALWAYS verify:**
- [ ] Table has `organization_id` column
- [ ] Table has `school_id` column (for school-scoped resources)
- [ ] `organization_id` has foreign key to `organizations` table
- [ ] `school_id` has foreign key to `school_branding` table (for school-scoped resources)
- [ ] Index created on `organization_id`
- [ ] Index created on `school_id` (for school-scoped resources)
- [ ] RLS enabled on table
- [ ] Laravel middleware validates `organization_id` in controllers
- [ ] Laravel controllers use `getCurrentSchoolId()` method (NEVER trust client-provided `school_id`)
- [ ] Frontend hook query key includes `profile?.default_school_id`
- [ ] Frontend hook filters by `organization_id`
- [ ] Frontend API calls pass both `organization_id` and `school_id`
- [ ] Mutations validate `organization_id` matches user's organization
- [ ] Mutations validate `school_id` matches user's default school
- [ ] Storage paths include `organization_id`
- [ ] Laravel controllers enforce organization isolation
- [ ] Laravel controllers enforce school isolation (filter by `school_id`)
- [ ] All users have `organization_id` (no NULL values)
- [ ] All users have `default_school_id` (for school-scoped operations)
- [ ] Users can only access their own organization's data
- [ ] Users can only access their own school's data

### Common Mistakes to Avoid

❌ **DON'T:**
- Create tables without `organization_id`
- Create school-scoped tables without `school_id`
- Allow NULL values for `organization_id` in tenant tables
- Allow NULL values for `school_id` in school-scoped tables
- Query without organization filtering
- Query without school filtering (for school-scoped resources)
- Allow organization_id changes (users cannot change their organization)
- Trust client-provided `school_id` (always use `getCurrentSchoolId()`)
- Store files without organization_id in path
- Trust client-side organization_id validation only
- Create users without assigning them to an organization
- Create query keys without `default_school_id` (for school-scoped resources)
- Make API calls without passing `school_id` (for school-scoped resources)

✅ **DO:**
- Always add `organization_id` to tenant tables (NOT NULL)
- Always add `school_id` to school-scoped tables (NOT NULL)
- Always enforce organization_id in Laravel middleware and controllers
- Always enforce school_id in Laravel controllers using `getCurrentSchoolId()`
- Always filter queries by both `organization_id` AND `school_id`
- Always include `profile?.default_school_id` in frontend query keys
- Always pass both `organization_id` and `school_id` in API calls
- Always validate organization_id in mutations (must match user's organization)
- Always validate school_id in mutations (must match user's default school)
- Always include organization_id in storage paths
- Always test organization isolation
- Always test school isolation
- Always require organization_id when creating users
- Always require default_school_id for school-scoped operations
- Always validate organization_id server-side (never trust client-side only)
- Always validate school_id server-side using `getCurrentSchoolId()` (never trust client-provided)

## UI/UX Guidelines

### Design System
- Use shadcn/ui components consistently
- Follow Islamic-inspired design principles
- Implement responsive design (mobile-first)
- Support RTL languages (Arabic, Pashto, Farsi)
- Use semantic color tokens

### Component Structure
```typescript
interface ComponentProps {
  // Define all props with proper types
}

export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // Component logic
  return (
    <div className="proper-tailwind-classes">
      {/* JSX content */}
    </div>
  );

}
```

### Styling
- Use Tailwind CSS utility classes
- Create custom CSS variables for theming
- Implement dark/light mode support
- Use consistent spacing and typography
- Follow accessibility guidelines

## Responsive Design System

**CRITICAL: All components MUST be mobile-first and responsive. Follow these standards for consistent UX across all screen sizes.**

### Page Container Pattern

**CRITICAL: ALL page containers MUST prevent horizontal scrolling.**

```typescript
// ✅ CORRECT: Container with overflow prevention
<div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
  {/* Page content */}
</div>

// ❌ WRONG: Missing overflow-x-hidden (causes horizontal scroll)
<div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
  {/* Page content */}
</div>
```

**Page Container Requirements:**
- ✅ **ALWAYS** use `overflow-x-hidden` on main page containers
- ✅ **ALWAYS** use `container mx-auto` for centering
- ✅ **ALWAYS** use responsive padding: `p-4 md:p-6`
- ✅ **ALWAYS** use `max-w-7xl` or appropriate max-width
- ❌ **NEVER** allow horizontal scrolling on page level

### PageHeader Responsive Pattern

**Icons and descriptions MUST be hidden on mobile for compact UX:**

```typescript
<PageHeader
  title={t('page.title')}
  description={t('page.description')}  // Hidden on mobile by default
  icon={<Icon className="h-5 w-5" />}  // Hidden on mobile by default
  showDescriptionOnMobile={false}  // Optional: show description on mobile
/>
```

**PageHeader Guidelines:**
- Icons are hidden on mobile (`hidden md:inline-flex`)
- Descriptions are hidden on mobile by default (`hidden md:block`)
- Use `showDescriptionOnMobile={true}` only when description is critical
- Title is always visible with responsive text size

### FilterPanel Responsive Pattern

**FilterPanel is collapsible on mobile, always visible on desktop:**

```typescript
<FilterPanel
  title={t('filters.title')}
  defaultOpenDesktop={true}   // Open on desktop by default
  defaultOpenMobile={false}  // Closed on mobile by default
>
  {/* Filter content */}
</FilterPanel>
```

**FilterPanel Behavior:**
- Mobile: Collapsed by default, shows button to expand
- Desktop: Expanded by default, shows toggle button
- Uses `Collapsible` component internally
- Provides compact mobile experience

### Tabs Responsive Pattern

**Tab labels MUST be hidden on mobile, icons always visible:**

```typescript
<TabsList className="grid w-full grid-cols-5">
  <TabsTrigger value="tab1" className="flex items-center gap-2">
    <Icon className="h-4 w-4" />
    <span className="hidden sm:inline">{t('tab.label')}</span>
  </TabsTrigger>
</TabsList>
```

**Tabs Guidelines:**
- Icons are always visible on all screen sizes
- Labels are hidden on mobile: `hidden sm:inline`
- Use `grid-cols-{count}` for equal-width tabs
- Tabs remain functional on mobile with icon-only

### Grid Layout Patterns

**Responsive grid layouts MUST use proper breakpoints:**

```typescript
// Single column on mobile, multiple on desktop
<div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
  <Card>Content</Card>
</div>

// Two columns on tablet, three on desktop
<div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  <Card>Content</Card>
</div>
```

**Grid Guidelines:**
- **Mobile**: Always start with `grid-cols-1`
- **Tablet**: Use `md:grid-cols-2` or `sm:grid-cols-2`
- **Desktop**: Use `lg:grid-cols-3` or `xl:grid-cols-4`
- **Use `lg:` breakpoint** (1024px) instead of `md:` (768px) for multi-column layouts to prevent cramped tablets

### Form Responsive Patterns

**Forms MUST stack vertically on mobile:**

```typescript
<div className="space-y-4">
  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
    <Input label="Field 1" />
    <Input label="Field 2" />
  </div>
</div>
```

**Form Guidelines:**
- Use `grid-cols-1 md:grid-cols-2` for two-column forms
- Stack all fields vertically on mobile
- Use `space-y-4` for vertical spacing

### Flex Direction Patterns

**Flex containers MUST adapt to screen size:**

```typescript
// Stack on mobile, row on desktop
<div className="flex flex-col md:flex-row gap-4">
  <div className="flex-1">Content 1</div>
  <div className="flex-1">Content 2</div>
</div>
```

**Flex Guidelines:**
- Use `flex-col` for mobile (vertical stacking)
- Use `md:flex-row` or `lg:flex-row` for desktop (horizontal layout)
- Always include `gap-4` or appropriate spacing

### Text Responsive Patterns

**Text sizes MUST scale appropriately:**

```typescript
// Hide text on mobile, show on larger screens
<span className="hidden sm:inline">{t('label')}</span>

// Responsive text sizes
<div className="text-xs sm:text-sm">Small text</div>
<div className="text-2xl sm:text-3xl">Large heading</div>
```

**Text Guidelines:**
- `hidden sm:inline` - Hide on mobile, show on small screens+
- `hidden md:block` - Hide on mobile/tablet, show on desktop
- `text-xs sm:text-sm` - Smaller on mobile, larger on tablet+
- Use `truncate` for long text to prevent overflow

### Table Responsive Patterns

**CRITICAL: Tables MUST be wrapped in scrollable container for mobile.**

```typescript
<Card>
  <CardContent>
    <div className="overflow-x-auto">
      <Table>
        {/* Table content */}
      </Table>
    </div>
  </CardContent>
</Card>
```

**Table Requirements:**
- ✅ **ALWAYS** wrap tables in `<div className="overflow-x-auto">`
- ✅ **ALWAYS** ensure tables scroll horizontally on mobile
- ✅ **ALWAYS** use responsive table layouts
- ❌ **NEVER** allow tables to break page layout on mobile

### Chart Responsive Patterns

**CRITICAL: Charts MUST be responsive and never cause horizontal scrolling. Use progressive height scaling for mobile-first design.**

```typescript
<ChartContainer
  config={chartConfig}
  className="h-[200px] sm:h-[220px] md:h-[250px] w-full"
>
  {/* Chart */}
</ChartContainer>
```

**Chart Height Guidelines:**
- **Mobile (default)**: `h-[200px]` - Compact to prevent scrolling
- **Small tablets (640px+)**: `sm:h-[220px]` - Slightly larger
- **Tablets (768px+)**: `md:h-[250px]` - Standard size
- **Desktop (1024px+)**: `lg:h-[300px]` - Full size (optional)

**Pie/Donut Chart Pattern:**

```typescript
<ChartContainer
  config={chartConfig}
  className="mx-auto aspect-square max-h-[150px] sm:max-h-[180px] md:max-h-[200px] w-full"
>
  <PieChart>
    <Pie
      innerRadius={40}  // Smaller on mobile
      outerRadius={60}  // Smaller on mobile
    />
  </PieChart>
</ChartContainer>
```

**Chart Container Requirements:**
- ✅ **ALWAYS** use `w-full` for width (never fixed widths)
- ✅ **ALWAYS** use progressive height scaling: `h-[200px] sm:h-[...] md:h-[...]`
- ✅ **ALWAYS** ensure charts fit within card boundaries
- ✅ **ALWAYS** use `overflow-hidden` on parent cards to prevent overflow
- ❌ **NEVER** use fixed heights that are too large for mobile
- ❌ **NEVER** use `overflow-visible` on cards containing charts

### Card Responsive Patterns

**CRITICAL: Cards MUST prevent horizontal overflow and use proper overflow handling for decorative elements.**

```typescript
// ✅ CORRECT: Use overflow-hidden to prevent horizontal scroll
<Card className="relative overflow-hidden">
  {/* Decorative circle - reduced negative margin */}
  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
  <CardHeader>
    {/* Content */}
  </CardHeader>
</Card>
```

**Card Overflow Requirements:**
- ✅ **ALWAYS** use `overflow-hidden` on cards with decorative elements
- ✅ **ALWAYS** reduce negative margins: `-mr-8 -mt-8` (not `-mr-16 -mt-16`)
- ✅ **ALWAYS** add `opacity-50` to decorative elements for subtle effect
- ❌ **NEVER** use `overflow-visible` on cards (causes horizontal scroll)

**Card Grid Guidelines:**
- **Mobile**: `grid-cols-1` - Single column
- **Tablet**: `sm:grid-cols-2` or `md:grid-cols-2` - Two columns
- **Desktop**: `lg:grid-cols-3` or `xl:grid-cols-4` - Multiple columns
- **Use `lg:` breakpoint** (1024px) instead of `md:` (768px) for multi-column layouts

### Button Responsive Patterns

**CRITICAL: Buttons with icons and labels MUST hide labels on mobile, show icons only.**

```typescript
<Button
  variant="outline"
  size="sm"
  className="flex-shrink-0"
  aria-label={t('common.exportExcel') || 'Export Excel'}
>
  <FileSpreadsheet className="h-4 w-4" />
  <span className="hidden sm:inline ml-2">{t('common.exportExcel') || 'Export Excel'}</span>
</Button>
```

**Button Guidelines:**
- ✅ **ALWAYS** show icons on all screen sizes
- ✅ **ALWAYS** hide labels on mobile: `hidden sm:inline`
- ✅ **ALWAYS** add `ml-2` margin between icon and label (when label is visible)
- ✅ **ALWAYS** use `flex-shrink-0` to prevent button compression
- ✅ **ALWAYS** add `aria-label` for icon-only buttons (accessibility)
- ❌ **NEVER** show text labels on mobile (use icon-only)
- ❌ **NEVER** use short labels like "Excel" or "PDF" on mobile (use icon-only instead)

**Export Buttons Pattern with Tooltips:**

```typescript
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

<TooltipProvider>
  <div className="flex items-center gap-1.5 sm:gap-2">
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="sm" className="flex-shrink-0" aria-label={t('common.exportExcel')}>
          <FileSpreadsheet className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">{t('common.exportExcel')}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="sm:hidden">
        <p>{t('common.exportExcel')}</p>
      </TooltipContent>
    </Tooltip>
  </div>
</TooltipProvider>
```

**Export Buttons Guidelines:**
- ✅ **ALWAYS** use `TooltipProvider` wrapper
- ✅ **ALWAYS** add tooltips for icon-only buttons on mobile: `className="sm:hidden"` on TooltipContent
- ✅ **ALWAYS** keep buttons horizontal: `flex items-center gap-1.5 sm:gap-2` (no `flex-wrap`)
- ✅ **ALWAYS** use smaller gap on mobile: `gap-1.5` (6px) for compact layout
- ❌ **NEVER** use `flex-wrap` on export button containers (causes vertical stacking)

## Internationalization (i18n)

### Language Support
- **Supported Languages**: English (en), Pashto (ps), Farsi (fa), Arabic (ar)
- **RTL Languages**: Arabic, Pashto, Farsi
- **LTR Languages**: English

### Translation System
- **Translation files are organized in `/src/lib/translations/` directory**
  - `types.ts` - Contains the `TranslationKeys` interface (type definitions)
  - `en.ts` - English translations
  - `ps.ts` - Pashto translations
  - `fa.ts` - Farsi translations
  - `ar.ts` - Arabic translations
- **Main i18n file**: `/src/lib/i18n.ts` contains utility functions and imports from translation files
- Use the `useLanguage` hook to access translations
- Translation keys follow a hierarchical structure: `category.key` (e.g., `students.title`, `nav.dashboard`)

### Translation File Structure
```
frontend/src/lib/
├── i18n.ts                    # Main file with utilities (t, isRTL, getDirection, etc.)
└── translations/
    ├── types.ts               # TranslationKeys interface
    ├── en.ts                  # English translations
    ├── ps.ts                  # Pashto translations
    ├── fa.ts                  # Farsi translations
    └── ar.ts                  # Arabic translations
```

**File Organization Benefits:**
- Each language in its own file for easier maintenance
- Type definitions separated from translations
- Main i18n.ts file is clean and focused on utilities
- No breaking changes - all existing code continues to work

### Using Translations
```typescript
import { useLanguage } from '@/hooks/useLanguage';

function MyComponent() {
  const { t, isRTL, language } = useLanguage();

return (
    <div>
      <h1>{t('students.title')}</h1>
      <p>{t('students.searchPlaceholder')}</p>
    </div>
  );

}
```

### Translation Key Structure
- **Common**: `common.loading`, `common.save`, `common.cancel`, etc.
- **Navigation**: `nav.dashboard`, `nav.students`, `nav.allStudents`, etc.
- **Students**: `students.title`, `students.management`, `students.addStudent`, etc.
- **Dashboard**: `dashboard.title`, `dashboard.totalStudents`, etc.
- **Forms**: `forms.required`, `forms.invalidEmail`, etc.

### Adding New Translations
1. **Add the key to the `TranslationKeys` interface** in `/src/lib/translations/types.ts`
2. **Add translations for all languages** in their respective files:
   - `/src/lib/translations/en.ts` - English
   - `/src/lib/translations/ps.ts` - Pashto
   - `/src/lib/translations/fa.ts` - Farsi
   - `/src/lib/translations/ar.ts` - Arabic
3. **Use the key in components** with `t('category.key')`

**Important Notes:**
- Each language file imports the `TranslationKeys` type from `./types`
- All translation files must have the same structure matching the `TranslationKeys` interface
- The main `/src/lib/i18n.ts` file automatically imports and exports all translations
- No changes needed in components - they continue to use `useLanguage()` hook as before

### RTL (Right-to-Left) Support

#### Implementation
- RTL is automatically applied when an RTL language is selected
- The `useLanguage` hook sets `document.documentElement.dir` to `'rtl'` or `'ltr'`
- Sidebar position changes based on RTL: `side={isRTL ? "right" : "left"}`
- Layout direction is set via `dir` attribute on main containers

#### RTL CSS Rules
- RTL-specific CSS is in `/src/index.css` under `[dir="rtl"]` selectors
- Text alignment automatically reverses: `.text-left` becomes right-aligned in RTL
- Auto margins reverse: `.ml-auto` becomes `margin-right: auto` in RTL
- Borders adjust: `.border-l` becomes right border in RTL

#### Component RTL Handling
```typescript
// In components, use isRTL from useLanguage hook
const { isRTL } = useLanguage();

/
/
Apply conditional classes
<div className={isRTL ? 'mr-4 border-r' : 'ml-4 border-l'}>
  {/* Content */}
</div>

/
/
Sidebar component
<Sidebar side={isRTL ? "right" : "left"} dir={isRTL ? 'rtl' : 'ltr'}>
  {/* Sidebar content */}
</Sidebar>
```

#### Navigation Items with Translations
- Navigation items should use `titleKey` for translation keys
- Children items should have `titleKey` property for translations
- Example:
```typescript
{
  title: "All Students", // Fallback
  titleKey: "allStudents", // Translation key
  url: "/students",
  icon: Users
}
```

### Language Provider
- `LanguageProvider` wraps the entire app in `App.tsx`
- Language preference is stored in `localStorage` with key `'nazim-language'`
- Default language is English (`'en'`)
- Language switcher is available in both sidebar and header

## Date Conversion & Calendar System

**CRITICAL: The application supports multiple calendar systems with automatic conversion. ALL dates are stored as Gregorian in the database, but displayed in the user's preferred calendar.**

### Supported Calendar Types
- **Gregorian**: Standard Western calendar (default)
- **Hijri Shamsi**: Solar/Persian calendar (used in Iran, Afghanistan)
- **Hijri Qamari**: Lunar/Islamic calendar (used in Saudi Arabia and many Muslim countries)

### Calendar Conversion Architecture

#### Core Conversion Functions (`/src/lib/calendarConverter.ts`)

**CRITICAL: Always use `convertToCalendar()` for date conversions. Never use direct calendar conversion functions unless absolutely necessary.**

```typescript
import { convertToCalendar } from '@/lib/calendarConverter';
import type { CalendarType } from '@/lib/datePreferences';

// Convert any date to the specified calendar
const converted = convertToCalendar(date, 'hijri_qamari');
// Returns: { year: 1445, month: 6, day: 15, calendar: 'hijri_qamari' }
```

#### Qamari Calendar Accuracy

**CRITICAL: The Qamari calendar uses Umm al-Qura (most accurate) with fallbacks:**
- **Primary**: `islamic-umalqura` (Umm al-Qura calendar, used in Saudi Arabia)
- **Fallback 1**: `islamic-civil` (more widely supported)
- **Fallback 2**: `islamic` (default Islamic calendar)

The conversion function automatically tries these variants in order for maximum accuracy and compatibility.

#### Date Validation Pattern

**CRITICAL: ALL date formatting functions MUST validate Date objects before use:**

```typescript
export function formatDate(date: Date | string, locale: string = 'en-US'): string {
  try {
    // Ensure we have a valid Date object
    let dateObj: Date;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      return 'Invalid Date';
    }

    // Check if dateObj is a valid Date instance
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    // ... rest of formatting logic
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}
```

**Key Rules:**
- ✅ **ALWAYS** check if input is a `Date` instance
- ✅ **ALWAYS** validate with `isNaN(dateObj.getTime())` after conversion
- ✅ **ALWAYS** return `'Invalid Date'` for invalid inputs
- ✅ **ALWAYS** handle both `Date` and `string` inputs
- ❌ **NEVER** call Date methods without validation
- ❌ **NEVER** assume input is always a valid Date

#### Date Conversion Caching

**CRITICAL: Date conversions are expensive. ALWAYS use caching for performance, especially in date pickers and calendar components.**

```typescript
// Cache for date conversions (Map-based)
const conversionCache = new Map<string, { year: number; month: number; day: number; calendar: CalendarType }>();

function getCachedConversion(date: Date, calendar: CalendarType) {
  const cacheKey = `${date.getTime()}-${calendar}`;
  if (conversionCache.has(cacheKey)) {
    return conversionCache.get(cacheKey)!;
  }
  const converted = convertToCalendar(date, calendar);
  conversionCache.set(cacheKey, converted);
  
  // Limit cache size to prevent memory leaks (keep last 1000 conversions)
  if (conversionCache.size > 1000) {
    const firstKey = conversionCache.keys().next().value;
    conversionCache.delete(firstKey);
  }
  return converted;
}
```

**Key Rules:**
- ✅ **ALWAYS** use cache key format: `${date.getTime()}-${calendar}`
- ✅ **ALWAYS** limit cache size (recommended: 1000 entries)
- ✅ **ALWAYS** use `getTime()` for cache keys (not `toISOString()`)
- ✅ **ALWAYS** implement cache eviction (FIFO or LRU)
- ❌ **NEVER** cache without size limits (memory leak risk)

### Date Formatting Functions (`/src/lib/calendarAdapter.ts`)

**CRITICAL: Use these functions for ALL date display. They automatically use the user's calendar preference.**

```typescript
import { formatDate, formatDateTime, formatShortDate } from '@/lib/calendarAdapter';
// OR (shimmed in utils.ts)
import { formatDate, formatDateTime } from '@/lib/utils';

// Format date (automatically uses user's calendar preference)
const displayDate = formatDate(date); // "Rajab 15, 1445" or "July 15, 2024"

// Format date with time
const displayDateTime = formatDateTime(date); // "Rajab 15, 1445 3:30 PM"

// Format short date
const shortDate = formatShortDate(date); // "Rajab 15"
```

**Key Rules:**
- ✅ **ALWAYS** use `formatDate()` / `formatDateTime()` from `calendarAdapter.ts` or `utils.ts`
- ✅ **ALWAYS** validate Date objects before formatting (handled internally)
- ✅ **ALWAYS** let the functions handle calendar conversion automatically
- ❌ **NEVER** manually convert dates for display (use formatting functions)
- ❌ **NEVER** use `toLocaleDateString()` directly (doesn't respect user preference)

### Date Picker Components

#### CalendarDatePicker (Standalone)

**For non-form date inputs with direct state management:**

```typescript
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';

<CalendarDatePicker
  date={value ? new Date(value) : undefined}
  onDateChange={(date) => setValue(date ? date.toISOString().slice(0, 10) : '')}
  placeholder="Select date"
  disabled={isDisabled}
  minDate={minDate}
  maxDate={maxDate}
/>
```

**Key Features:**
- Displays dates in user's preferred calendar
- Stores dates as Gregorian (for database compatibility)
- Automatically converts between calendars
- Includes "Today" button for quick selection
- Caches date conversions for performance

#### CalendarFormField (React Hook Form)

**For react-hook-form integrated inputs:**

```typescript
import { CalendarFormField } from '@/components/ui/calendar-form-field';
import { useForm } from 'react-hook-form';

const { control } = useForm();

<CalendarFormField
  control={control}
  name="start_date"
  label="Start Date"
  required
/>
```

**Key Features:**
- Integrates with React Hook Form
- Automatic validation
- Calendar-aware display
- Stores as Gregorian in form data

### Database Storage Pattern

**CRITICAL: ALL dates MUST be stored as Gregorian in the database, regardless of display calendar.**

```typescript
// ✅ CORRECT: Store as Gregorian
const payload = {
  start_date: date.toISOString().slice(0, 10), // "2024-07-15" (Gregorian)
  // ... other fields
};

// ❌ WRONG: Don't store converted calendar dates
const payload = {
  start_date: "1445-06-15", // Hijri Qamari - WRONG!
};
```

**Key Rules:**
- ✅ **ALWAYS** store dates as ISO strings (YYYY-MM-DD) in Gregorian
- ✅ **ALWAYS** use `toISOString().slice(0, 10)` for date strings
- ✅ **ALWAYS** convert to Date object: `new Date(dateString)`
- ❌ **NEVER** store calendar-specific date formats
- ❌ **NEVER** store dates in non-Gregorian calendars

### Calendar State Management

**The user's calendar preference is managed globally:**

```typescript
import { calendarState } from '@/lib/calendarState';

// Get current calendar
const currentCalendar = calendarState.get(); // 'gregorian' | 'hijri_shamsi' | 'hijri_qamari'

// Subscribe to calendar changes
useEffect(() => {
  const unsubscribe = calendarState.subscribe((calendar) => {
    // Handle calendar change
  });
  return unsubscribe;
}, []);
```

**Key Rules:**
- ✅ **ALWAYS** use `calendarState.get()` to get current calendar
- ✅ **ALWAYS** subscribe to changes if component needs to react
- ✅ **ALWAYS** unsubscribe in cleanup
- ❌ **NEVER** hardcode calendar type
- ❌ **NEVER** store calendar preference in component state (use global state)

### Performance Best Practices

**CRITICAL: Date conversions are expensive. Optimize with memoization and caching.**

```typescript
// ✅ CORRECT: Memoize converted dates
const convertedDate = useMemo(() => {
  return getCachedConversion(date, currentCalendar);
}, [date, currentCalendar]);

// ✅ CORRECT: Memoize formatted dates
const formattedDate = useMemo(() => {
  return formatDate(date);
}, [date]); // formatDate internally uses calendarState

// ❌ WRONG: Don't convert on every render
const convertedDate = convertToCalendar(date, currentCalendar); // Recalculates every render!
```

**Key Rules:**
- ✅ **ALWAYS** use `useMemo` for date conversions in components
- ✅ **ALWAYS** use cached conversion functions
- ✅ **ALWAYS** include calendar in memoization dependencies
- ❌ **NEVER** convert dates in render without memoization
- ❌ **NEVER** create new Date objects unnecessarily

### Common Patterns

#### Converting Form Date Strings to Date Objects

```typescript
// Form stores dates as strings (YYYY-MM-DD)
const formData = {
  start_date: "2024-07-15", // String from form
};

// Convert to Date for date picker
const startDate = formData.start_date ? new Date(formData.start_date) : undefined;

// Convert Date back to string for form submission
const payload = {
  start_date: startDate ? startDate.toISOString().slice(0, 10) : '',
};
```

#### Displaying Dates in Tables

```typescript
// ✅ CORRECT: Use formatDate (automatically uses user's calendar)
<TableCell>{formatDate(entry.date)}</TableCell>

// ❌ WRONG: Don't use toLocaleDateString directly
<TableCell>{entry.date.toLocaleDateString()}</TableCell>
```

#### Date Range Validation

```typescript
// Validate date ranges (always use Gregorian for comparison)
const startDate = new Date(data.start_date);
const endDate = new Date(data.end_date);

if (endDate <= startDate) {
  throw new Error('End date must be after start date');
}
```

### Error Handling

**CRITICAL: Always handle invalid dates gracefully:**

```typescript
try {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  return formatDate(date);
} catch (error) {
  console.error('Error formatting date:', error);
  return 'Invalid Date';
}
```

### Testing Calendar Conversion

**When testing calendar features:**
1. Test with all three calendar types (Gregorian, Shamsi, Qamari)
2. Test date conversion accuracy (especially for Qamari)
3. Test date picker with different calendars
4. Test date formatting in different languages
5. Test cache performance with many conversions

## Toast Notifications

**CRITICAL: ALL toast messages MUST use the centralized `showToast` utility with translation keys. NEVER use `toast` directly from `sonner`.**

### Centralized Toast System

The application uses a centralized toast notification system (`/src/lib/toast.ts`) that:
- **Automatically translates messages** using translation keys
- **Respects RTL/LTR language direction** (toasts appear on left for RTL, right for LTR)
- **Provides consistent positioning** across all languages
- **Supports parameter interpolation** for dynamic messages

### Toast Utility Location
- **Main utility**: `/src/lib/toast.ts` - Centralized toast functions
- **Toaster component**: `/src/components/ui/sonner.tsx` - Renders toasts with RTL support
- **Translation keys**: `/src/lib/translations/types.ts` - Contains `toast` section for common messages

### Using Toast Notifications

#### Basic Usage Pattern
```typescript
import { showToast } from '@/lib/toast';
import { useLanguage } from '@/hooks/useLanguage';

export const useCreateYourResource = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: YourResourceData) => {
      return await apiClient.yourResources.create(data);
    },
    onSuccess: () => {
      // ✅ CORRECT: Use translation key
      showToast.success(t('toast.yourResourceCreated'));
      queryClient.invalidateQueries({ queryKey: ['your-resources'] });
    },
    onError: (error: Error) => {
      // ✅ CORRECT: Use translation key with fallback
      showToast.error(error.message || t('toast.yourResourceCreateFailed'));
    },
  });
};
```

#### Translation Key Patterns

**CRITICAL: Always use translation keys, never hardcoded strings.**

1. **Common toast messages** (use `toast.*` keys):
   ```typescript
   showToast.success('toast.profileUpdated');
   showToast.error('toast.profileUpdateFailed');
   showToast.success('toast.userCreated');
   showToast.error('toast.userCreateFailed');
   ```

2. **Resource-specific messages** (use resource-specific keys):
   ```typescript
   // For academic years
   showToast.success('academic.academicYears.academicYearCreated');
   showToast.error('academic.academicYears.academicYearCreateFailed');
   
   // For subjects
   showToast.success('academic.subjects.subjectCreated');
   showToast.error('academic.subjects.subjectCreateFailed');
   ```

3. **Messages with parameters**:
   ```typescript
   showToast.success('toast.subjectsAssigned', { 
     count: 5, 
     skipped: 2 
   });
   // Translation: 'Successfully assigned {count} subject(s). {skipped} subject(s) were already assigned.'
   ```

#### Toast Types

```typescript
// Success toast
showToast.success('toast.resourceCreated');

// Error toast
showToast.error('toast.resourceCreateFailed');

// Info toast
showToast.info('toast.resourceUpdated');

// Warning toast
showToast.warning('toast.resourceInUse');

// Loading toast (returns toast ID for dismissal)
const toastId = showToast.loading('toast.processing');
// ... do work ...
showToast.dismiss(toastId);
```

### RTL/LTR Positioning

**CRITICAL: Toast positioning is handled automatically by the system.**

- **RTL languages** (Arabic, Pashto, Farsi): Toasts appear on **bottom-left**
- **LTR languages** (English): Toasts appear on **bottom-right**
- **Position updates automatically** when language changes
- **No manual positioning needed** - the `Toaster` component handles this

#### How It Works

1. **`showToast` utility** (`/src/lib/toast.ts`):
   - Reads current language from `localStorage`
   - Determines position based on `isRTL()` function
   - Sets `position: 'bottom-left'` for RTL, `'bottom-right'` for LTR

2. **`Toaster` component** (`/src/components/ui/sonner.tsx`):
   - Listens for language changes
   - Updates toast position dynamically
   - Handles cross-tab language changes

### Translation Keys for Toast Messages

**CRITICAL: All toast messages MUST have translation keys in all four languages.**

#### Adding New Toast Translation Keys

1. **Add to `TranslationKeys` interface** (`/src/lib/translations/types.ts`):
   ```typescript
   export interface TranslationKeys {
     // ... existing keys ...
     toast: {
       // ... existing toast keys ...
       yourResourceCreated: string;
       yourResourceCreateFailed: string;
       yourResourceUpdated: string;
       yourResourceUpdateFailed: string;
       yourResourceDeleted: string;
       yourResourceDeleteFailed: string;
     };
   }
   ```

2. **Add translations to all language files**:
   - `/src/lib/translations/en.ts` - English
   - `/src/lib/translations/ps.ts` - Pashto
   - `/src/lib/translations/fa.ts` - Farsi
   - `/src/lib/translations/ar.ts` - Arabic

3. **Use in hooks**:
   ```typescript
   showToast.success('toast.yourResourceCreated');
   ```

#### Common Toast Keys (Already Available)

The following keys are available in the `toast` section:
- `profileUpdated`, `profileUpdateFailed`
- `userCreated`, `userCreateFailed`, `userUpdateFailed`, `userDeleteFailed`
- `organizationCreated`, `organizationCreateFailed`, etc.
- `subjectCreated`, `subjectUpdated`, `subjectDeleted`, etc.
- `studentRegistered`, `studentUpdated`, `studentRemoved`, etc.
- And many more...

**Check `/src/lib/translations/types.ts` for the complete list.**

### Hook Pattern with Toast Notifications

**CRITICAL: ALL mutation hooks MUST use `showToast` for success/error messages.**

```typescript
import { showToast } from '@/lib/toast';
import { useLanguage } from '@/hooks/useLanguage';

export const useCreateYourResource = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: YourResourceData) => {
      if (!profile?.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await apiClient.yourResources.create({
        ...data,
        organization_id: profile.organization_id,
      });
    },
    onSuccess: () => {
      // ✅ CORRECT: Use translation key
      showToast.success(t('toast.yourResourceCreated'));
      void queryClient.invalidateQueries({ queryKey: ['your-resources'] });
    },
    onError: (error: Error) => {
      // ✅ CORRECT: Use translation key with error message fallback
      showToast.error(error.message || t('toast.yourResourceCreateFailed'));
    },
  });
};

export const useUpdateYourResource = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      return await apiClient.yourResources.update(id, updates);
    },
    onSuccess: () => {
      showToast.success(t('toast.yourResourceUpdated'));
      void queryClient.invalidateQueries({ queryKey: ['your-resources'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.yourResourceUpdateFailed'));
    },
  });
};

export const useDeleteYourResource = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.yourResources.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.yourResourceDeleted'));
      await queryClient.invalidateQueries({ queryKey: ['your-resources'] });
      await queryClient.refetchQueries({ queryKey: ['your-resources'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.yourResourceDeleteFailed'));
    },
  });
};
```

### Best Practices

#### ✅ DO:
- **ALWAYS** use `showToast` utility (never `toast` directly from `sonner`)
- **ALWAYS** use translation keys (never hardcoded strings)
- **ALWAYS** import `useLanguage` hook to get `t` function
- **ALWAYS** provide fallback error messages: `error.message || t('toast.key')`
- **ALWAYS** add translation keys to all four language files
- **ALWAYS** use `toast.*` keys for common messages, resource-specific keys for domain messages

#### ❌ DON'T:
- **NEVER** use `toast.success()` or `toast.error()` directly from `sonner`
- **NEVER** hardcode toast messages: `showToast.success('User created')` ❌
- **NEVER** skip translation keys
- **NEVER** manually set toast position (it's handled automatically)
- **NEVER** use plain strings when translation keys exist

### Common Mistakes to Avoid

❌ **WRONG:**
```typescript
import { toast } from 'sonner';

toast.success('User created successfully'); // ❌ Hardcoded, no translation, wrong position
```

✅ **CORRECT:**
```typescript
import { showToast } from '@/lib/toast';
import { useLanguage } from '@/hooks/useLanguage';

const { t } = useLanguage();
showToast.success(t('toast.userCreated')); // ✅ Translated, RTL-aware, centralized
```

### Toast Checklist

Before committing code with toast messages, verify:
- [ ] Uses `showToast` utility (not `toast` directly)
- [ ] Uses translation keys (not hardcoded strings)
- [ ] Translation keys exist in all four language files (`en.ts`, `ps.ts`, `fa.ts`, `ar.ts`)
- [ ] Success messages use appropriate translation keys
- [ ] Error messages have fallback: `error.message || t('toast.key')`
- [ ] `useLanguage` hook is imported and `t` function is used
- [ ] No manual position setting (handled automatically)

## Authentication & Security

### User Roles

**CRITICAL: Roles are managed via Spatie Laravel Permission, NOT the `profiles.role` column.**

- **`profiles.role` column**: DEPRECATED - kept for backward compatibility only
- **Role Management**: Via Spatie's `model_has_roles` table with organization scoping
- **Default Roles**: `admin`, `staff`, `teacher` (created automatically per organization)
- **Role Assignment**: Users are assigned roles via Spatie's `assignRole()` method
- **Permission Assignment**: Permissions are assigned to roles via Spatie's `role_has_permissions` table

#### Role Types (Organization-Scoped)
- `admin`: School-level administration (organization-scoped)
- `teacher`: Academic management
- `staff`: Operational tasks
- `student`: Personal academic access
- `parent`: Child's academic information

**Note**: All roles are organization-specific. A user can have different roles in different organizations (if multi-org support is added in the future).

### Security Practices
- Implement proper **permission-based access control** (NOT role-based)
- Use Laravel Sanctum tokens for authentication
- Validate all user inputs
- Implement audit logging
- Follow OWASP security guidelines
- **ALWAYS enforce multi-tenancy isolation** (organization_id filtering)
- **ALWAYS use RLS policies** for database-level security
- **ALWAYS validate organization_id** in all mutations
- **NEVER trust client-side organization_id** - validate server-side
- **ALWAYS check permissions** in controllers (create, read, update, delete)
- **ALWAYS use Spatie's `hasPermissionTo()`** for permission checks
- **NEVER use `profiles.role`** for access control (deprecated column)

### Development Mode Auth Bypass
- In development, authentication can be bypassed using `VITE_DISABLE_AUTH` env variable
- Mock user is created with `admin` role
- This should NEVER be enabled in production

## Type System Architecture - API vs Domain Separation

**CRITICAL: All modules MUST follow the API/Domain type separation pattern for maintainability, type safety, and performance.**

### Core Principles
- **API Types**: Match Laravel API responses exactly (snake_case, DB structure)
- **Domain Types**: UI-friendly structure (camelCase, nested objects, business logic)
- **Mapper Layer**: Converts between API and Domain models
- **Components**: Always work with Domain types (never API types directly)

### File Structure
```
frontend/src/
├── types/
│   ├── api/
│   │   └── {resource}.ts          # API types (snake_case, DB model)
│   └── domain/
│       └── {resource}.ts           # Domain types (camelCase, UI model)
├── mappers/
│   └── {resource}Mapper.ts         # API ↔ Domain conversion
├── hooks/
│   └── use{Resource}.tsx            # Returns domain models
└── pages/
    └── {Resource}.tsx               # Uses domain types
```

### API Types Pattern (`types/api/{resource}.ts`)

**Purpose**: Match Laravel API response structure exactly (snake_case, direct DB mapping)

```typescript
// frontend/src/types/api/student.ts
export interface Student {
  id: string;

organization_id: string;

school_id: string | null;

admission_no: string;

full_name: string;

father_name: string;
/
/
... all fields match API response exactly (snake_case)
  created_at: string;

updated_at: string;

} export interface StudentInsert { admission_no: string;

full_name: string;
/
/
... fields for API insert payload
}

export type StudentUpdate = Partial<StudentInsert>;

```

**Rules**:
- ✅ Use snake_case for all field names
- ✅ Match Laravel API response structure exactly
- ✅ Include all DB columns (even nullable ones)
- ✅ Use `string` for dates (ISO strings from API)
- ✅ No "Api" suffix in type names (as requested)
- ✅ Export all related types (Insert, Update, nested types)

### Domain Types Pattern (`types/domain/{resource}.ts`)

**Purpose**: UI-friendly structure with business logic and nested objects

```typescript
// frontend/src/types/domain/student.ts
export interface Student {
  id: string;

organizationId: string;
/
/
camelCase schoolId: string | null;

admissionNumber: string;

fullName: string;

fatherName: string;
/
/
... nested structures address: Address;

guardians: Guardian[];

healthInfo: HealthInfo;

previousSchools: PreviousSchool[];

documents: StudentDocument[];
/
/
... Date objects (not strings) createdAt: Date;

updatedAt: Date;

} export interface Address { street: string;

city: string;

state: string;

country: string;

postalCode: string;

landmark?: string;

}
```

**Rules**:
- ✅ Use camelCase for all field names
- ✅ Create nested structures (Address, Guardian, etc.)
- ✅ Use `Date` objects (not strings) for dates
- ✅ Include business logic types (Status enums, etc.)
- ✅ Export all related domain types

### Mapper Pattern (`mappers/{resource}Mapper.ts`)

**Purpose**: Convert between API and Domain models

```typescript
// frontend/src/mappers/studentMapper.ts
import type * as StudentApi from '@/types/api/student';

import type { Student } from '@/types/domain/student';

/**
 * Convert API Student model to Domain Student model
 */
export function mapStudentApiToDomain(api: StudentApi.Student): Student {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    admissionNumber: api.admission_no,
    fullName: api.full_name,
    fatherName: api.father_name,
    // ... map all fields
    // Parse nested structures
    address: {
      street: api.home_address || '',
      city: api.curr_district || '',
      // ...
    },
    guardians: api.guardian_name ? [{
      id: `guardian-${api.id}`,
      firstName: api.guardian_name.split(' ')[0],
      // ...
    }] : [],
    // Convert dates
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
  };

}

/**
 * Convert Domain Student model to API StudentInsert payload
 */
export function mapStudentDomainToInsert(domain: Partial<Student>): StudentApi.StudentInsert {
  return {
    admission_no: domain.admissionNumber || '',
    full_name: domain.fullName || '',
    father_name: domain.fatherName || '',
    organization_id: domain.organizationId || null,
    school_id: domain.schoolId || null,
    // ... map all fields back to snake_case
    // Flatten nested structures
    home_address: domain.address 
      ? `${domain.address.street}, ${domain.address.city}` 
      : null,
    guardian_name: domain.guardians?.[0] 
      ? `${domain.guardians[0].firstName} ${domain.guardians[0].lastName}` 
      : null,
    // Convert dates to ISO strings
    birth_date: domain.dateOfBirth?.toISOString() || null,
  };

}

/**
 * Convert Domain Student model to API StudentUpdate payload
 */
export function mapStudentDomainToUpdate(domain: Partial<Student>): StudentApi.StudentUpdate {
  return mapStudentDomainToInsert(domain);

}
```

**Rules**:
- ✅ Always create mapper functions for bidirectional conversion
- ✅ Handle nested structures (flatten for API, nest for Domain)
- ✅ Convert dates (string ↔ Date)
- ✅ Handle null/undefined gracefully
- ✅ Use namespace imports for API types: `import type * as ResourceApi from '@/types/api/resource'`
- ✅ Use direct imports for Domain types: `import type { Resource } from '@/types/domain/resource'`

### Hooks Pattern (`hooks/use{Resource}.tsx`)

**Purpose**: Fetch data, map to domain models, return domain types

```typescript
// frontend/src/hooks/useStudents.tsx
import type * as StudentApi from '@/types/api/student';

import type { Student } from '@/types/domain/student';

import { mapStudentApiToDomain, mapStudentDomainToInsert } from '@/mappers/studentMapper';

/
/
Re-export domain types for convenience
export type { Student, StudentStatus } from '@/types/domain/student';

export const useStudents = (organizationId?: string) => {
  const { user, profile } = useAuth();

return useQuery<Student[]>({
    queryKey: ['students', organizationId ?? profile?.organization_id ?? null],
    queryFn: async () => {
      if (!user || !profile) {
        if (import.meta.env.DEV) {
          console.log('[useStudents] No user or profile');

} return [];

}

/
/
Fetch API data
      const apiStudents = await studentsApi.list({
        organization_id: organizationId || profile.organization_id,
      });

/
/
Map to domain models
      return (apiStudents as StudentApi.Student[]).map(mapStudentApiToDomain);

},
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000,        // 5 minutes
    refetchOnWindowFocus: false,     // Performance optimization
    refetchOnReconnect: false,        // Performance optimization
  });

};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();

const { profile } = useAuth();

return useMutation({
    mutationFn: async (payload: Partial<Student>) => {
      // Convert domain to API payload
      const insertData = mapStudentDomainToInsert({
        ...payload,
        organizationId: payload.organizationId || profile?.organization_id,
      });

/
/
Call API const apiStudent = await studentsApi.create (insertData);

/
/
Map response back to domain
return mapStudentApiToDomain (
    apiStudent as StudentApi.Student
);

},
    onSuccess: () => {
      toast.success('Student created successfully');

void queryClient.invalidateQueries({ queryKey: ['students'] });

}, });

};

```

**Rules**:
- ✅ Always import API types with namespace: `import type * as ResourceApi from '@/types/api/resource'`
- ✅ Always import Domain types directly: `import type { Resource } from '@/types/domain/resource'`
- ✅ Always map API responses to Domain models in `queryFn`
- ✅ Always convert Domain models to API payloads in mutations
- ✅ Re-export Domain types from hooks for convenience
- ✅ Add performance optimizations (see Performance section below)
- ✅ Guard console.log statements (see Performance section below)

### Component Pattern (`pages/{Resource}.tsx`)

**Purpose**: Use Domain types, never API types

```typescript
// frontend/src/pages/Students.tsx
import { useStudents, useCreateStudent } from '@/hooks/useStudents';

import type { Student } from '@/types/domain/student';
/
/
Import domain type

export function Students() {
  const { data: students } = useStudents();
/
/
Returns Student[] (domain)
  const createStudent = useCreateStudent();

const handleCreate = (data: Partial<Student>) => {
    // Work with domain model
    createStudent.mutate({
      ...data,
      organizationId: profile?.organization_id,
    });

};

return (
    <div>
      {students?.map(student => (
        <div key={student.id}>
          {/* Use camelCase properties */}
          <h2>{student.fullName}</h2>
          <p>{student.admissionNumber}</p>
          <p>{student.address.city}</p>
        </div>
      ))}
    </div>
  );

}
```

**Rules**:
- ✅ Always import Domain types: `import type { Resource } from '@/types/domain/resource'`
- ✅ Never import API types in components
- ✅ Use camelCase properties from Domain types
- ✅ Work with nested structures (address, guardians, etc.)
- ✅ Use Date objects (not strings) for dates

### Creating New Modules

**When creating a new resource module (e.g., `teachers`, `classes`, `subjects`):**

1. **Create API types** (`types/api/{resource}.ts`)
   - Match Laravel API response structure
   - Use snake_case
   - Export all types (Resource, ResourceInsert, ResourceUpdate)

2. **Create Domain types** (`types/domain/{resource}.ts`)
   - Create UI-friendly structure
   - Use camelCase
   - Add nested structures where appropriate
   - Use Date objects for dates

3. **Create Mapper** (`mappers/{resource}Mapper.ts`)
   - Implement `map{Resource}ApiToDomain()`
   - Implement `map{Resource}DomainToInsert()`
   - Implement `map{Resource}DomainToUpdate()`
   - Handle all field transformations

4. **Create Hooks** (`hooks/use{Resource}.tsx`)
   - Import API types with namespace
   - Import Domain types directly
   - Map API → Domain in queries
   - Map Domain → API in mutations
   - Add performance optimizations
   - Guard console.log statements
   - Re-export Domain types

5. **Create Components** (`pages/{Resource}.tsx`)
   - Import Domain types only
   - Use camelCase properties
   - Work with nested structures

### Updating Existing Modules

**When updating an existing module:**

1. **Check current structure**
   - Identify if types are mixed (API + Domain)
   - Check if mapper exists
   - Verify hooks return correct types

2. **Refactor step-by-step**
   - Create API types file (extract from hooks)
   - Create Domain types file (refine from existing types)
   - Create mapper (implement conversions)
   - Update hooks (use mapper, return domain)
   - Update components (use domain types, camelCase)

3. **Verify**
   - All components use Domain types
   - No API types imported in components
   - Mapper handles all conversions
   - Performance optimizations added
   - Console.log statements guarded

## Performance Optimization

### Code Splitting
- Use lazy loading for all pages
- Implement proper loading states
- Use Suspense boundaries
- Optimize bundle size

### Data Fetching with TanStack Query

**CRITICAL: All queries MUST include performance optimizations.**

#### Required Query Options
```typescript
return useQuery({
  queryKey: ['resource', organizationId],
  queryFn: async () => {
    // Fetch and map data
  },
  enabled: !!user && !!profile,
  staleTime: 5 * 60 * 1000,        // REQUIRED: 5 minutes
  refetchOnWindowFocus: false,     // REQUIRED: Prevent refetch on tab switch
  refetchOnReconnect: false,       // OPTIONAL: Prevent refetch on reconnect
});

```

#### Performance Settings
- **`staleTime: 5 * 60 * 1000`** - Data is fresh for 5 minutes (reduces unnecessary refetches)
- **`refetchOnWindowFocus: false`** - Don't refetch when user switches tabs (prevents noise)
- **`refetchOnReconnect: false`** - Don't refetch when network reconnects (optional, use when data changes infrequently)
- **`gcTime: 30 * 60 * 1000`** - Keep unused data in cache for 30 minutes (default is usually fine)

#### Console.log Guarding

**CRITICAL: All console.log statements MUST be guarded in production.**

```typescript
// ✅ CORRECT: Guarded console.log
if (import.meta.env.DEV) {
  console.log('[useStudents] Fetched', students.length, 'students');

}

/
/
✅ CORRECT: Guarded console.error (keep errors in production)
if (import.meta.env.DEV) {
  console.error('[useStudents] Error:', error);

}

/
/
❌ WRONG: Unconditional console.log (adds overhead in production)
console.log('[useStudents] Fetched', students.length, 'students');

```

**Rules**:
- ✅ Always guard `console.log()` with `if (import.meta.env.DEV)`
- ✅ Always guard `console.warn()` with `if (import.meta.env.DEV)`
- ✅ Keep `console.error()` in production (for error tracking)
- ✅ Remove debug console.log from useEffect hooks
- ✅ Use logger abstraction for production logging (if available)

### Rendering
- Use React.memo for expensive components
- Implement proper key props
- Avoid unnecessary re-renders
- Use useMemo and useCallback appropriately
- Memoize filtered lists and calculations

### Loading States
- Use unified loading components from `/src/components/ui/loading.tsx`
- `LoadingSpinner`: For general loading states
- `PageSkeleton`: For page-level loading
- `DashboardSkeleton`: For dashboard loading
- `TableSkeleton`: For table loading
- All loaders use consistent styling (centered spinner with border)

### Performance Checklist

Before committing a module, verify:
- [ ] Query has `staleTime: 5 * 60 * 1000`
- [ ] Query has `refetchOnWindowFocus: false`
- [ ] All `console.log()` statements guarded with `if (import.meta.env.DEV)`
- [ ] Mapper functions handle all field conversions
- [ ] Components use Domain types (not API types)
- [ ] No unnecessary re-renders (use React.memo where appropriate)
- [ ] Filtered lists are memoized with `useMemo`

## Testing Strategy

### Unit Tests
- Test component rendering
- Test user interactions
- Test custom hooks
- Test utility functions

### Integration Tests
- Test API integrations
- Test database operations
- Test authentication flows
- Test role-based access

### Test Structure
```typescript
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Test implementation
  });

it('should handle user interactions', () => {
    // Test implementation
  });

});

```

## Error Handling

### Client-Side
- Use error boundaries for component errors
- Implement proper error states
- Show user-friendly error messages
- Log errors for debugging

### Server-Side (Laravel)
- Handle Laravel exceptions gracefully
- Use Laravel's exception handling and logging
- Return proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- Log errors to Laravel log files (`storage/logs/laravel.log`)
- Use Laravel's validation for request validation
- Return JSON error responses with consistent format

## Code Quality

### Linting & Formatting
- Use ESLint for code quality
- Use Prettier for code formatting
- Follow consistent code style
- Remove unused imports and variables

### Documentation
- Write clear component documentation
- Use JSDoc for complex functions
- Document API endpoints
- Keep README updated

## Git Workflow

### Commit Messages
- Use conventional commit format
- Be descriptive and clear
- Reference issues where applicable
- Keep commits atomic

### Branch Strategy
- Use feature branches for new features
- Use descriptive branch names
- Keep branches up to date
- Use pull requests for code review

## Deployment

### Environment Variables
- Use proper environment configuration
- Never commit sensitive data
- Use different configs for dev/prod
- Document required environment variables

### Build Process
- Use Vite for fast builds
- Optimize bundle size
- Implement proper caching
- Use CDN for static assets

## Common Patterns

### Data Fetching with Multi-Tenancy
```typescript
// ALWAYS use this pattern for tenant-scoped resources
export const useStudents = (params: StudentParams) => {
  const { user } = useAuth();

const { data: profile } = useProfile();

return useQuery({
    queryKey: ['students', profile?.organization_id, params],
    queryFn: async () => {
      if (!user || !profile || !profile.organization_id) return [];

/
/
Multi-tenancy: Users can only see their organization's data
      // Fetch from Laravel API (server handles organization filtering)
      return await apiClient.students.list({
        organizationId: profile.organization_id,
        ...params,
      });
    },
    enabled: !!user && !!profile && !!profile.organization_id,
  });
};
```

### Form Handling
```typescript
// React Hook Form + Zod
const form = useForm<StudentFormData>({
  resolver: zodResolver(studentSchema),
  defaultValues: {
    // Default values
  },
});
```

### Form Validation with Zod

**CRITICAL: ALL forms MUST use Zod validation with React Hook Form.**

#### Validation Schema Location
- **ALWAYS** create validation schemas in `/src/lib/validations/` directory
- **ALWAYS** export schemas and types from shared validation files
- **ALWAYS** use shared schemas across components (never duplicate schemas)
- **ALWAYS** align frontend validation with backend Laravel Form Request validation rules

#### Validation Schema Structure
```typescript
// frontend/src/lib/validations/yourResource.ts
import { z } from 'zod';
import { optionalUuidSchema, requiredStringLength, optionalStringLength } from './common';

export const yourResourceSchema = z.object({
  name: requiredStringLength(255, 'Name'),
  description: optionalStringLength(1000, 'Description'),
  organization_id: optionalUuidSchema,
  // ... other fields
});

export type YourResourceFormData = z.infer<typeof yourResourceSchema>;
```

#### Using Validation in Components
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { yourResourceSchema, type YourResourceFormData } from '@/lib/validations';

export function YourComponent() {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<YourResourceFormData>({
    resolver: zodResolver(yourResourceSchema), // REQUIRED: Always use zodResolver
    defaultValues: {
      // Default values
    },
  });

  const onSubmit = async (data: YourResourceFormData) => {
    // Handle form submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('name')} />
      {errors.name && (
        <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
      )}
      {/* ... other fields */}
    </form>
  );
}
```

#### File Upload Validation
```typescript
// Use Controller for file inputs
<Controller
  control={control}
  name="file"
  render={({ field: { onChange, value, ...field } }) => (
    <Input
      type="file"
      {...field}
      onChange={(e) => {
        const file = e.target.files?.[0];
        onChange(file);
      }}
    />
  )}
/>
{errors.file && (
  <p className="text-sm text-destructive mt-1">{errors.file.message}</p>
)}
```

#### Select/Dropdown Validation
```typescript
// Use Controller for Select components
<Controller
  control={control}
  name="fieldName"
  render={({ field }) => (
    <Select value={field.value || ''} onValueChange={field.onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {/* options */}
      </SelectContent>
    </Select>
  )}
/>
{errors.fieldName && (
  <p className="text-sm text-destructive mt-1">{errors.fieldName.message}</p>
)}
```

#### Common Validation Utilities
- **ALWAYS** use utilities from `/src/lib/validations/common.ts`:
  - `uuidSchema` - UUID validation
  - `optionalUuidSchema` - Optional UUID
  - `emailSchema` - Email validation
  - `optionalEmailSchema` - Optional email
  - `phoneSchema` - Phone number validation
  - `requiredStringLength(max, fieldName)` - Required string with max length
  - `optionalStringLength(max, fieldName)` - Optional string with max length

#### Cross-Field Validation
```typescript
// Use .refine() for cross-field validation
export const schema = z.object({
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.start_date && data.end_date) {
      return new Date(data.end_date) >= new Date(data.start_date);
    }
    return true;
  },
  {
    message: 'End date must be after or equal to start date',
    path: ['end_date'],
  }
);
```

#### File Upload Validation
```typescript
// Use fileUpload utilities for file validation
import { fileSchema, validateFile } from '@/lib/validations/fileUpload';

export const documentUploadSchema = z.object({
  file: fileSchema, // Validates file type and size
  documentType: requiredStringLength(100, 'Document type'),
  description: optionalStringLength(500, 'Description'),
});
```

#### Validation Rules
1. **ALWAYS** use `zodResolver` with React Hook Form
2. **ALWAYS** display validation errors to users
3. **ALWAYS** align frontend validation with backend Laravel Form Request rules
4. **ALWAYS** use shared validation schemas (never duplicate)
5. **ALWAYS** validate required fields, string lengths, UUIDs, emails, etc.
6. **ALWAYS** use Controller for file inputs and Select components
7. **ALWAYS** reset forms when dialogs close
8. **ALWAYS** handle optional/nullable fields correctly (use `.optional().nullable()`)

#### Backend Alignment
- Frontend validation should match or be stricter than backend validation
- Backend validation is the source of truth for security
- Frontend validation provides better UX (immediate feedback)
- Both frontend and backend must validate the same rules

#### Validation Checklist
Before submitting a form component, verify:
- [ ] Uses `zodResolver` with React Hook Form
- [ ] Validation schema is in `/src/lib/validations/`
- [ ] Schema exports both schema and TypeScript type
- [ ] All form fields have validation rules
- [ ] Error messages display for all fields
- [ ] File uploads use Controller and file validation
- [ ] Select components use Controller
- [ ] Cross-field validation implemented where needed
- [ ] Validation aligns with backend Laravel Form Request rules
- [ ] Form resets when dialog closes

### State Management
```typescript
// Local state
const [isLoading, setIsLoading] = useState(false);

// Server state
const { data, isLoading, error } = useQuery({
  queryKey: ['key'],
  queryFn: fetchFunction,
});
```

### Translation Usage
```typescript
// Always use useLanguage hook
const { t, isRTL, language } = useLanguage();

// Use translation keys
<h1>{t('students.title')}</h1>
<Button>{t('common.save')}</Button>

// Check RTL for conditional styling
<div className={isRTL ? 'text-right' : 'text-left'}>
  {t('students.searchPlaceholder')}
</div>
```

## Layout & Navigation

### Persistent Layout
- `PersistentLayout` component provides sidebar and header for all protected routes
- Sidebar persists across route changes (SPA behavior)
- Layout respects RTL direction
- Sidebar position changes based on language direction

### Sidebar Navigation
- `SmartSidebar` component handles navigation
- Navigation items are filtered by **user permissions** (NOT roles)
- All navigation items use translation keys
- Children items should have `titleKey` for translations
- Sidebar collapses/expands with icon-only mode
- **CRITICAL**: Use `useHasPermission('permission.name')` to show/hide menu items
- **CRITICAL**: The `useUserPermissions` hook must use `organization_id` (not `role`) for enabling queries

## Islamic School Specific Guidelines

### Hifz Progress
- Track Quran memorization progress
- Implement proper Arabic text handling
- Support different memorization methods
- Provide progress analytics

### Academic Calendar
- Support Islamic calendar
- Handle prayer times
- Implement holiday management
- Support different academic years

### Communication
- Support multiple languages
- Implement proper notification systems
- Handle parent-teacher communication
- Support SMS and email integration

## Performance Monitoring

### Metrics to Track
- Page load times
- API response times
- User interaction metrics
- Error rates
- Database query performance

### Optimization
- Use React DevTools Profiler
- Monitor bundle size
- Implement proper caching
- Use performance budgets

## Security Considerations

### Data Protection
- Encrypt sensitive data
- Implement proper access controls
- Use HTTPS everywhere
- Regular security audits

### User Privacy
- Follow GDPR guidelines
- Implement data retention policies
- Provide data export functionality
- Allow data deletion

## Accessibility

### WCAG Guidelines
- Use semantic HTML
- Implement proper ARIA labels
- Ensure keyboard navigation
- Provide alt text for images
- Use proper color contrast

### Testing
- Test with screen readers
- Test keyboard navigation
- Test with different zoom levels
- Test with high contrast mode

## Maintenance

### Code Reviews
- Review for security issues
- Check performance implications
- Ensure proper error handling
- Verify accessibility compliance
- Verify translations are used correctly
- Check RTL layout correctness

### Updates
- Keep dependencies updated
- Monitor security advisories
- Test updates thoroughly
- Document breaking changes

## Troubleshooting

### Common Issues
- Authentication problems
- Database connection issues
- Performance problems
- Browser compatibility
- Translation keys not found (check key spelling and language files)
- RTL layout issues (check `dir` attribute and CSS)
- **Table not found (404 errors)**: Migrations not run - run `php artisan migrate` to apply Laravel migrations
- **Bad Request (400 errors) on queries**: Check query syntax, especially nested relations and ordering

### Database Migration Errors

#### Table Not Found (500 Errors)
**Symptom**: `SQLSTATE[42P01]: Undefined table: relation "table_name" does not exist`

**Causes**:
1. **Migrations not applied**: New tables created in migration files but not run against database
2. **Table name typo**: Check spelling matches migration file exactly
3. **Schema mismatch**: Table exists in different schema (check `public` vs `auth` schema)

**Solutions**:
1. **Run migrations**: 
   ```bash
   cd backend
   php artisan migrate
   ```
2. **Verify table exists**: Check PostgreSQL directly or use `php artisan tinker`
3. **Check migration order**: Ensure migrations are numbered sequentially and dependencies are met
4. **Reset database** (development only): `php artisan migrate:fresh --seed`

#### Authentication Errors (401)
**Symptom**: `401 Unauthorized` or `Unauthenticated`

**Common Causes**:
1. **Token expired**: Sanctum token has expired
2. **Token missing**: No token in request headers
3. **Invalid token**: Token doesn't exist in database

**Solutions**:
1. **Re-authenticate**: User should log in again
2. **Check token storage**: Verify token is stored in localStorage
3. **Check API client**: Ensure ApiClient includes token in headers

#### Permission Errors (403)
**Symptom**: `403 Forbidden` or `This action is unauthorized`

**Common Causes**:
1. **Missing permission**: User doesn't have required Spatie permission
2. **Organization mismatch**: User trying to access different organization's data
3. **Role insufficient**: User role doesn't have required permissions assigned
4. **Team context not set**: `setPermissionsTeamId()` not called before permission check
5. **Frontend hook disabled**: `useUserPermissions` hook not enabled (check `organization_id` exists)

**Solutions**:
1. **Check permissions**: Verify user has required permission via Spatie in `role_has_permissions` table
2. **Check organization**: Ensure user's organization_id matches resource's organization_id
3. **Check middleware**: Verify `EnsureOrganizationAccess` middleware is applied (sets team context)
4. **Check frontend hook**: Verify `useUserPermissions` uses `organization_id` (not `role`) for `enabled` condition
5. **Check controller**: Verify controller checks permission with `hasPermissionTo('resource.action')`
6. **Check role assignment**: Verify user has role assigned via Spatie's `model_has_roles` table
7. **Check permission assignment**: Verify role has permissions in `role_has_permissions` table

### Debugging
- Use browser dev tools
- Implement proper logging
- Use React DevTools
- Monitor network requests
- Check translation keys in console: `t('key')` should return translated string
- Verify RTL: Check `document.documentElement.dir` in console
- **Check Laravel logs**: `backend/storage/logs/laravel.log` for detailed error messages
- **Verify migrations**: Run `php artisan migrate:status` to see applied migrations
- **Test API endpoints**: Use Postman, curl, or browser to test API directly
- **Laravel Tinker**: Use `php artisan tinker` to test database queries and models
- **Check API responses**: Inspect network tab in browser dev tools for API response structure

## Backend Development (Laravel)

### Laravel Structure
- **Controllers**: `backend/app/Http/Controllers/` - Handle HTTP requests
- **Models**: `backend/app/Models/` - Eloquent models for database tables
- **Migrations**: `backend/database/migrations/` - Database schema changes
- **Routes**: `backend/routes/api.php` - API route definitions
- **Middleware**: `backend/app/Http/Middleware/` - Request/response middleware
- **Seeders**: `backend/database/seeders/` - Database seeding

### Laravel Best Practices
- Use Form Requests for validation (`php artisan make:request`)
- Use Resource Controllers for CRUD operations
- Use Eloquent relationships for database queries
- Use Laravel's built-in validation rules
- Use middleware for authentication and authorization
- Use service classes for complex business logic
- Use repositories for data access abstraction (if needed)

### Database Migrations
- Always use migrations for schema changes
- Use descriptive migration names: `YYYY_MM_DD_HHMMSS_description.php`
- Include `organization_id` in tenant table migrations
- Include `school_id` in school-scoped table migrations
- Create indexes on `organization_id` for performance
- Create indexes on `school_id` for performance (for school-scoped resources)
- **REQUIRED: ALWAYS use UUIDs for primary keys**
  ```php
  $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
  ```
- **REQUIRED: For Laravel migrations, use PostgreSQL's gen_random_uuid() function**
- **REQUIRED: Configure corresponding Eloquent model with UUID support** (see UUID Primary Keys section above)

### API Response Format
```php
// Success response
return response()->json([
    'data' => $resource,
    'message' => 'Operation successful'
], 200);

// Error response
return response()->json([
    'error' => 'Error message',
    'details' => $validationErrors // if validation errors
], 400);
```

### Authentication Middleware
- Use `auth:sanctum` middleware for protected routes
- Use `EnsureOrganizationAccess` middleware for organization-scoped routes
- Use `school.context` middleware for school-scoped routes (injects `current_school_id` into request)
- Validate organization_id in controllers, not just middleware
- **CRITICAL: Always use `getCurrentSchoolId($request)` in controllers - NEVER trust client-provided `school_id`**

### Permission Checking (Spatie)

**CRITICAL: All controllers MUST check CRUD permissions (create, read, update, delete) for their resources.**

#### Standard Controller Permission Check Pattern
```php
public function index(Request $request)
{
    $user = $request->user();
    $profile = DB::table('profiles')->where('id', $user->id)->first();

    if (!$profile) {
        return response()->json(['error' => 'Profile not found'], 404);
    }

    // Require organization_id for all users
    if (!$profile->organization_id) {
        return response()->json(['error' => 'User must be assigned to an organization'], 403);
    }

    // Check permission WITH organization context
    // CRITICAL: setPermissionsTeamId() is called in EnsureOrganizationAccess middleware
    // So we don't need to pass organization_id as second parameter
    try {
        if (!$user->hasPermissionTo('your_resource.read')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }
    } catch (\Exception $e) {
        \Log::warning("Permission check failed for your_resource.read: " . $e->getMessage());
        return response()->json(['error' => 'This action is unauthorized'], 403);
    }

    // CRITICAL: Get current school from middleware context (NEVER trust client-provided school_id)
    $currentSchoolId = $this->getCurrentSchoolId($request);

    // Filter by both organization_id AND school_id
    $query = YourModel::whereNull('deleted_at')
        ->where('organization_id', $profile->organization_id)
        ->where('school_id', $currentSchoolId);

    // ... rest of controller logic
}
```

#### Required Permission Checks for All Controllers
**ALWAYS check permissions for ALL CRUD operations:**
- `index()` / `show()` → Check `{resource}.read`
- `store()` → Check `{resource}.create`
- `update()` → Check `{resource}.update`
- `destroy()` → Check `{resource}.delete`
- Custom actions → Check `{resource}.{action}` (e.g., `classes.assign`, `classes.copy`)

#### Deletion Pattern (CRITICAL)

**CRITICAL: ALL delete operations MUST follow this pattern for proper UI updates and error handling.**

##### Backend Controller `destroy()` Method Pattern

**ALWAYS use this pattern for delete operations:**

```php
public function destroy(string $id)
{
    $user = request()->user();
    $profile = DB::table('profiles')->where('id', $user->id)->first();

    if (!$profile) {
        return response()->json(['error' => 'Profile not found'], 404);
    }

    $resource = YourModel::whereNull('deleted_at')->find($id);

    if (!$resource) {
        return response()->json(['error' => 'Resource not found'], 404);
    }

    // Require organization_id for all users
    if (!$profile->organization_id) {
        return response()->json(['error' => 'User must be assigned to an organization'], 403);
    }

    // Check permission WITH organization context
    try {
        if (!$user->hasPermissionTo('your_resource.delete')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }
    } catch (\Exception $e) {
        \Log::warning("Permission check failed for your_resource.delete: " . $e->getMessage());
        return response()->json(['error' => 'This action is unauthorized'], 403);
    }

    // Get accessible organization IDs (user's organization only)
    $orgIds = [$profile->organization_id];

    // Check organization access
    // If resource is organization-specific, user can only delete resources from their organization
    // If resource is global (organization_id = NULL), user with delete permission can delete it
    if ($resource->organization_id !== null && !in_array($resource->organization_id, $orgIds)) {
        return response()->json(['error' => 'Cannot delete resource from different organization'], 403);
    }

    // Check if resource is in use (if applicable)
    // Example: Check if residency type is used by student_admissions
    $inUse = DB::table('related_table')
        ->where('resource_id', $id)
        ->whereNull('deleted_at')
        ->exists();

    if ($inUse) {
        return response()->json(['error' => 'This resource is in use and cannot be deleted'], 409);
    }

    // Soft delete
    $resource->delete();

    // CRITICAL: Return 204 No Content with NO body (not JSON)
    return response()->noContent();
}
```

**Key Points:**
- ✅ **ALWAYS** return `response()->noContent()` for successful deletions (204 status, no body)
- ❌ **NEVER** return `response()->json(['message' => '...'], 204)` (204 should have no body)
- ✅ **ALWAYS** check permissions before deletion
- ✅ **ALWAYS** validate organization access
- ✅ **ALWAYS** check if resource is in use before deletion (if applicable)
- ✅ **ALWAYS** use soft delete (`$resource->delete()`) unless hard delete is explicitly required

##### Frontend API Client Pattern

**CRITICAL: The API client MUST handle 204 No Content responses correctly:**

```typescript
// In frontend/src/lib/api/client.ts - request() method
async request<T>(endpoint: string, options: RequestOptions): Promise<T> {
  // ... existing code ...

  if (!response.ok) {
    // ... error handling ...
  }

  // Handle 204 No Content responses (no body)
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}
```

**Key Points:**
- ✅ **ALWAYS** check for `response.status === 204` before calling `response.json()`
- ✅ **ALWAYS** return `null` for 204 responses (no body to parse)
- ❌ **NEVER** try to parse JSON from a 204 response (will cause errors)

##### Frontend Delete Hook Pattern

**CRITICAL: ALL delete hooks MUST use this pattern for immediate UI updates:**

```typescript
export const useDeleteYourResource = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Delete resource via Laravel API (soft delete)
      // Backend handles all validation: permission check, organization access, and "in use" check
      await yourResourceApi.delete(id);
    },
    onSuccess: async () => {
      // CRITICAL: Use both invalidateQueries AND refetchQueries for immediate UI updates
      await queryClient.invalidateQueries({ queryKey: ['your-resources'] });
      await queryClient.refetchQueries({ queryKey: ['your-resources'] });
      toast.success('Resource deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete resource');
    },
  });
};
```

**Key Points:**
- ✅ **ALWAYS** use `async` for `onSuccess` callback
- ✅ **ALWAYS** use both `invalidateQueries` AND `refetchQueries` for immediate UI updates
- ✅ **ALWAYS** await both operations to ensure they complete
- ❌ **NEVER** only use `invalidateQueries` (UI won't update until next refetch)
- ❌ **NEVER** fetch the resource before deleting (backend handles all validation)
- ✅ **ALWAYS** let the backend handle validation (permission, organization access, "in use" check)

##### Why This Pattern is Critical

**Without proper deletion pattern:**
- ❌ Frontend shows 404 errors even when delete succeeds
- ❌ UI doesn't update until page refresh
- ❌ Users see stale data after deletion
- ❌ Poor user experience

**With proper deletion pattern:**
- ✅ Backend returns proper 204 No Content (no body)
- ✅ Frontend handles 204 correctly (returns null, no JSON parsing)
- ✅ UI updates immediately after deletion
- ✅ No errors, smooth user experience

#### Middleware Organization Context
**CRITICAL: The `EnsureOrganizationAccess` middleware sets Spatie's team context globally:**
```php
// In EnsureOrganizationAccess middleware
$user->setPermissionsTeamId($profile->organization_id);
```

This means in controllers, you can call `hasPermissionTo()` without passing the organization_id:
```php
// ✅ CORRECT: Organization context is set by middleware
if (!$user->hasPermissionTo('classes.read')) {
    abort(403, 'Unauthorized');
}

// ❌ WRONG: Don't pass organization_id (it's set globally by middleware)
if (!$user->hasPermissionTo('classes.read', $organizationId)) {
    abort(403, 'Unauthorized');
}
```

#### Permission Check Pattern for All Controllers
```php
// Standard pattern for ALL controller methods
$user = $request->user();
$profile = DB::table('profiles')->where('id', $user->id)->first();

if (!$profile) {
    return response()->json(['error' => 'Profile not found'], 404);
}

if (!$profile->organization_id) {
    return response()->json(['error' => 'User must be assigned to an organization'], 403);
}

try {
    if (!$user->hasPermissionTo('resource.action')) {
        return response()->json(['error' => 'This action is unauthorized'], 403);
    }
} catch (\Exception $e) {
    \Log::warning("Permission check failed for resource.action: " . $e->getMessage());
    return response()->json(['error' => 'This action is unauthorized'], 403);
}
```

#### Deprecated: profiles.role Column
**CRITICAL: The `profiles.role` column is DEPRECATED.**
- ❌ **DO NOT** use `profile->role` for permission checks
- ❌ **DO NOT** use `profile?.role` in frontend hooks
- ✅ **DO** use `organization_id` for permission query enabling
- ✅ **DO** use Spatie's `model_has_roles` table for role management
- ✅ **DO** use `hasPermissionTo()` for permission checks (not role checks)

#### Getting User Permissions (Backend)
```php
// Get user's organization_id from profile
$profile = DB::table('profiles')->where('id', $user->id)->first();
$organizationId = $profile->organization_id;

// Validate user has organization
if (!$organizationId) {
    abort(403, 'User must be assigned to an organization');
}

// CRITICAL: Set the organization context for Spatie teams feature
// This is done in EnsureOrganizationAccess middleware, but can be done manually if needed
$user->setPermissionsTeamId($organizationId);

// Check permission (organization context is set globally by middleware)
if (!$user->hasPermissionTo('classes.read')) {
    abort(403, 'Unauthorized');
}

// Get all permissions (automatically scoped to user's organization by Spatie)
$permissions = $user->getAllPermissions();
```

## Reporting System & Branding

**CRITICAL: The application uses a unified PDF and Excel report generation system with branding, templates, watermarks, and calendar support.**

### Overview

The reporting system provides:
- **PDF and Excel report generation** with async processing
- **School branding integration** (logos, colors, fonts, watermarks)
- **Multi-calendar support** (Gregorian, Jalali/Shamsi, Qamari/Hijri Qamari)
- **Multi-language support** (Farsi, Pashto, Arabic, English)
- **Template auto-selection** based on column count
- **Custom ReportTemplates** for per-report-type customization

### Report Acceptance Criteria

**CRITICAL: ALL reports MUST meet these acceptance criteria before being considered complete.**

#### General Requirements
- ✅ **Exports match the on-screen filters**: Reports must include only the data that matches the current filter state visible to the user
- ✅ **RTL text never breaks**: Pashto/Arabic/Farsi text must display correctly with proper alignment and no text wrapping issues
- ✅ **RTL alignment correct**: Right-to-left languages must be properly aligned (right-aligned text, proper column ordering)

#### PDF Report Requirements
- ✅ **Title**: Report must include a clear, descriptive title
- ✅ **Organization/School name**: Must display the organization name and/or school name
- ✅ **Date range**: Must show the date range of the data (if applicable) or generation date
- ✅ **Page numbers**: Must include page numbers (e.g., "Page 1 of 5") on all pages
- ✅ **Filter summary**: Should include a summary of active filters (optional but recommended)

#### Excel Report Requirements
- ✅ **Title row**: First row must contain the report title (merged cells across all columns)
- ✅ **Column headings**: Second row must contain clear column headers matching the data columns
- ✅ **Totals row** (where applicable): Last row before data ends must show totals for numeric columns (e.g., sum, count, average)
- ✅ **Filter summary**: Should include a summary of active filters in a separate row or sheet (optional but recommended)

#### RTL Text Handling

**CRITICAL: RTL languages (Pashto, Arabic, Farsi) require special handling to prevent text breaking and alignment issues.**

##### PDF RTL Requirements
- ✅ **Text direction**: RTL text must use proper `dir="rtl"` attribute in HTML
- ✅ **Font support**: Must use fonts that support RTL characters (e.g., Noto Sans Arabic, Tahoma)
- ✅ **Column alignment**: RTL text columns must be right-aligned
- ✅ **No text wrapping**: Long RTL text should not break mid-word; use proper line breaks or column width adjustments
- ✅ **Bidi algorithm**: Must respect bidirectional text algorithm for mixed LTR/RTL content

##### Excel RTL Requirements
- ✅ **Cell alignment**: RTL text cells must be right-aligned (`setAlignment('right')`)
- ✅ **Column width**: Columns with RTL text must have sufficient width to prevent text wrapping
- ✅ **Font support**: Must use fonts that support RTL characters
- ✅ **Text direction**: Excel cells should respect RTL text direction (handled by PhpSpreadsheet automatically for RTL fonts)
- ✅ **No text truncation**: Ensure column widths accommodate full RTL text without truncation

##### Implementation Pattern for RTL

```php
// In ExcelReportService - RTL column width calculation
private function calculateColumnWidth($sheet, string $colLetter, int $startRow, int $endRow): float
{
    $maxWidth = 0;
    $defaultFontSize = $this->parseFontSize($sheet->getStyle("{$colLetter}{$startRow}")->getFont()->getSize() ?? 12);
    
    for ($row = $startRow; $row <= $endRow; $row++) {
        $cell = $sheet->getCell("{$colLetter}{$row}");
        $value = $cell->getValue();
        
        if ($value !== null && $value !== '') {
            $text = (string) $value;
            $charCount = mb_strlen($text, 'UTF-8');
            $cellFontSize = $this->parseFontSize($sheet->getStyle("{$colLetter}{$row}")->getFont()->getSize() ?? $defaultFontSize);
            
            // Check for RTL characters
            $hasRTL = preg_match('/[\x{0600}-\x{06FF}\x{0750}-\x{077F}\x{08A0}-\x{08FF}\x{FB50}-\x{FDFF}\x{FE70}-\x{FEFF}]/u', $text);
            $rtlFactor = $hasRTL ? 1.5 : 1.0; // RTL characters are ~50% wider
            
            $width = $charCount * ($cellFontSize / 11.0) * $rtlFactor;
            $maxWidth = max($maxWidth, $width);
        }
    }
    return $maxWidth;
}

// Set RTL alignment for cells with RTL text
if ($hasRTL) {
    $sheet->getStyle("{$colLetter}{$row}")->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_RIGHT);
}
```

```html
<!-- In PDF Blade templates - RTL support -->
<div dir="rtl" lang="ar" style="font-family: 'Noto Sans Arabic', Tahoma, sans-serif;">
    <table style="direction: rtl; text-align: right;">
        <tr>
            <td style="text-align: right;">{{ $rtlText }}</td>
        </tr>
    </table>
</div>
```

#### Report Validation Checklist

Before marking a report feature as complete, verify:

**General:**
- [ ] Exports match on-screen filters exactly
- [ ] RTL text displays correctly without breaking
- [ ] RTL alignment is correct (right-aligned for RTL languages)
- [ ] Mixed LTR/RTL content handles correctly

**PDF:**
- [ ] Title is present and clear
- [ ] Organization/school name is displayed
- [ ] Date range or generation date is shown
- [ ] Page numbers are present on all pages
- [ ] Filter summary is included (if applicable)

**Excel:**
- [ ] Title row is present (merged across columns)
- [ ] Column headings are clear and match data
- [ ] Totals row is present for numeric columns (where applicable)
- [ ] Filter summary is included (if applicable)
- [ ] RTL text columns are right-aligned
- [ ] Column widths accommodate RTL text without wrapping

### Database Tables

| Table | Description |
|-------|-------------|
| `school_branding` | Main branding settings (logos stored as binary, colors, fonts) |
| `branding_layouts` | Page layout configurations (A4 Portrait, A4 Landscape, A3 Landscape) |
| `branding_notes` | Header/body/footer notes |
| `branding_watermarks` | Text/image watermarks |
| `report_templates` | Custom report templates per report type |
| `report_runs` | Report generation history/logging |

### School Branding - Logo Storage

**CRITICAL: Logos are stored as BINARY data (BYTEA) in PostgreSQL, NOT as file paths.**

#### Logo Storage Structure

The `school_branding` table stores three logos as binary data:

```php
// Primary Logo
$table->binary('primary_logo_binary')->nullable();        // BYTEA in PostgreSQL
$table->string('primary_logo_mime_type', 100)->nullable(); // e.g., 'image/png'
$table->string('primary_logo_filename', 255)->nullable();  // Original filename
$table->integer('primary_logo_size')->nullable();           // File size in bytes

// Secondary Logo (same structure)
$table->binary('secondary_logo_binary')->nullable();
$table->string('secondary_logo_mime_type', 100)->nullable();
$table->string('secondary_logo_filename', 255)->nullable();
$table->integer('secondary_logo_size')->nullable();

// Ministry Logo (same structure)
$table->binary('ministry_logo_binary')->nullable();
$table->string('ministry_logo_mime_type', 100)->nullable();
$table->string('ministry_logo_filename', 255)->nullable();
$table->integer('ministry_logo_size')->nullable();
```

#### Logo Usage in Reports

**CRITICAL: Always use binary logos first, fallback to file paths if needed.**

```php
// ✅ CORRECT: Use binary logo with base64 encoding
if ($branding->primary_logo_binary && $branding->primary_logo_mime_type) {
    $logoData = base64_encode($branding->primary_logo_binary);
    $mimeType = $branding->primary_logo_mime_type;
    return '<img src="data:' . htmlspecialchars($mimeType) . ';base64,' . $logoData . '" ...>';
}

// Fallback to file path (legacy support)
if ($branding->logo_path && Storage::exists($branding->logo_path)) {
    $logoData = base64_encode(Storage::get($branding->logo_path));
    $mimeType = $this->guessMimeType($branding->logo_path);
    return '<img src="data:' . htmlspecialchars($mimeType) . ';base64,' . $logoData . '" ...>';
}
```

#### Logo Upload Pattern

**When uploading logos to school_branding:**

```php
// Store logo as binary
$branding->primary_logo_binary = file_get_contents($uploadedFile->getRealPath());
$branding->primary_logo_mime_type = $uploadedFile->getMimeType();
$branding->primary_logo_filename = $uploadedFile->getClientOriginalName();
$branding->primary_logo_size = $uploadedFile->getSize();
$branding->save();
```

**Key Rules:**
- ✅ **ALWAYS** store logos as binary data in database
- ✅ **ALWAYS** store MIME type, filename, and size for metadata
- ✅ **ALWAYS** use base64 encoding when embedding in HTML (data URIs)
- ✅ **ALWAYS** check binary exists before using file path fallback
- ❌ **NEVER** store only file paths (use binary storage)
- ❌ **NEVER** store logos in public storage without binary backup

### Backend Report Generation

#### ReportService Usage Pattern

**CRITICAL: Always use ReportService for generating reports. Never generate PDFs/Excel directly.**

```php
use App\Services\Reports\ReportService;
use App\Services\Reports\ReportConfig;

// Inject the service
public function __construct(private ReportService $reportService) {}

// Generate a report
public function generateStudentReport(Request $request)
{
    $user = $request->user();
    $profile = DB::table('profiles')->where('id', $user->id)->first();
    
    if (!$profile || !$profile->organization_id) {
        return response()->json(['error' => 'User must be assigned to an organization'], 403);
    }

    // Check permission
    try {
        if (!$user->hasPermissionTo('reports.generate')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }
    } catch (\Exception $e) {
        \Log::warning("Permission check failed for reports.generate: " . $e->getMessage());
        return response()->json(['error' => 'This action is unauthorized'], 403);
    }

    // Create report config
    $config = ReportConfig::fromArray([
        'report_key' => 'student_list',
        'report_type' => 'pdf',  // or 'excel'
        'branding_id' => $request->branding_id,
        'report_template_id' => $request->template_id, // optional
        'title' => 'Student List Report',
        'calendar_preference' => $request->calendar_preference ?? 'jalali', // 'gregorian', 'jalali', 'qamari'
        'language' => $request->language ?? 'ps', // 'fa', 'ps', 'ar', 'en'
    ]);

    // Prepare data
    $data = [
        'columns' => [
            ['key' => 'name', 'label' => 'نوم'],
            ['key' => 'class', 'label' => 'صنف'],
            ['key' => 'enrollment_date', 'label' => 'د شمولیت نیټه'],
        ],
        'rows' => [
            ['name' => 'احمد', 'class' => '10A', 'enrollment_date' => '2024-01-15'],
            ['name' => 'محمد', 'class' => '10B', 'enrollment_date' => '2024-02-20'],
        ],
    ];

    // Format dates using DateConversionService
    $dateService = app(\App\Services\Reports\DateConversionService::class);
    foreach ($data['rows'] as &$row) {
        if (!empty($row['enrollment_date'])) {
            $row['enrollment_date'] = $dateService->formatDate(
                $row['enrollment_date'],
                $config->calendar_preference,
                'full',
                $config->language
            );
        }
    }

    // Generate report (async by default)
    $reportRun = $this->reportService->generateReport(
        $config, 
        $data, 
        $profile->organization_id
    );

    return response()->json([
        'id' => $reportRun->id,
        'status' => $reportRun->status,
        'message' => 'Report generation started',
    ], 202);
}
```

#### ReportConfig Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `report_key` | string | required | Unique identifier for report type |
| `report_type` | string | `'pdf'` | `'pdf'` or `'excel'` |
| `branding_id` | string | null | School branding UUID |
| `layout_id` | string | null | Specific layout UUID |
| `report_template_id` | string | null | ReportTemplate UUID for custom header/footer |
| `template_name` | string | null | Blade template name (auto-selected if null) |
| `title` | string | `''` | Report title |
| `watermark_mode` | string | `'default'` | `'default'`, `'pick'`, `'none'` |
| `notes_mode` | string | `'defaults'` | `'defaults'`, `'custom'`, `'none'` |
| `calendar_preference` | string | `'jalali'` | `'gregorian'`, `'jalali'`, `'qamari'` |
| `language` | string | `'fa'` | `'fa'`, `'ps'`, `'ar'`, `'en'` |

#### Calendar Preferences in Reports

| Value | Description | Example Output |
|-------|-------------|----------------|
| `gregorian` | Western calendar | `December 24, 2024` |
| `jalali` / `shamsi` | Solar Hijri (Afghan/Iranian) | `۴ جدی ۱۴۰۳` |
| `qamari` / `hijri_qamari` | Lunar Hijri (Islamic) | `۲۲ جمادی الثانی ۱۴۴۶ هـ` |

#### Template Auto-Selection

**CRITICAL: Templates are automatically selected based on column count. Don't manually specify unless necessary.**

| Columns | Template | Page Size |
|---------|----------|-----------|
| 1-6 | `table_a4_portrait` | A4 Portrait |
| 7-13 | `table_a4_landscape` | A4 Landscape |
| 14+ | `table_a3_landscape` | A3 Landscape |

#### Date Formatting in Reports

**CRITICAL: Always use DateConversionService for formatting dates in report data.**

```php
use App\Services\Reports\DateConversionService;

$dateService = app(DateConversionService::class);

foreach ($rows as &$row) {
    if (!empty($row['enrollment_date'])) {
        $row['enrollment_date'] = $dateService->formatDate(
            $row['enrollment_date'],      // Date string (YYYY-MM-DD)
            'jalali',                      // Calendar preference
            'full',                        // Format: 'full', 'numeric', 'short'
            'ps'                           // Language: 'fa', 'ps', 'ar', 'en'
        );
    }
}
```

**Available date variables in Blade templates:**
- `CURRENT_DATE` - Full formatted date (e.g., `۴ جدی ۱۴۰۳`)
- `CURRENT_DATE_NUMERIC` - Numeric format (e.g., `۱۴۰۳/۱۰/۰۴`)
- `CURRENT_DATE_SHORT` - Short format (e.g., `۴ جدی ۱۴۰۳`)
- `CURRENT_DATE_GREGORIAN` - Always Gregorian (e.g., `2024-12-24`)
- `CURRENT_DATETIME` - Date + Time (e.g., `۴ جدی ۱۴۰۳ 14:30`)

### Frontend Report Generation

#### useServerReport Hook Pattern

**CRITICAL: Always use the useServerReport hook for generating reports from the frontend.**

```typescript
import { useServerReport } from '@/hooks/useServerReport';

function MyReportComponent() {
  const { generateReport, status, progress, downloadUrl, isGenerating, error } = useServerReport();

  const handleGenerate = async () => {
    try {
      await generateReport({
        report_key: 'student_list',
        report_type: 'pdf',
        branding_id: selectedBrandingId,
        report_template_id: selectedTemplateId, // optional
        title: 'Student Report',
        calendar_preference: 'jalali', // 'gregorian', 'jalali', 'qamari'
        language: 'ps', // 'fa', 'ps', 'ar', 'en'
        async: true, // Generate asynchronously
        data: {
          columns: [
            { key: 'name', label: 'نوم' },
            { key: 'class', label: 'صنف' },
            { key: 'enrollment_date', label: 'د شمولیت نیټه' },
          ],
          rows: [
            { name: 'احمد', class: '10A', enrollment_date: '2024-01-15' },
            { name: 'محمد', class: '10B', enrollment_date: '2024-02-20' },
          ],
        },
      });
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  return (
    <div>
      <Button onClick={handleGenerate} disabled={isGenerating}>
        Generate Report
      </Button>
      {isGenerating && (
        <div>
          <p>Status: {status}</p>
          <p>Progress: {progress}%</p>
        </div>
      )}
      {downloadUrl && (
        <a href={downloadUrl} download>
          Download Report
        </a>
      )}
      {error && <p className="text-destructive">{error}</p>}
    </div>
  );
}
```

#### ReportProgressDialog Component

**For better UX, use the ReportProgressDialog component:**

```typescript
import { ReportProgressDialog } from '@/components/reports/ReportProgressDialog';
import { useServerReport } from '@/hooks/useServerReport';

function MyReportComponent() {
  const { generateReport, status, progress, downloadUrl, isGenerating } = useServerReport();
  const [showProgress, setShowProgress] = useState(false);

  const handleGenerate = async () => {
    setShowProgress(true);
    await generateReport({ /* config */ });
  };

  return (
    <>
      <Button onClick={handleGenerate} disabled={isGenerating}>
        Generate Report
      </Button>
      <ReportProgressDialog
        open={showProgress}
        onOpenChange={setShowProgress}
        status={status}
        progress={progress}
        downloadUrl={downloadUrl}
      />
    </>
  );
}
```

### ReportTemplate System

**ReportTemplates allow users to customize report appearance per report type.**

#### Using ReportTemplates

```php
// In controller
$config = ReportConfig::fromArray([
    'report_key' => 'attendance_report',
    'report_template_id' => $templateId, // UUID from report_templates table
    'branding_id' => $brandingId,
    // ... other config
]);
```

#### ReportTemplate Overrides

ReportTemplates can override:
- Header/Footer HTML
- Header/Footer text
- Logo selection (primary, secondary, ministry, all, none)
- Show page numbers
- Show generation date
- Table alternating colors
- Font size

**Key Rules:**
- ✅ **ALWAYS** check if ReportTemplate exists before using
- ✅ **ALWAYS** validate ReportTemplate belongs to user's organization
- ✅ **ALWAYS** use ReportTemplate overrides when provided
- ❌ **NEVER** bypass ReportTemplate settings if template_id is provided

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reports/generate` | Generate a new report |
| GET | `/api/reports/{id}/status` | Check report generation status |
| GET | `/api/reports/{id}/download` | Download completed report |
| GET | `/api/reports` | List all reports |
| DELETE | `/api/reports/{id}` | Delete a report |

### Cleanup Old Reports

**CRITICAL: Reports are stored on disk. Clean up old reports regularly to prevent disk space issues.**

#### Via Artisan Command

```bash
# Delete reports older than 7 days (default)
php artisan reports:cleanup

# Delete reports older than 30 days
php artisan reports:cleanup --days=30

# Dry run (show what would be deleted)
php artisan reports:cleanup --dry-run

# Only delete failed reports
php artisan reports:cleanup --status=failed
```

#### Via Code

```php
$reportService->cleanupOldReports(7); // Delete reports older than 7 days
```

### Best Practices

#### Backend Report Generation

1. **ALWAYS** use `ReportService` (never generate PDFs/Excel directly)
2. **ALWAYS** format dates using `DateConversionService` before passing to report
3. **ALWAYS** use async generation for large reports (`async: true`)
4. **ALWAYS** validate `branding_id` belongs to user's organization
5. **ALWAYS** check permissions before generating reports
6. **ALWAYS** let template auto-selection work (don't override unless necessary)
7. **ALWAYS** use binary logos from `school_branding` table

#### Frontend Report Generation

1. **ALWAYS** use `useServerReport` hook
2. **ALWAYS** show progress dialog for async reports
3. **ALWAYS** handle errors gracefully
4. **ALWAYS** provide download link when report is ready
5. **ALWAYS** use proper calendar preference from user settings
6. **ALWAYS** use proper language from user settings

#### Logo Storage

1. **ALWAYS** store logos as binary data in database
2. **ALWAYS** store MIME type, filename, and size metadata
3. **ALWAYS** use base64 encoding for data URIs in HTML
4. **ALWAYS** check binary exists before using file path fallback
5. **NEVER** store only file paths (use binary storage)
6. **NEVER** store logos in public storage without binary backup

### File Structure

```
backend/
├── app/
│   ├── Http/Controllers/
│   │   └── ReportGenerationController.php
│   ├── Jobs/
│   │   └── GenerateReportJob.php
│   ├── Models/
│   │   ├── BrandingLayout.php
│   │   ├── BrandingNote.php
│   │   ├── BrandingWatermark.php
│   │   ├── ReportRun.php
│   │   ├── ReportTemplate.php
│   │   └── SchoolBranding.php
│   ├── Services/Reports/
│   │   ├── BrandingCacheService.php
│   │   ├── DateConversionService.php
│   │   ├── ExcelReportService.php
│   │   ├── PdfReportService.php
│   │   ├── ReportConfig.php
│   │   └── ReportService.php
│   └── Console/Commands/
│       └── CleanupOldReports.php
└── resources/views/reports/
    ├── base.blade.php
    ├── table_a4_portrait.blade.php
    ├── table_a4_landscape.blade.php
    └── table_a3_landscape.blade.php

frontend/
├── src/
│   ├── hooks/
│   │   └── useServerReport.ts
│   ├── components/reports/
│   │   └── ReportProgressDialog.tsx
│   └── lib/reporting/
│       ├── serverReportTypes.ts
│       └── index.ts
```

### Dependencies

- **PhpSpreadsheet**: For Excel generation (already installed)
- **Browsershot**: For PDF generation (requires Node.js/Puppeteer)
- **Queue System**: For async report processing (requires `php artisan queue:work`)

### Setup Checklist

1. **Run migrations:**
   ```bash
   php artisan migrate
   ```

2. **Install PhpSpreadsheet** (if not already installed):
   ```bash
   composer install
   ```

3. **Ensure Browsershot requirements** (for PDF):
   - Node.js installed
   - Puppeteer/Chrome available

4. **Configure queue worker** (for async reports):
   ```bash
   php artisan queue:work
   ```

## Platform Admin Application

**CRITICAL: The Platform Admin app is a separate application from the main Nazim app, designed for platform administrators who manage the entire platform. Platform admins are NOT tied to any organization.**

### Overview

The Platform Admin app provides:
- **Separate login page** (`/platform/login`)
- **Separate routes** (`/platform/*`)
- **Separate hooks** (platform admin hooks)
- **Separate API endpoints** (`/platform/*`)
- **No organization requirement** (platform admins are global)
- **Global permissions** (`subscription.admin` with `organization_id = NULL`)
- **Complete platform management** (all organizations, subscriptions, plans, payments, renewals, discount codes)

### Platform Admin Permission System

**CRITICAL: Platform admin uses GLOBAL permissions, NOT organization-scoped permissions.**

#### Permission Requirements

- **`subscription.admin` permission**: REQUIRED for all platform admin access
- **Global permission only**: `organization_id = NULL` (NOT organization-scoped)
- **Cannot be assigned to organization roles**: This permission is excluded from organization role assignments
- **Direct assignment only**: Must be assigned directly to users via `model_has_permissions` table

#### Permission Assignment Pattern

```php
// In Laravel Tinker or seeder
$user = \App\Models\User::where('email', 'admin@example.com')->first();

// Get or create the global subscription.admin permission
$permission = \App\Models\Permission::firstOrCreate(
    [
        'name' => 'subscription.admin',
        'guard_name' => 'web',
        'organization_id' => null,  // CRITICAL: NULL = Global
    ],
    [
        'resource' => 'subscription',
        'action' => 'admin',
        'description' => 'Platform administration access',
    ]
);

// Assign permission directly to user (global)
$user->givePermissionTo($permission);
```

### Platform Admin File Structure

```
frontend/src/
├── platform/
│   ├── App.tsx                          # Platform admin app entry point
│   ├── pages/
│   │   ├── PlatformAdminLogin.tsx       # Dedicated login page
│   │   ├── PlatformAdminDashboard.tsx  # Main dashboard
│   │   ├── PlatformOrganizationsManagement.tsx
│   │   ├── PlatformOrganizationAdminsManagement.tsx
│   │   ├── PlatformSubscriptionPlansManagement.tsx
│   │   ├── PlatformSubscriptionsManagement.tsx
│   │   ├── PlatformPendingActionsPage.tsx
│   │   ├── PlatformDiscountCodesManagement.tsx
│   │   └── PlatformRenewalReviewPage.tsx
│   ├── components/
│   │   └── PlatformAdminLayout.tsx     # Layout with sidebar
│   ├── hooks/
│   │   ├── usePlatformAdmin.tsx         # Platform admin data hooks
│   │   ├── usePlatformAdminComplete.tsx # Extended hooks
│   │   └── usePlatformAdminPermissions.tsx # Permission checking
│   └── lib/
│       └── platformApi.ts              # Platform admin API client
└── components/
    └── PlatformAdminRoute.tsx           # Route guard component
```

### Platform Admin Routes

#### Frontend Routes

All platform admin routes are prefixed with `/platform/*`:

- `/platform/login` - Platform admin login
- `/platform/dashboard` - Platform overview
- `/platform/organizations` - Manage all organizations
- `/platform/organizations/:organizationId` - Organization subscription details
- `/platform/admins` - View organization administrators
- `/platform/subscriptions` - Manage subscriptions
- `/platform/plans` - Manage subscription plans
- `/platform/pending` - Review pending payments & renewals
- `/platform/renewals/:renewalId` - Review specific renewal
- `/platform/discount-codes` - Manage discount codes
- `/platform/settings` - Platform settings
- `/platform/help-center` - Help center management

### Creating Platform Management Pages

**CRITICAL: When creating a new platform management page, you MUST follow these steps to ensure it renders correctly and triggers queries.**

#### Step 1: Create the Component

Create your component in `frontend/src/platform/pages/admin/YourManagementPage.tsx`:

```typescript
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/useLanguage';
import { platformApi } from '@/platform/lib/platformApi';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { RefreshCw } from 'lucide-react';

export default function YourManagementPage() {
  const { t } = useLanguage();
  
  // Use platform admin permissions directly (like PlansManagement and PlatformSettings)
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdminPermission = Array.isArray(permissions) && permissions.includes('subscription.admin');

  // Your data queries - only fetch when permissions are confirmed
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['platform-your-resource'],
    enabled: !permissionsLoading && hasAdminPermission, // CRITICAL: Only fetch when permissions confirmed
    queryFn: async () => {
      const response = await platformApi.yourResource.list();
      return Array.isArray(response) ? response : (response?.data || []);
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Show loading while permissions are loading
  if (permissionsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Access control - redirect if no permission (match PlansManagement pattern)
  if (!hasAdminPermission) {
    return <Navigate to="/platform/dashboard" replace />;
  }

  // Your component JSX
  return (
    <div className="space-y-6 p-6">
      {/* Your content */}
    </div>
  );
}
```

#### Step 2: Add to LazyComponents.tsx

**CRITICAL: You MUST add your component to `frontend/src/components/LazyComponents.tsx` for lazy loading:**

```typescript
// In frontend/src/components/LazyComponents.tsx
export const YourManagementPage = lazy(() => import('@/platform/pages/admin/YourManagementPage').then(module => ({ default: module.default })));
```

**Key Points:**
- ✅ **ALWAYS** use `lazy()` for code splitting
- ✅ **ALWAYS** use `.then(module => ({ default: module.default }))` for default exports
- ✅ **ALWAYS** place it in the "Subscription admin pages" section

#### Step 3: Add Route to platform/App.tsx

**CRITICAL: You MUST add your route to `frontend/src/platform/App.tsx`:**

```typescript
// In frontend/src/platform/App.tsx
import YourManagementPage from './pages/admin/YourManagementPage';

// Inside the <Route path="/platform" element={<ProtectedPlatformLayout />}> block:
<Route path="your-resource" element={<YourManagementPage />} />
```

**Key Points:**
- ✅ **ALWAYS** import directly from the file (not from LazyComponents in platform App.tsx)
- ✅ **ALWAYS** place routes in the correct order (specific routes before wildcard)
- ✅ **ALWAYS** use kebab-case for route paths (e.g., `your-resource`, not `yourResource`)

#### Step 4: Add Platform API Endpoints

**CRITICAL: You MUST add your API endpoints to `frontend/src/platform/lib/platformApi.ts`:**

```typescript
// In frontend/src/platform/lib/platformApi.ts
export const platformApi = {
  // ... existing methods ...
  yourResource: {
    list: async (params?: YourResourceParams) => {
      return apiClient.get<YourResourceApi.YourResource[] | { data: YourResourceApi.YourResource[] }>('/platform/your-resource', params);
    },
    get: async (id: string) => {
      return apiClient.get<{ data: YourResourceApi.YourResource }>(`/platform/your-resource/${id}`);
    },
    create: async (data: YourResourceApi.YourResourceInsert) => {
      return apiClient.post<{ data: YourResourceApi.YourResource }>('/platform/your-resource', data);
    },
    update: async (id: string, data: YourResourceApi.YourResourceUpdate) => {
      return apiClient.put<{ data: YourResourceApi.YourResource }>(`/platform/your-resource/${id}`, data);
    },
    delete: async (id: string) => {
      return apiClient.delete(`/platform/your-resource/${id}`);
    },
  },
};
```

**Key Points:**
- ✅ **ALWAYS** use `/platform/*` prefix for all endpoints
- ✅ **ALWAYS** handle both array and paginated responses
- ✅ **ALWAYS** use proper TypeScript types from `@/types/api/yourResource`

#### Step 5: Add Backend Routes

**CRITICAL: You MUST add backend routes in `backend/routes/api.php`:**

```php
// In backend/routes/api.php
Route::middleware(['auth:sanctum', 'platform.admin'])->prefix('platform')->group(function () {
    // ... existing routes ...
    Route::get('/your-resource', [YourResourceController::class, 'index']);
    Route::get('/your-resource/{id}', [YourResourceController::class, 'show']);
    Route::post('/your-resource', [YourResourceController::class, 'store']);
    Route::put('/your-resource/{id}', [YourResourceController::class, 'update']);
    Route::delete('/your-resource/{id}', [YourResourceController::class, 'destroy']);
});
```

**Key Points:**
- ✅ **ALWAYS** use `platform.admin` middleware
- ✅ **ALWAYS** use `/platform` prefix
- ✅ **ALWAYS** follow RESTful conventions

#### Platform Management Page Checklist

Before marking a platform management page as complete, verify:

- [ ] Component created in `frontend/src/platform/pages/admin/YourManagementPage.tsx`
- [ ] Component uses `usePlatformAdminPermissions()` (not `useHasPermission()`)
- [ ] Component shows loading spinner while `permissionsLoading` is true
- [ ] Component redirects to `/platform/dashboard` if no permission
- [ ] Queries have `enabled: !permissionsLoading && hasAdminPermission`
- [ ] Component added to `frontend/src/components/LazyComponents.tsx` with lazy loading
- [ ] Route added to `frontend/src/platform/App.tsx` with correct path
- [ ] API endpoints added to `frontend/src/platform/lib/platformApi.ts` with `/platform/*` prefix
- [ ] Backend routes added in `backend/routes/api.php` with `platform.admin` middleware
- [ ] Backend controller clears team context (`setPermissionsTeamId(null)`)
- [ ] Backend controller checks `subscription.admin` permission
- [ ] No `organization_id` filtering in queries or controllers
- [ ] All API calls use `platformApi` client (not regular `apiClient`)

#### Common Mistakes to Avoid

❌ **DON'T:**
- Forget to add component to `LazyComponents.tsx` (page won't render)
- Forget to add route to `platform/App.tsx` (route won't match)
- Use `useHasPermission()` instead of `usePlatformAdminPermissions()` (won't work for platform admins)
- Use regular `apiClient` instead of `platformApi` (wrong endpoints)
- Add `organization_id` filtering (platform admins see all data)
- Skip the `enabled` condition on queries (queries will run before permissions load)

✅ **DO:**
- Add component to `LazyComponents.tsx` for lazy loading
- Add route to `platform/App.tsx` with correct path
- Use `usePlatformAdminPermissions()` for permission checks
- Use `platformApi` client for all API calls
- Add `enabled: !permissionsLoading && hasAdminPermission` to queries
- Show loading spinner while permissions load
- Redirect to `/platform/dashboard` if no permission

#### Backend API Routes

All platform admin API routes are prefixed with `/platform/*` and protected by `platform.admin` middleware:

```php
// In backend/routes/api.php
Route::middleware(['auth:sanctum', 'platform.admin'])->prefix('platform')->group(function () {
    Route::get('/dashboard', [SubscriptionAdminController::class, 'dashboard']);
    Route::get('/organizations', [OrganizationController::class, 'index']);
    Route::get('/organizations/{id}', [OrganizationController::class, 'show']);
    Route::get('/organizations/admins', [OrganizationController::class, 'admins']);
    Route::get('/plans', [SubscriptionAdminController::class, 'listPlans']);
    Route::post('/plans', [SubscriptionAdminController::class, 'createPlan']);
    Route::get('/subscriptions', [SubscriptionAdminController::class, 'listSubscriptions']);
    Route::get('/payments/pending', [SubscriptionAdminController::class, 'listPendingPayments']);
    Route::get('/renewals/pending', [SubscriptionAdminController::class, 'listPendingRenewals']);
    Route::get('/renewals/{id}', [SubscriptionAdminController::class, 'getRenewal']);
    Route::get('/discount-codes', [SubscriptionAdminController::class, 'listDiscountCodes']);
    Route::get('/permissions/platform-admin', [PermissionController::class, 'platformAdminPermissions']);
    // ... more routes
});
```

### Platform Admin Middleware

**CRITICAL: The `EnsurePlatformAdmin` middleware enforces global `subscription.admin` permission.**

```php
// backend/app/Http/Middleware/EnsurePlatformAdmin.php
public function handle(Request $request, Closure $next): Response
{
    $user = $request->user();

    if (!$user) {
        return response()->json(['message' => 'Unauthenticated.'], 401);
    }

    // CRITICAL: Clear team context for platform admin permissions
    // This ensures that 'subscription.admin' is checked as a global permission
    setPermissionsTeamId(null);

    try {
        if (!$user->hasPermissionTo('subscription.admin')) {
            return response()->json([
                'message' => 'You do not have permission to access platform administration.',
                'required_permission' => 'subscription.admin',
            ], 403);
        }
    } catch (\Exception $e) {
        Log::error("Permission check failed for platform.admin middleware: " . $e->getMessage());
        return response()->json(['message' => 'Authorization error.'], 500);
    }

    return $next($request);
}
```

**Key Points:**
- ✅ **ALWAYS** clear team context (`setPermissionsTeamId(null)`) before checking permission
- ✅ **ALWAYS** check for `subscription.admin` permission (global)
- ✅ **ALWAYS** register middleware as `'platform.admin'` in `bootstrap/app.php`

### Platform Admin Frontend Patterns

#### Route Guard Component

**CRITICAL: Use `PlatformAdminRoute` component to protect platform admin routes.**

```typescript
// frontend/src/components/PlatformAdminRoute.tsx
export function PlatformAdminRoute({ children }: PlatformAdminRouteProps) {
  const { user, loading } = useAuth();
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();

  if (loading || permissionsLoading) {
    return <LoadingSpinner size="lg" />;
  }

  if (!user) {
    return <Navigate to="/platform/login" replace />;
  }

  // Check for platform admin permission (GLOBAL, not organization-scoped)
  const hasPlatformAdmin = permissions?.includes('subscription.admin');

  if (!hasPlatformAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
```

#### Platform Admin Route Registration (React Router v6)

**CRITICAL: Define platform routes as nested `<Route path="/platform">` with an `<Outlet />`. Do NOT place a `<Routes>` inside a `<Route>` element.**

✅ Correct pattern (in `frontend/src/App.tsx`):
```tsx
<Route path="/platform" element={
  <PlatformAdminRoute>
    <PlatformAdminLayout>
      <Outlet />
    </PlatformAdminLayout>
  </PlatformAdminRoute>
}>
  <Route index element={<Navigate to="dashboard" replace />} />
  <Route path="dashboard" element={<PlatformAdminDashboard />} />
  <Route path="maintenance-history" element={<MaintenanceHistory />} />
</Route>
```

❌ Wrong pattern (causes empty routes / no matches):
```tsx
<Route path="/platform/*" element={
  <PlatformAdminRoute>
    <PlatformAdminLayout>
      <Routes>
        <Route path="/maintenance-history" element={<MaintenanceHistory />} />
      </Routes>
    </PlatformAdminLayout>
  </PlatformAdminRoute>
} />
```

#### Platform Admin Hooks Pattern

**CRITICAL: Platform admin hooks do NOT require organization_id.**

```typescript
// frontend/src/platform/hooks/usePlatformAdmin.tsx
export const usePlatformOrganizations = () => {
  return useQuery<Organization[]>({
    queryKey: ['platform-organizations'],
    queryFn: async () => {
      const response = await platformApi.organizations.list();
      return (response as OrganizationApi.Organization[]).map(mapOrganizationApiToDomain);
    },
    staleTime: 5 * 60 * 1000,
    // NOTE: No organization_id in queryKey or enabled condition
  });
};

export const usePlatformDashboard = () => {
  return useQuery({
    queryKey: ['platform-dashboard'],
    queryFn: async () => {
      const response = await platformApi.dashboard.get();
      return response;
    },
    staleTime: 2 * 60 * 1000,
    // NOTE: No organization_id required
  });
};
```

#### Platform Admin Permissions Hook

**CRITICAL: Platform admin permissions hook checks for GLOBAL permissions only.**

```typescript
// frontend/src/platform/hooks/usePlatformAdminPermissions.tsx
export const usePlatformAdminPermissions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['platform-admin-permissions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Call platform admin permissions endpoint (doesn't require organization_id)
      const response = await apiClient.get<{ permissions: string[] }>('/platform/permissions/platform-admin');
      return response.permissions || [];
    },
    enabled: !!user,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};
```

#### Platform Admin API Client Pattern

**CRITICAL: Platform admin API client uses `/platform/*` endpoints.**

```typescript
// frontend/src/platform/lib/platformApi.ts
export const platformApi = {
  dashboard: {
    get: async () => {
      return apiClient.get('/platform/dashboard');
    },
  },
  organizations: {
    list: async () => {
      return apiClient.get<OrganizationApi.Organization[]>('/platform/organizations');
    },
    toggleFeature: async (organizationId: string, featureKey: string) => {
      return apiClient.post(`/platform/organizations/${organizationId}/features/${featureKey}/toggle`);
    },
    admins: async () => {
      return apiClient.get('/platform/organizations/admins');
    },
  },
  plans: {
    list: async () => {
      return apiClient.get('/platform/plans');
    },
    create: async (data: PlanData) => {
      return apiClient.post('/platform/plans', data);
    },
    update: async (id: string, data: PlanData) => {
      return apiClient.put(`/platform/plans/${id}`, data);
    },
  },
  // ... more API methods
};
```

### Platform Admin Backend Patterns

#### Controller Pattern

**CRITICAL: Platform admin controllers MUST clear team context and check global permission.**

```php
// In SubscriptionAdminController or OrganizationController
public function dashboard(Request $request)
{
    // CRITICAL: Clear team context for platform admin permissions
    setPermissionsTeamId(null);

    // The platform.admin middleware already checks for subscription.admin
    // No need for explicit check here, but ensure context is clear for Spatie

    try {
        // Total organizations (no organization filtering)
        $totalOrgs = Organization::whereNull('deleted_at')->count();
        
        // Total subscriptions (no organization filtering)
        $totalSubscriptions = Subscription::whereNull('deleted_at')->count();
        
        // ... rest of platform-wide statistics
    } catch (\Exception $e) {
        Log::error("Error fetching subscription dashboard data: " . $e->getMessage());
        return response()->json(['error' => 'Failed to fetch dashboard data'], 500);
    }
}
```

#### Permission Endpoint Pattern

**CRITICAL: Platform admin permissions endpoint returns GLOBAL permissions only.**

```php
// In PermissionController
public function platformAdminPermissions(Request $request)
{
    $user = $request->user();

    if (!$user) {
        return response()->json(['error' => 'Unauthenticated'], 401);
    }

    // CRITICAL: Clear team context to check global permissions
    setPermissionsTeamId(null);

    // Check if user has subscription.admin permission (GLOBAL)
    try {
        if (!$user->hasPermissionTo('subscription.admin')) {
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }
    } catch (\Exception $e) {
        Log::warning("Platform admin permission check failed: " . $e->getMessage());
        return response()->json([
            'error' => 'Access Denied',
            'message' => 'This endpoint is only accessible to platform administrators.',
        ], 403);
    }

    // Get global permissions (organization_id = NULL) assigned to this user
    $globalPermissions = DB::table('model_has_permissions')
        ->join('permissions', 'model_has_permissions.permission_id', '=', 'permissions.id')
        ->where('model_has_permissions.model_id', $user->id)
        ->where('model_has_permissions.model_type', 'App\\Models\\User')
        ->whereNull('permissions.organization_id') // CRITICAL: Only global permissions
        ->distinct()
        ->pluck('permissions.name')
        ->toArray();

    // Ensure subscription.admin is included
    $permissions = array_unique(array_merge($globalPermissions, ['subscription.admin']));

    return response()->json([
        'permissions' => $permissions
    ]);
}
```

### Platform Admin vs Main App Differences

| Aspect | Main App | Platform Admin App |
|--------|----------|-------------------|
| **Login Route** | `/login` | `/platform/login` |
| **Route Prefix** | `/` | `/platform/*` |
| **Organization Required** | ✅ Yes | ❌ No |
| **Permission Scope** | Organization-scoped | Global only |
| **Permission Check** | `useUserPermissions()` | `usePlatformAdminPermissions()` |
| **API Endpoints** | `/api/*` | `/api/platform/*` |
| **Hooks** | `useOrganizations()`, etc. | `usePlatformOrganizations()`, etc. |
| **Route Guard** | `ProtectedRoute` | `PlatformAdminRoute` |
| **Middleware** | `EnsureOrganizationAccess` | `EnsurePlatformAdmin` |
| **Query Keys** | Include `organization_id` | No `organization_id` |

### Platform Admin Development Checklist

Before creating or modifying platform admin features, verify:

- [ ] Uses `/platform/*` route prefix (frontend and backend)
- [ ] Uses `platform.admin` middleware (backend routes)
- [ ] Uses `PlatformAdminRoute` component (frontend routes)
- [ ] Uses platform admin hooks (not regular hooks)
- [ ] Uses `platformApi` client (not regular `apiClient`)
- [ ] Clears team context (`setPermissionsTeamId(null)`) before permission checks
- [ ] Checks for `subscription.admin` permission (global)
- [ ] Does NOT require `organization_id` in queries
- [ ] Does NOT filter by `organization_id` (platform-wide access)
- [ ] Uses `usePlatformAdminPermissions()` hook (not `useUserPermissions()`)

### Platform Admin Security Rules

**CRITICAL: Platform admin security is different from main app security.**

1. **NO organization filtering**: Platform admins see ALL organizations
2. **NO school filtering**: Platform admins see ALL schools
3. **Global permissions only**: `subscription.admin` must be global (`organization_id = NULL`)
4. **Clear team context**: Always call `setPermissionsTeamId(null)` before permission checks
5. **Separate middleware**: Use `platform.admin` middleware, not `organization` middleware
6. **Separate route guard**: Use `PlatformAdminRoute`, not `ProtectedRoute`
7. **Separate hooks**: Use platform admin hooks, not regular hooks

### Common Mistakes to Avoid

❌ **DON'T:**
- Use organization-scoped permissions for platform admin
- Filter queries by `organization_id` in platform admin controllers
- Use regular hooks (`useOrganizations`) in platform admin pages
- Use regular API client in platform admin hooks
- Require `organization_id` in platform admin queries
- Use `EnsureOrganizationAccess` middleware for platform routes
- Use `ProtectedRoute` component for platform routes
- Nest `<Routes>` inside a `<Route>` element for platform routes (breaks route matching)

✅ **DO:**
- Use global `subscription.admin` permission (organization_id = NULL)
- Clear team context before permission checks
- Use platform admin hooks (`usePlatformOrganizations`, etc.)
- Use `platformApi` client for platform admin API calls
- Use `platform.admin` middleware for platform routes
- Use `PlatformAdminRoute` component for platform routes
- Access ALL organizations (no filtering)
- Register platform routes as nested routes under `/platform` with `<Outlet />`

## Onboarding & Guided Tour System

**CRITICAL: The application uses Shepherd.js for guided tours and onboarding. All tour-related code is centralized in `/src/onboarding/`.**

### Overview

The onboarding system provides:
- **Professional guided tours** using Shepherd.js
- **Route-aware navigation** (tours can navigate between routes)
- **UI-state-aware** (can open/close sidebar, switch tabs, etc.)
- **Persistence** via localStorage (completion state, progress, version tracking)
- **RTL/LTR support** with automatic placement flipping
- **Graceful fallbacks** for missing targets (optional vs required steps)
- **Debug mode** for development (`VITE_TOUR_DEBUG=true`)

### Directory Structure

```
frontend/src/onboarding/
├── index.ts                    # Main exports
├── TourProvider.tsx            # React context provider
├── TourRunner.ts               # Core tour execution engine
├── TourRegistry.ts             # Tour definitions registry
├── types.ts                    # TypeScript definitions
├── storage.ts                  # localStorage persistence
├── rtl.ts                      # RTL detection and placement utilities
├── dom.ts                      # DOM utilities (waitFor, scroll, etc.)
├── styles.css                  # Custom Shepherd styling for Nazim theme
├── actions/
│   ├── index.ts                # Action registry exports
│   └── uiActions.ts            # UI action implementations
└── tours/
    └── appCore/
        ├── index.ts            # Tour definition export
        ├── steps.ts            # Step definitions
        └── content.ts          # Step content (for i18n later)
```

### Core Components

#### TourProvider

**CRITICAL: Wrap protected routes with `TourProvider` in `App.tsx`.**

```tsx
import { TourProvider, appCoreTour } from "@/onboarding";

<Route element={
  <ProtectedRoute>
    <TourProvider tours={[appCoreTour]}>
      <PersistentLayout />
    </TourProvider>
  </ProtectedRoute>
}>
```

**TourProvider Props:**
- `tours`: Array of `TourDefinition` objects to register
- `autoStart`: Boolean to auto-start first eligible tour (default: false)
- `onTourStart`, `onTourComplete`, `onTourCancel`: Callback functions

#### useTour Hook

**CRITICAL: Use `useTour()` hook to access tour functionality in components.**

```tsx
import { useTour } from "@/onboarding";

function MyComponent() {
  const { startTour, resumeTour, stopTour, resetTour, isTourCompleted } = useTour();
  
  const handleStartTour = () => {
    startTour('appCore');
  };
  
  return (
    <Button onClick={handleStartTour}>
      Take App Tour
    </Button>
  );
}
```

**Available Methods:**
- `startTour(tourId: string, fromStep?: string)`: Start a tour (optionally from a specific step)
- `resumeTour(tourId: string)`: Resume a tour from the last saved step
- `stopTour()`: Stop the currently running tour
- `resetTour(tourId: string)`: Reset a tour's completion state (allow retaking)
- `isTourCompleted(tourId: string)`: Check if a tour has been completed
- `getAvailableTours()`: Get tours eligible for the current context

### Tour Definition Pattern

**CRITICAL: All tours MUST follow this structure.**

```typescript
import type { TourDefinition } from '@/onboarding/types';
import { appCoreSteps } from './steps';

export const myTour: TourDefinition = {
  id: 'myTour',
  version: '1.0.0',
  title: 'My Tour',
  description: 'Description of what this tour covers',
  steps: appCoreSteps,
  priority: 100, // Higher = more important (for auto-start)
  eligible: (ctx) => {
    // Return true if user is eligible for this tour
    return !ctx.isTourCompleted('myTour');
  },
};
```

### Step Definition Pattern

**CRITICAL: Steps MUST use `data-tour` selectors for targeting elements.**

```typescript
import type { TourStep } from '@/onboarding/types';

export const mySteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome!',
    text: 'Welcome to this feature...',
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard', // Navigate to this route before showing step
    preActions: [
      { type: 'expandSidebar' },
      { type: 'openSidebarGroup', payload: { groupId: 'students' } },
    ],
    waitFor: { selector: '[data-tour="dashboard"]', timeoutMs: 5000 },
    scroll: 'center',
    optional: false, // If true, skip silently if target not found
    rtlPlacementFlip: true, // Auto-flip placement for RTL (default: true)
  },
];
```

**Step Properties:**
- `id`: Unique identifier for the step
- `title`: Optional title displayed in step header
- `text`: Content text (string or array of strings for paragraphs)
- `attachTo`: Element to attach step to (`{ selector: string, on: TourPlacement }`)
- `route`: Route to navigate to before showing step
- `preActions`: Array of actions to execute before showing step
- `waitFor`: Wait for element visibility before showing step
- `scroll`: Scroll behavior ('center', 'start', 'end', 'nearest')
- `allowClicksOnTarget`: Allow clicks on target element while step is shown
- `optional`: If true, skip step silently if target not found
- `rtlPlacementFlip`: Auto-flip placement for RTL (default: true)

### Available Actions

**CRITICAL: Use these action types in `preActions` array.**

```typescript
// Navigation
{ type: 'navigate', payload: { route: '/dashboard' } }

// Sidebar
{ type: 'expandSidebar' }
{ type: 'collapseSidebar' }
{ type: 'openSidebarGroup', payload: { groupId: 'students' } }
{ type: 'closeSidebarGroup', payload: { groupId: 'students' } }

// User Menu
{ type: 'openUserMenu' }
{ type: 'closeUserMenu' }

// Tabs
{ type: 'switchTab', payload: { containerId: 'tabs', tabId: 'overview' } }

// Modals
{ type: 'openModal', payload: { modalId: 'myModal' } }
{ type: 'closeModal', payload: { modalId: 'myModal' } }

// Scrolling
{ type: 'scrollTo', payload: { selector: '[data-tour="element"]' } }

// Clicking
{ type: 'click', payload: { selector: '[data-tour="button"]' } }

// Waiting
{ type: 'wait', payload: { ms: 500 } }
```

### data-tour Attributes

**CRITICAL: Add `data-tour` attributes to components for tour targeting.**

**Required Attributes:**
- `data-tour="app-header"` - AppHeader component
- `data-tour="sidebar"` - Sidebar component
- `data-tour="dashboard"` - Dashboard main content
- `data-tour="user-menu"` - User dropdown trigger
- `data-tour="help-button"` - Help button

**Sidebar Menu Items:**
- `data-tour="sidebar-dashboard"` - Dashboard menu item
- `data-tour="sidebar-students"` - Students menu item
- `data-tour="sidebar-staff"` - Staff menu item
- `data-tour="sidebar-attendance"` - Attendance menu item
- `data-tour="sidebar-exams"` - Exams menu item
- `data-tour="sidebar-finance"` - Finance menu item
- `data-tour="sidebar-academic"` - Academic menu item
- `data-tour="sidebar-settings"` - Settings menu item

**Pattern for Adding data-tour Attributes:**

```tsx
// In component
<header data-tour="app-header">
  {/* ... */}
</header>

// In sidebar menu items (SmartSidebar.tsx)
<SidebarMenuItem data-tour={getDataTourAttr(item.titleKey)}>
  {/* ... */}
</SidebarMenuItem>
```

### Creating New Tours

**CRITICAL: Follow these steps when creating a new tour.**

1. **Create tour directory**: `frontend/src/onboarding/tours/myTour/`
2. **Create content file**: `content.ts` with step content
3. **Create steps file**: `steps.ts` with step definitions using `data-tour` selectors
4. **Create index file**: `index.ts` exporting the tour definition
5. **Register tour**: Add to `TourProvider` in `App.tsx`:

```tsx
import { myTour } from "@/onboarding/tours/myTour";

<TourProvider tours={[appCoreTour, myTour]}>
```

6. **Trigger tour**: Use `startTour('myTour')` from any component

### Storage & Persistence

**CRITICAL: Tour state is persisted in localStorage with the following structure.**

```typescript
interface TourState {
  completed: boolean;
  version: string | null;
  lastStepId: string | null;
  lastUpdated: number;
}
```

**Storage Functions:**
- `getTourState(tourId)`: Get tour state from localStorage
- `setTourState(tourId, state)`: Save tour state to localStorage
- `completeTour(tourId, version)`: Mark tour as completed
- `saveProgress(tourId, stepId, version)`: Save current step for resuming
- `resetTour(tourId)`: Clear tour state (allow retaking)
- `isTourCompleted(tourId)`: Check if tour is completed

**Key Rules:**
- ✅ **ALWAYS** use storage functions (never access localStorage directly)
- ✅ **ALWAYS** include version in tour definitions for tracking updates
- ✅ **ALWAYS** check version when determining eligibility (show tour again if version changed)
- ❌ **NEVER** hardcode localStorage keys (use storage functions)

### RTL Support

**CRITICAL: Tours automatically handle RTL/LTR layout.**

- **Automatic detection**: Uses `document.documentElement.dir` and `localStorage.getItem('nazim-language')`
- **Placement flipping**: Automatically flips placements for RTL languages (Arabic, Pashto, Farsi)
- **Text direction**: Steps respect RTL text direction
- **Button order**: Buttons reorder for RTL layout

**RTL Utilities:**
- `isRTL()`: Check if current language is RTL
- `getRTLPlacement(step)`: Get RTL-aware placement for a step
- `flipPlacement(placement, shouldFlip)`: Flip a placement for RTL

### Debug Mode

**CRITICAL: Enable debug mode for development.**

Set environment variable: `VITE_TOUR_DEBUG=true`

**Debug logging includes:**
- Step start/end events
- Action execution
- Wait-for timeouts
- Missing target warnings
- Route navigation
- Error messages

**Usage:**
```bash
# In .env.local
VITE_TOUR_DEBUG=true
```

### Styling

**CRITICAL: Custom Shepherd styling is in `/src/onboarding/styles.css`.**

- **Theme**: Nazim theme with CSS variables
- **Z-index**: 99999+ to ensure visibility above all content
- **Fonts**: Uses Nazim font family (Bahij Nazanin)
- **RTL support**: Automatic RTL/LTR styling
- **Responsive**: Mobile-friendly with proper breakpoints
- **Dark mode**: Supports dark mode via CSS variables

**Key CSS Variables:**
- `--shepherd-primary`: Primary color
- `--shepherd-bg`: Background color
- `--shepherd-text`: Text color
- `--shepherd-border`: Border color
- `--shepherd-z-index`: Z-index for tour elements

### Integration Checklist

Before marking a tour feature as complete, verify:

- [ ] Tour is registered in `TourProvider` in `App.tsx`
- [ ] All target elements have `data-tour` attributes
- [ ] Steps use `data-tour` selectors (not class names or IDs)
- [ ] Optional steps are marked as `optional: true`
- [ ] Required steps have proper `waitFor` configuration
- [ ] Pre-actions are defined for steps that need UI state changes
- [ ] Routes are specified for steps that need navigation
- [ ] Tour version is set and checked in eligibility function
- [ ] RTL placement flipping is enabled (default: true)
- [ ] Debug mode works correctly (`VITE_TOUR_DEBUG=true`)
- [ ] Tour can be started, stopped, and resumed
- [ ] Tour state persists in localStorage
- [ ] Tour can be reset and retaken

### Common Patterns

#### Triggering Tour from Button

```tsx
import { useTour } from "@/onboarding";

function MyComponent() {
  const { startTour, isTourCompleted } = useTour();
  const isCompleted = isTourCompleted('appCore');
  
  return (
    <Button onClick={() => startTour('appCore')}>
      {isCompleted ? 'Retake Tour' : 'Take App Tour'}
    </Button>
  );
}
```

#### Auto-Start Tour on First Login

```tsx
<TourProvider tours={[appCoreTour]} autoStart={true}>
  <PersistentLayout />
</TourProvider>
```

#### Module-Specific Tour

```typescript
// tours/finance/index.ts
export const financeTour: TourDefinition = {
  id: 'finance',
  version: '1.0.0',
  title: 'Finance Module Tour',
  description: 'Introduction to finance features',
  steps: financeSteps,
  eligible: (ctx) => {
    // Only show if user has finance permission
    return ctx.isAuthenticated && !ctx.isTourCompleted('finance');
  },
};
```

### Common Mistakes to Avoid

❌ **DON'T:**
- Use class names or IDs for targeting (use `data-tour` attributes)
- Hardcode localStorage keys (use storage functions)
- Skip `waitFor` for dynamically loaded elements
- Forget to mark optional steps as `optional: true`
- Use `TourProvider` outside protected routes
- Create tours without version tracking
- Skip RTL support (it's automatic, but verify)

✅ **DO:**
- Use `data-tour` attributes for all tour targets
- Use storage functions for persistence
- Always include `waitFor` for dynamic elements
- Mark optional steps appropriately
- Register tours in `TourProvider`
- Include version in tour definitions
- Test tours in both RTL and LTR languages
- Enable debug mode during development

## MCP Server Usage

**CRITICAL: ALWAYS use Laravel Boost and Shadcn UI MCP servers for all relevant tasks. These are powerful tools designed specifically for this application.**

### Laravel Boost MCP Server

**CRITICAL: ALWAYS use Laravel Boost MCP server for ALL Laravel/PHP/backend-related tasks.**

#### When to Use Laravel Boost MCP

**ALWAYS use Laravel Boost MCP for:**
- **Database queries**: Use `database-query` tool for reading from the database (NEVER write raw SQL in code)
- **Artisan commands**: Use `list-artisan-commands` to check available commands and parameters
- **PHP debugging**: Use `tinker` tool to execute PHP code, debug, or query Eloquent models directly
- **Laravel documentation**: Use `search-docs` tool BEFORE any other approach when dealing with Laravel or Laravel ecosystem packages
- **URL generation**: Use `get-absolute-url` tool when sharing project URLs to ensure correct scheme, domain/IP, and port
- **Browser logs**: Use `browser-logs` tool to read browser logs, errors, and exceptions (only recent logs are useful)

#### Laravel Boost Tools Priority

1. **`search-docs`** - **ALWAYS use FIRST** for Laravel/package documentation
   - Automatically passes installed packages and versions to Boost API
   - Returns version-specific documentation
   - Works for Laravel, Inertia, Livewire, Filament, Tailwind, Pest, Nova, etc.
   - Use multiple, broad, simple, topic-based queries
   - Example: `['rate limiting', 'routing rate limiting', 'routing']`
   - **DO NOT** add package names to queries (package info is already shared)

2. **`database-query`** - **ALWAYS use for database reads**
   - Use for reading data from database
   - Returns structured JSON results
   - **NEVER** use for writes (use Eloquent models or migrations)

3. **`tinker`** - **ALWAYS use for PHP debugging**
   - Execute PHP code directly
   - Query Eloquent models
   - Debug code execution
   - Test database queries

4. **`list-artisan-commands`** - **ALWAYS use before calling Artisan commands**
   - Check available commands
   - Verify command parameters
   - Understand command options

5. **`get-absolute-url`** - **ALWAYS use when sharing URLs**
   - Ensures correct scheme, domain/IP, and port
   - Prevents broken links

6. **`browser-logs`** - **Use for debugging frontend issues**
   - Read recent browser logs
   - Check for JavaScript errors
   - Verify frontend behavior

#### Laravel Boost Usage Rules

- ✅ **ALWAYS** use `search-docs` before searching documentation elsewhere
- ✅ **ALWAYS** use `database-query` for database reads (never write raw SQL in code)
- ✅ **ALWAYS** use `tinker` for PHP debugging and Eloquent queries
- ✅ **ALWAYS** use `list-artisan-commands` before calling Artisan commands
- ✅ **ALWAYS** use `get-absolute-url` when sharing project URLs
- ✅ **ALWAYS** use `browser-logs` for frontend debugging
- ❌ **NEVER** write raw SQL queries in code (use `database-query` or Eloquent)
- ❌ **NEVER** search Laravel docs manually (use `search-docs` first)
- ❌ **NEVER** guess Artisan command parameters (use `list-artisan-commands`)

### Shadcn UI MCP Server

**CRITICAL: ALWAYS use Shadcn UI MCP server for ALL UI component-related tasks.**

#### When to Use Shadcn UI MCP

**ALWAYS use Shadcn UI MCP for:**
- **Adding new components**: Use to add shadcn/ui components to the project
- **Component installation**: Install components with proper configuration
- **Component updates**: Update existing shadcn/ui components
- **Component discovery**: Find available shadcn/ui components
- **UI component queries**: Any questions about shadcn/ui components

#### Shadcn UI MCP Usage Rules

- ✅ **ALWAYS** use Shadcn UI MCP when adding new UI components
- ✅ **ALWAYS** use Shadcn UI MCP for component installation
- ✅ **ALWAYS** use Shadcn UI MCP for component updates
- ✅ **ALWAYS** use Shadcn UI MCP for component-related questions
- ❌ **NEVER** manually install shadcn/ui components (use MCP server)
- ❌ **NEVER** copy-paste component code without using MCP server

### MCP Server Configuration

**MCP servers are configured in `.cursor/mcp.json`:**

```json
{
  "mcpServers": {
    "laravel-boost": {
      "command": "php",
      "args": ["-ddisplay_errors=0", "-ddisplay_startup_errors=0", "E:/Nazim Production/nazim-web-1/backend/artisan", "boost:mcp"],
      "cwd": "E:/Nazim Production/nazim-web-1/backend"
    },
    "shadcn": {
      "command": "npx",
      "args": ["--yes", "shadcn@latest", "mcp"]
    }
  }
}
```

### MCP Server Checklist

Before starting any task, verify:

- [ ] **Laravel/PHP tasks**: Use Laravel Boost MCP server
- [ ] **UI component tasks**: Use Shadcn UI MCP server
- [ ] **Database queries**: Use `database-query` tool (Laravel Boost)
- [ ] **Documentation**: Use `search-docs` tool (Laravel Boost) FIRST
- [ ] **PHP debugging**: Use `tinker` tool (Laravel Boost)
- [ ] **Artisan commands**: Check with `list-artisan-commands` (Laravel Boost)
- [ ] **Component installation**: Use Shadcn UI MCP server

### Common MCP Server Patterns

#### Database Query Pattern
```typescript
// ✅ CORRECT: Use database-query tool
// Query: SELECT COUNT(*) FROM students WHERE deleted_at IS NULL

// ❌ WRONG: Don't write raw SQL in code
const count = DB::raw("SELECT COUNT(*) FROM students WHERE deleted_at IS NULL");
```

#### Documentation Search Pattern
```typescript
// ✅ CORRECT: Use search-docs tool FIRST
// Queries: ['rate limiting', 'routing rate limiting']

// ❌ WRONG: Don't search documentation manually
// Go to laravel.com/docs and search...
```

#### Component Installation Pattern
```typescript
// ✅ CORRECT: Use Shadcn UI MCP server
// Command: Add button component

// ❌ WRONG: Don't manually install components
// npx shadcn@latest add button
```

Remember: This is a production application serving real educational institutions. Always prioritize security, performance, and user experience in your code. Always use translations for user-facing text, and ensure RTL support is properly implemented. The backend is now Laravel, so follow Laravel conventions and best practices. **ALWAYS use Laravel Boost and Shadcn UI MCP servers for all relevant tasks.**
