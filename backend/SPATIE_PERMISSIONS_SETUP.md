# Spatie Laravel Permission Setup with Organization Support

## ✅ What Has Been Done

1. **Installed Spatie Laravel Permission Package**
   - Added to `composer.json`
   - Package installed successfully

2. **Created Custom Migration with Organization Support**
   - Migration file: `2024_01_01_000000_create_permission_tables_with_organization.php`
   - All tables include `organization_id` column
   - Foreign keys to `organizations` table
   - Unique constraints include `organization_id`

3. **Created Custom Models**
   - `App\Models\Permission` - Extends Spatie Permission with organization support
   - `App\Models\Role` - Extends Spatie Role with organization support
   - Both models have `forOrganization()` scope

4. **Updated User Model**
   - Added `HasRoles` trait from Spatie
   - User can now use Spatie permission methods

5. **Created Permission Config**
   - `config/permission.php` configured
   - Teams feature enabled (using `organization_id` as team foreign key)
   - Custom models specified

6. **Updated PermissionController**
   - Now uses Spatie Permission models
   - Uses `$user->getAllPermissions()` for user permissions

## 📋 Next Steps

### 1. Run Migrations

**IMPORTANT:** Since you're using an existing database, you have two options:

**Option A: Run only the new permission tables migration**
```bash
cd backend
php artisan migrate --path=database/migrations/2024_01_01_000000_create_permission_tables_with_organization.php
```

**Option B: If you want to keep using your existing permission tables**
- You'll need to migrate data from old tables to new Spatie tables
- Or modify the migration to use your existing table structure

### 2. Fix Sessions Table Issue

The error shows sessions table doesn't exist. You have two options:

**Option A: Create sessions table (if using database sessions)**
```bash
php artisan session:table
php artisan migrate
```

**Option B: Use file-based sessions (already in .env)**
Make sure `.env` has:
```env
SESSION_DRIVER=file
```

### 3. Seed Initial Permissions and Roles

Create a seeder to migrate your existing permissions to Spatie format:

```php
php artisan make:seeder PermissionSeeder
```

Then migrate your existing permissions data.

### 4. Update Controllers to Use Spatie

Example usage in controllers:

```php
// Check permission
if ($user->can('students.create')) {
    // User has permission
}

// Assign role
$user->assignRole('admin');

// Give permission
$user->givePermissionTo('students.create');

// With organization context
$user->givePermissionTo('students.create', $organizationId);
```

## 🔧 Configuration Details

### Permission Config (`config/permission.php`)

- **Teams enabled**: `true` (uses `organization_id` as team foreign key)
- **Custom models**: `App\Models\Permission` and `App\Models\Role`
- **Cache**: 24 hours expiration

### Migration Structure

All permission tables include:
- `organization_id` (UUID, nullable, foreign key to organizations)
- Index on `organization_id` for performance
- Unique constraints include `organization_id`

### Models

**Permission Model:**
- Extends `Spatie\Permission\Models\Permission`
- Has `forOrganization()` scope
- Includes `resource`, `action`, `description` fields

**Role Model:**
- Extends `Spatie\Permission\Models\Role`
- Has `forOrganization()` scope
- Includes `description` field

## 📝 Usage Examples

### Creating Permissions

```php
use App\Models\Permission;

// Global permission
$permission = Permission::create([
    'name' => 'students.create',
    'guard_name' => 'web',
    'organization_id' => null,
    'resource' => 'students',
    'action' => 'create',
]);

// Organization-specific permission
$permission = Permission::create([
    'name' => 'custom.report',
    'guard_name' => 'web',
    'organization_id' => $orgId,
    'resource' => 'reports',
    'action' => 'view',
]);
```

### Assigning Roles

```php
use App\Models\Role;

// Create role
$role = Role::create([
    'name' => 'admin',
    'guard_name' => 'web',
    'organization_id' => $orgId,
]);

// Assign role to user
$user->assignRole($role);

// Or by name with organization
$user->assignRole('admin', $orgId);
```

### Checking Permissions

```php
// Check if user has permission
if ($user->can('students.create')) {
    // Has permission
}

// Check with organization context
$user->hasPermissionTo('students.create', $organizationId);

// Get all permissions
$permissions = $user->getAllPermissions();
```

## ⚠️ Important Notes

1. **Existing Permission Tables**: If you have existing `permissions`, `role_permissions`, etc. tables, you'll need to either:
   - Migrate data to new Spatie tables
   - Or modify the migration to work with your existing structure

2. **Organization Context**: Spatie's teams feature uses `organization_id` as the team foreign key. This means permissions are scoped by organization.

3. **Migration Order**: Make sure the `organizations` table exists before running the permission migration.

4. **Sessions**: The sessions table error needs to be fixed. Either create the table or use file-based sessions.

## 🚀 Testing

After setup, test with:

```php
// In tinker
php artisan tinker

$user = User::first();
$user->givePermissionTo('students.create');
$user->can('students.create'); // Should return true
```
