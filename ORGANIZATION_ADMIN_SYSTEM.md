# Organization Admin System - Multi-Tenancy & Permission Scoping

## Overview

This document describes the multi-tenancy system that allows proper isolation between organizations while maintaining a hierarchical permission structure.

## System Architecture

### Three-Tier Permission Model

```
Super Admin (Platform Level)
    └── Organization Admin (Organization Level)
            └── Organization Users (School/Department Level)
```

#### 1. **Super Admin** (Platform Management)
- **Scope**: Global/Platform-wide
- **Can**:
  - Create new organizations
  - Manage global permissions
  - Access all organizations
  - Manage platform settings
- **Cannot be created through API** - Must be seeded/created manually

#### 2. **Organization Admin** (Organization Management)
- **Scope**: Single Organization
- **Can**:
  - Manage their organization's details
  - Create and manage users within their organization
  - Assign organization-scoped permissions
  - Create schools within their organization
  - Manage all resources within their organization
- **Cannot**:
  - Access other organizations
  - Modify global permissions
  - Create new organizations

#### 3. **Organization Users** (Resource Access)
- **Scope**: Organization + Optional School/Department
- **Can**:
  - Access resources based on assigned permissions
  - Work within their assigned schools/departments
- **Permissions**: Assigned by Organization Admin

## Automatic Organization Setup

### When Creating an Organization

The system automatically creates:

1. **Organization Entity** - The main organization record
2. **Default School** - A primary school for the organization
   - Name: `{Organization Name} - Main School`
   - Inherits organization contact information
3. **Organization Admin User** - Full access account
   - Email: Provided in request
   - Password: Hashed and stored securely
   - Role: `organization_admin`
4. **Organization Admin Permissions** - Full organization access

### API Endpoint

```http
POST /api/organizations
Content-Type: application/json
Authorization: Bearer {super_admin_token}

{
  // Organization Data
  "name": "Example School District",
  "slug": "example-district",
  "email": "contact@example.com",
  "phone": "+93-XXX-XXXXXXX",
  "website": "https://example.com",
  "street_address": "123 Education Street",
  "city": "Kabul",
  "country": "Afghanistan",
  "type": "Educational Institution",
  "description": "A leading educational institution",

  // Admin User Data (REQUIRED)
  "admin_email": "admin@example.com",
  "admin_password": "SecureP@ssw0rd123",
  "admin_full_name": "Administrator Name"
}
```

### Response

```json
{
  "organization": {
    "id": "uuid-here",
    "name": "Example School District",
    "slug": "example-district",
    ...
  },
  "school": {
    "id": "uuid-here",
    "school_name": "Example School District - Main School"
  },
  "admin": {
    "id": "uuid-here",
    "email": "admin@example.com"
  },
  "message": "Organization created successfully with admin user and default school"
}
```

## Permission Scoping System

### How Permissions are Scoped

All permissions in the system have an `organization_id` field:

- **`organization_id = NULL`**: Global permissions (super admin only)
- **`organization_id = {uuid}`**: Organization-specific permissions

### Permission Context (Team ID)

The system uses Spatie's team feature to scope permissions:

```php
// Set organization context
setPermissionsTeamId($organization->id);

// Now all permission checks are scoped to this organization
$user->hasPermissionTo('users.create'); // Checks within organization context
```

### Organization Admin Permissions

Organization admins automatically receive these permissions:

#### Core Management
- `organizations.read` - View their organization
- `organizations.update` - Update their organization
- `users.*` - Full user management within organization
- `permissions.*` - Full permission management within organization
- `roles.*` - Full role management within organization
- `schools.*` - Full school management within organization

#### Resource Management
- `buildings.*`, `rooms.*`
- `staff.*`, `students.*`
- `classes.*`, `academic_years.*`
- `attendance.*`

#### Feature-Based (Requires Subscription)
- `subjects.*` - Subject management
- `exams.*` - Examination system
- `timetables.*` - Timetable generation
- `hostel.*` - Hostel management
- `library_books.*` - Library system
- `finance_accounts.*` - Financial management
- `fees.*` - Fee management
- `events.*` - Event management
- `dms.*` - Document management
- `short_term_courses.*` - Course management
- `assets.*` - Asset tracking
- `graduation_batches.*` - Graduation
- `id_cards.*` - ID card generation
- `leave_requests.*` - Leave management

## Database Schema

### Organizations Table
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    organization_id UUID,  -- For multi-org systems
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);
```

### Permissions Table (Spatie)
```sql
CREATE TABLE permissions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    guard_name VARCHAR(255) NOT NULL,
    organization_id UUID,  -- Scoping field
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(name, guard_name, organization_id)
);
```

### Model Has Permissions (Spatie)
```sql
CREATE TABLE model_has_permissions (
    permission_id BIGINT,
    model_type VARCHAR(255),
    model_id UUID,
    team_id UUID,  -- Organization context
    PRIMARY KEY(permission_id, model_id, model_type, team_id)
);
```

## Permission Assignment Flow

### For Organization Admins

1. **Organization Created** → `OrganizationService::createOrganizationWithAdmin()`
2. **School Created** → Automatic default school
3. **Admin User Created** → User + Profile with organization_id
4. **Role Assigned** → `organization_admin` role scoped to organization
5. **Permissions Assigned** → Full organization permissions via team context
6. **Cache Cleared** → Permission cache invalidated

### For Organization Users

Organization admins can assign permissions to users:

```php
// Set organization context first
setPermissionsTeamId($organization->id);

// Assign role or permission
$user->assignRole('teacher');
$user->givePermissionTo('students.read');
```

## Frontend Integration

### Permission + Feature Check

The frontend uses combined checks:

```typescript
const canAccess = useHasPermissionAndFeature('exams.create');
// Returns true only if:
// 1. User has 'exams.create' permission
// 2. Organization's subscription includes 'exams' feature
```

### Permission Scoping

```typescript
// Frontend automatically sends organization context
const { data: permissions } = usePermissions();
// Returns only permissions accessible to user's organization
```

## Security Considerations

### Access Control

1. **Organization Isolation**
   - Users can only see/access their organization's data
   - API middleware validates organization context
   - Database queries automatically filtered by organization_id

2. **Permission Validation**
   - Every request validates: Authentication → Organization → Permission → Feature
   - Middleware chain: `auth:sanctum` → `organization` → `subscription:read/write` → `feature:{feature}`

3. **Team Context**
   - All permission checks include team_id (organization_id)
   - Prevents cross-organization permission bypass

### Best Practices

1. **Always set organization context** before permission operations
2. **Use service layer** for complex operations (like organization creation)
3. **Validate organization access** in all controllers
4. **Cache permissions** appropriately (cleared on updates)
5. **Log permission operations** for audit trail

## Testing

### Create Test Organization

```bash
# Using Artisan tinker or seeder
php artisan tinker

>>> $service = app(\App\Services\OrganizationService::class);
>>> $result = $service->createOrganizationWithAdmin(
...     ['name' => 'Test Org', 'slug' => 'test-org'],
...     ['email' => 'admin@test.org', 'password' => 'password123', 'full_name' => 'Test Admin']
... );
```

### Verify Permission Scoping

```bash
# Check organization admin permissions
>>> $admin = User::where('email', 'admin@test.org')->first();
>>> setPermissionsTeamId($result['organization']->id);
>>> $admin->hasPermissionTo('users.create'); // Should return true
>>> $admin->hasPermissionTo('organizations.create'); // Should return true (within org)
```

## Troubleshooting

### Common Issues

1. **Permission not found**
   - Ensure organization context is set: `setPermissionsTeamId()`
   - Check permission exists in database with correct organization_id

2. **User can access other org data**
   - Verify middleware chain includes `organization`
   - Check query filters include `organization_id`

3. **Admin creation fails**
   - Verify unique email constraint
   - Check all required fields are provided
   - Review transaction logs

### Debug Commands

```bash
# List permissions for organization
php artisan permission:show --team=<organization_id>

# Clear permission cache
php artisan permission:cache-reset

# Check user permissions
php artisan tinker
>>> $user->getAllPermissions()->pluck('name');
```

## Migration Path

### Existing Organizations

For organizations created before this system:

```php
// Run migration to create admin users
php artisan migrate:create-org-admins

// Or manually via service
$service = app(\App\Services\OrganizationService::class);
// Create school and admin for existing org
```

## Related Files

- **Service**: `backend/app/Services/OrganizationService.php`
- **Controller**: `backend/app/Http/Controllers/OrganizationController.php`
- **Middleware**: `backend/app/Http/Middleware/OrganizationMiddleware.php`
- **Models**: `backend/app/Models/{Organization,User,Profile,SchoolBranding}.php`
- **Frontend Hooks**: `frontend/src/hooks/usePermissions.tsx`
- **Permission Mapping**: `frontend/src/hooks/usePermissions.tsx` (PERMISSION_TO_FEATURE_MAP)

## Future Enhancements

1. **Multi-Organization Users**: Allow users to belong to multiple organizations
2. **Organization Templates**: Predefined org structures for common use cases
3. **Bulk User Import**: CSV import for organization users
4. **Permission Templates**: Role templates for common positions
5. **Audit Logging**: Track all permission changes and access attempts
