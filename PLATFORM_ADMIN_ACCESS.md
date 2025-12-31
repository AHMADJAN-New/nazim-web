# Platform Admin Access Guide

## Overview

The Platform Admin app is a **separate application** from the main Nazim app, designed for platform administrators who manage the entire platform. Platform admins are **NOT tied to any organization** and have access to manage all organizations, subscriptions, plans, and more.

## Key Features

- **Separate Login**: Platform admins use a dedicated login page
- **No Organization Required**: Platform admins don't need to be assigned to an organization
- **Global Permissions**: Uses `subscription.admin` permission (GLOBAL, not organization-scoped)
- **Complete Platform Management**: Manage all organizations, subscriptions, plans, payments, renewals, and discount codes

## How to Access Platform Admin

### Step 1: Assign Platform Admin Permission

**CRITICAL**: A user must have the `subscription.admin` permission assigned as a **GLOBAL permission** (organization_id = NULL).

#### Option A: Via Database (Direct)

```sql
-- 1. Find or create the global subscription.admin permission
SELECT id, name, organization_id 
FROM permissions 
WHERE name = 'subscription.admin' AND organization_id IS NULL;

-- If it doesn't exist, create it:
INSERT INTO permissions (id, name, guard_name, organization_id, resource, action, description, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'subscription.admin',
  'web',
  NULL,  -- CRITICAL: NULL = Global permission
  'subscription',
  'admin',
  'Platform administration access',
  now(),
  now()
);

-- 2. Get the permission ID
SELECT id FROM permissions WHERE name = 'subscription.admin' AND organization_id IS NULL;

-- 3. Assign to user directly (replace USER_ID and PERMISSION_ID)
INSERT INTO model_has_permissions (permission_id, model_type, model_id, organization_id)
VALUES (
  'PERMISSION_ID',  -- From step 2
  'App\\Models\\User',
  'USER_ID',  -- The user's UUID
  NULL  -- NULL for global permissions
);
```

#### Option B: Via Laravel Tinker

```bash
cd backend
php artisan tinker
```

```php
// Get the user
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

// Verify
$user->hasPermissionTo('subscription.admin');  // Should return true
```

### Step 2: Access Platform Admin Login

1. **Navigate to Platform Admin Login**:
   - URL: `http://your-domain/platform/login`
   - Or click "Platform Admin" link if available in the main app

2. **Login with Platform Admin Credentials**:
   - Use the email and password of the user with `subscription.admin` permission
   - The login will verify you have the platform admin permission

3. **Access Platform Dashboard**:
   - After successful login, you'll be redirected to `/platform/dashboard`
   - You'll see the Platform Admin interface with sidebar navigation

## Platform Admin Routes

All platform admin routes are prefixed with `/platform/*`:

- **Login**: `/platform/login`
- **Dashboard**: `/platform/dashboard`
- **Organizations**: `/platform/organizations`
- **Organization Details**: `/platform/organizations/:organizationId`
- **Organization Admins**: `/platform/admins`
- **Subscriptions**: `/platform/subscriptions`
- **Subscription Plans**: `/platform/plans`
- **Pending Actions**: `/platform/pending` (payments & renewals)
- **Renewal Review**: `/platform/renewals/:renewalId`
- **Discount Codes**: `/platform/discount-codes`

## Navigation

The Platform Admin sidebar includes:

1. **Dashboard** - Platform overview and statistics
2. **Organizations** - Manage all organizations
3. **Organization Admins** - View all organization administrators
4. **Subscriptions** - Manage organization subscriptions
5. **Subscription Plans** - Manage subscription plans
6. **Pending Actions** - Review pending payments and renewals
7. **Discount Codes** - Manage discount codes
8. **Settings** - Platform settings (coming soon)

## Important Notes

### Permission System

- **`subscription.admin` is GLOBAL only**: This permission has `organization_id = NULL`
- **NOT organization-scoped**: Platform admins are NOT tied to any organization
- **Cannot be assigned to organization roles**: This permission is excluded from organization role assignments
- **Direct assignment only**: Must be assigned directly to users via `model_has_permissions` table

### Security

- Platform admin routes are protected by `EnsurePlatformAdmin` middleware
- The middleware checks for `subscription.admin` permission (GLOBAL)
- Users without this permission are redirected to the main app

### Backend Routes

All platform admin API routes use `/platform/*` prefix and require:
- Authentication: `auth:sanctum`
- Platform Admin Middleware: `platform.admin` middleware

### Frontend Routes

All platform admin frontend routes use `/platform/*` prefix and are protected by:
- `PlatformAdminRoute` component
- Checks for `subscription.admin` permission (GLOBAL)

## Troubleshooting

### "Access Denied" Error

**Problem**: User gets "Access Denied" even after assigning permission.

**Solution**:
1. Verify permission is GLOBAL (`organization_id = NULL`):
   ```sql
   SELECT * FROM permissions WHERE name = 'subscription.admin';
   -- organization_id should be NULL
   ```

2. Verify permission is assigned to user:
   ```sql
   SELECT * FROM model_has_permissions 
   WHERE model_id = 'USER_ID' 
   AND permission_id = (SELECT id FROM permissions WHERE name = 'subscription.admin' AND organization_id IS NULL);
   ```

3. Clear permission cache:
   ```bash
   php artisan permission:cache-reset
   ```

### "User must be assigned to an organization" Error

**Problem**: Platform admin login fails with organization requirement error.

**Solution**: This should NOT happen for platform admins. The `PlatformAdminRoute` and `EnsurePlatformAdmin` middleware bypass organization requirements. If you see this error:
1. Check that the route uses `platform.admin` middleware (not `organization` middleware)
2. Verify `PlatformAdminRoute` component is used (not `ProtectedRoute`)

### Permission Not Found

**Problem**: `subscription.admin` permission doesn't exist.

**Solution**: Run the permission seeder:
```bash
cd backend
php artisan db:seed --class=PermissionSeeder
```

This will create the global `subscription.admin` permission.

## Testing

1. **Create a test platform admin user**:
   ```sql
   -- Create user (if not exists)
   INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
   VALUES (
     gen_random_uuid(),
     'platform-admin@example.com',
     '$2y$10$...',  -- Use Laravel's Hash::make() to generate
     now(),
     now(),
     now()
   );
   ```

2. **Assign permission** (see Step 1 above)

3. **Login** at `/platform/login`

4. **Verify access** to all platform admin features

## Development

### Running the App

```bash
# Frontend
cd frontend
npm run dev

# Backend (in another terminal)
cd backend
php artisan serve
```

### Access URLs

- **Main App**: `http://localhost:5173/`
- **Platform Admin**: `http://localhost:5173/platform/login`

## Summary

The Platform Admin app is now fully separate from the main Nazim app:

✅ **Separate login page** (`/platform/login`)  
✅ **Separate routes** (`/platform/*`)  
✅ **Separate hooks** (platform admin hooks)  
✅ **Separate API endpoints** (`/platform/*`)  
✅ **No organization requirement** (platform admins are global)  
✅ **Global permissions** (`subscription.admin` with `organization_id = NULL`)  
✅ **Complete platform management** (all features accessible)  
✅ **All pages moved** (PlansManagement, OrganizationSubscriptionDetail, RenewalReviewPage, DiscountCodesManagement, SubscriptionAdminDashboard)  
✅ **All hooks updated** (using platform admin hooks)  
✅ **All routes configured** (platform admin routes)  
✅ **Improved sidebar** (better navigation with descriptions and active states)

All pages, dialogs, and components have been moved and updated to use platform admin hooks and routes.

## Quick Start

1. **Run permission seeder** (if not already run):
   ```bash
   cd backend
   php artisan db:seed --class=PermissionSeeder
   ```

2. **Assign permission to a user** (see Step 1 above)

3. **Access platform admin**:
   - Navigate to: `http://your-domain/platform/login`
   - Login with user credentials
   - You'll be redirected to `/platform/dashboard`

