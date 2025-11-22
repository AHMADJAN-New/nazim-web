# Multi-Tenancy Setup Guide

## Overview

Nazim School Manager Pro is a multi-tenant SaaS application where each organization (school) has isolated data. This guide explains how to set up and manage the multi-tenancy system.

## Architecture

### Core Concepts

1. **Organizations**: Top-level tenant isolation
   - Each school is an organization
   - Organizations have unique names and slugs
   - Settings stored as JSONB for flexibility

2. **Profiles**: User accounts with organization assignment
   - Linked to Supabase Auth users
   - Contains role and organization_id
   - Super admins have `organization_id = NULL`

3. **RBAC System**: Database-driven permissions
   - Permissions table: Fine-grained permissions (e.g., `buildings.create`)
   - Role Permissions: Links roles to permissions
   - Roles: `super_admin`, `admin`, `teacher`, `staff`, `student`

4. **Data Isolation**: RLS policies enforce organization boundaries
   - All data tables include `organization_id`
   - RLS policies filter by organization automatically
   - Super admins can access all organizations

## Database Setup

### 1. Run Migrations

Apply all migrations in order:

```sql
-- 1. Organizations table
20250127130000_create_organizations_table.sql

-- 2. Profiles table
20250127130001_create_profiles_table.sql

-- 3. Permissions table
20250127130002_create_permissions_table.sql

-- 4. Role Permissions table
20250127130003_create_role_permissions_table.sql

-- 5. Update Buildings with organization_id
20250127130004_add_organization_to_buildings.sql

-- 6. Update Rooms with organization_id
20250127130005_add_organization_to_rooms.sql

-- 7. RBAC Helper Functions
20250127130006_create_rbac_helper_functions.sql

-- 8. (Optional) Seed Test Data
20250127130007_seed_test_data.sql
```

### 2. Create Your First Super Admin

1. **Sign up a user** in Supabase Auth (via your app or Supabase Dashboard)

2. **Update their profile** to be super admin:
   ```sql
   UPDATE public.profiles 
   SET role = 'super_admin', organization_id = NULL 
   WHERE id = 'user-id-from-auth';
   ```

3. **Verify super admin status**:
   ```sql
   SELECT id, email, role, organization_id 
   FROM public.profiles 
   WHERE role = 'super_admin' AND organization_id IS NULL;
   ```

### 3. Create Organizations

Super admins can create organizations via:
- **UI**: `/settings/organizations` (after logging in as super admin)
- **SQL**: 
  ```sql
  INSERT INTO public.organizations (name, slug, settings)
  VALUES ('School Name', 'school-slug', '{}'::jsonb);
  ```

### 4. Assign Users to Organizations

When creating users:
1. User signs up → Profile created automatically via trigger
2. Admin assigns organization:
   ```sql
   UPDATE public.profiles 
   SET organization_id = 'org-id-here', role = 'admin'
   WHERE id = 'user-id-here';
   ```

Or via UI: `/settings/profile` (admin/super admin only)

## Role-Based Access Control (RBAC)

### Permission System

Permissions follow the pattern: `{resource}.{action}`

Examples:
- `buildings.read` - View buildings
- `buildings.create` - Create buildings
- `buildings.update` - Update buildings
- `buildings.delete` - Delete buildings
- `organizations.read` - View organizations (super admin only)
- `profiles.update` - Update profiles

### Default Role Permissions

- **Super Admin**: All permissions
- **Admin**: All permissions except `organizations.*`
- **Teacher**: Read-only permissions
- **Staff**: Read-only permissions
- **Student**: Read-only permissions (limited)

### Adding New Permissions

1. **Add permission**:
   ```sql
   INSERT INTO public.permissions (name, resource, action, description)
   VALUES ('students.create', 'students', 'create', 'Create new students');
   ```

2. **Assign to roles**:
   ```sql
   INSERT INTO public.role_permissions (role, permission_id)
   SELECT 'admin', id FROM public.permissions WHERE name = 'students.create';
   ```

3. **Use in code**:
   ```tsx
   <PermissionGuard permission="students.create">
     <CreateStudentButton />
   </PermissionGuard>
   ```

## Row-Level Security (RLS)

### How It Works

RLS policies automatically filter data by organization:

```sql
-- Example: Buildings policy
USING (
  organization_id = (
    SELECT organization_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
  OR (
    SELECT organization_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  ) IS NULL  -- Super admin
)
```

### Policy Pattern

All data tables follow this pattern:
- **SELECT**: Users see only their organization's data (or all if super admin)
- **INSERT**: Users can only insert into their organization
- **UPDATE**: Users can only update their organization's data
- **DELETE**: Users can only delete their organization's data

### Super Admin Access

Super admins (`organization_id IS NULL`) can:
- Access all organizations
- View all data across organizations
- Manage organizations
- Assign users to organizations

## Application Code

### Hooks

- `useOrganizations()` - Get all organizations (super admin only)
- `useProfile()` - Get current user's profile
- `useUserRole()` - Get current user's role
- `useIsSuperAdmin()` - Check if user is super admin
- `useHasPermission(permission)` - Check if user has permission
- `useBuildings()` - Get buildings (auto-filtered by org)
- `useRooms()` - Get rooms (auto-filtered by org)

### Components

- `<PermissionGuard permission="buildings.create">` - Show/hide based on permission
- `BuildingsManagement` - Auto-sets organization_id
- `RoomsManagement` - Validates organization matches building
- `OrganizationsManagement` - Super admin only
- `ProfileManagement` - Role-based profile editing

### Routes

- `/settings/organizations` - Organizations management (super admin)
- `/settings/buildings` - Buildings management
- `/settings/rooms` - Rooms management
- `/settings/profile` - Profile management

## Development Mode

### Authentication Bypass

For development, you can bypass authentication:

1. **Set environment variable**:
   ```bash
   VITE_DISABLE_AUTH=true
   ```

2. **In dev mode**, the app will:
   - Use a mock super admin user
   - Bypass Supabase Auth
   - Allow full access for testing

3. **WARNING**: Never set `VITE_DISABLE_AUTH=true` in production!

### Testing Multi-Tenancy

1. Create multiple organizations
2. Create users in different organizations
3. Verify data isolation:
   - User A (Org 1) cannot see Org 2's buildings
   - Super admin can see all organizations
   - RLS policies enforce isolation

## Production Checklist

Before deploying to production:

- [ ] Remove or comment out seed data migration
- [ ] Ensure `VITE_DISABLE_AUTH` is not set to 'true'
- [ ] Verify all RLS policies are in place
- [ ] Test organization isolation
- [ ] Create production super admin account
- [ ] Set up proper organization structure
- [ ] Configure role permissions for your use case
- [ ] Test permission-based access control

## Troubleshooting

### Issue: "new row violates row-level security policy"

**Solution**: 
- Ensure user has a profile with `organization_id` set
- Check RLS policies are correctly applied
- Verify user is authenticated (not using anon key)

### Issue: Super admin cannot access all organizations

**Solution**:
- Verify `organization_id IS NULL` in profile
- Check `role = 'super_admin'`
- Ensure RLS policies check for super admin correctly

### Issue: Users cannot see their organization's data

**Solution**:
- Verify `organization_id` is set in profile
- Check RLS policies are active
- Ensure user is authenticated (not anon)

### Issue: Permission checks always return false

**Solution**:
- Verify permissions exist in `permissions` table
- Check `role_permissions` table has correct mappings
- Ensure user's role is correct in profile
- Super admin should have all permissions automatically

## Best Practices

1. **Always use hooks** - They handle organization filtering automatically
2. **Check permissions** - Use `useHasPermission()` before showing UI
3. **Validate on server** - RLS provides database-level security
4. **Test isolation** - Verify users can't access other organizations' data
5. **Super admin sparingly** - Only assign super admin to trusted users
6. **Audit logs** - Consider adding audit logging for sensitive operations

## Next Steps

1. Apply all migrations to your Supabase database
2. Create your first super admin account
3. Create your first organization
4. Assign users to organizations
5. Test the multi-tenancy system
6. Customize permissions for your use case

## Support

For issues or questions:
- Check RLS policies in Supabase Dashboard
- Review migration files for schema changes
- Test with different user roles
- Verify organization assignments

