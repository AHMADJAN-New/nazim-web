# Seeding and Sanctum Fix

## Issues Fixed

1. **Sanctum Trait Not Found**: The `Laravel\Sanctum\HasApiTokens` trait was not being found when running seeders.

## Changes Made

### 1. Sanctum Installation
- Ran `composer require laravel/sanctum` to ensure proper installation
- Ran `composer dump-autoload` to regenerate autoload files
- Published Sanctum configuration files

### 2. Database Seeder (`database/seeders/DatabaseSeeder.php`)
- Updated to work with `auth.users` table instead of default Laravel `users` table
- Creates default admin user:
  - **Email**: `admin@nazim.local`
  - **Password**: `Admin123!@#`
  - **Role**: `super_admin`
  - **Organization**: `null` (super admin has no organization)

### 3. User Model
- Already configured correctly with:
  - `protected $table = 'auth.users'`
  - `protected $keyType = 'string'` (for UUID)
  - `public $incrementing = false`
  - `protected $primaryKey = 'id'`

## Running the Seeder

To seed the default admin user, run:

```bash
cd backend
php artisan db:seed --force
```

The seeder will:
1. Check if the admin user already exists
2. If not, create the user in `auth.users` table
3. Create the corresponding profile in `profiles` table

## Testing

After seeding, you can test the login with:
- **Email**: `admin@nazim.local`
- **Password**: `Admin123!@#`

## Troubleshooting

If you still see "Trait not found" errors:

1. Make sure Sanctum is installed:
   ```bash
   composer show laravel/sanctum
   ```

2. Regenerate autoload files:
   ```bash
   composer dump-autoload
   ```

3. Clear Laravel caches:
   ```bash
   php artisan config:clear
   php artisan cache:clear
   ```

4. If Sanctum is still not found, reinstall it:
   ```bash
   composer require laravel/sanctum
   ```

## Next Steps

1. Run migrations to ensure all tables exist:
   ```bash
   php artisan migrate --force
   ```

2. Run the seeder:
   ```bash
   php artisan db:seed --force
   ```

3. Test the API endpoints:
   - `GET /api/organizations` (should return empty array if no organizations exist)
   - `POST /api/auth/login` (should work with seeded admin credentials)
