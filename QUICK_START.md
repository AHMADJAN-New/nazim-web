# Quick Start Guide - Laravel Backend

## Default Admin Credentials

- **Email**: `admin@nazim.local`
- **Password**: `Admin123!@#`

## Step 1: Start Laravel Backend

```bash
cd backend
php artisan serve
```

The API will be available at `http://localhost:8000`

## Step 2: Start Frontend

```bash
npm run dev
```

The frontend will be available at `http://localhost:8080`

## Step 3: Login

1. Go to `http://localhost:8080/auth`
2. Enter:
   - Email: `admin@nazim.local`
   - Password: `Admin123!@#`
3. Click "Sign In"

## Troubleshooting

### CSP Error (Content Security Policy)

If you see CSP errors, the security.ts file has been updated to allow `http://localhost:8000`. Refresh the page after starting both servers.

### "Network error: Unable to connect to API server"

1. Make sure Laravel backend is running: `cd backend && php artisan serve`
2. Check if it's accessible: Open `http://localhost:8000/health` in browser
3. Verify `.env` has correct API URL: `VITE_API_URL=http://localhost:8000/api`

### "Organizations not found"

1. Make sure you've run migrations: `cd backend && php artisan migrate`
2. Create an organization via API or database

### Creating Admin User

If admin doesn't exist, create it:

```bash
cd backend
php artisan tinker
```

```php
$userId = \DB::table('auth.users')->insertGetId([
    'email' => 'admin@nazim.local',
    'encrypted_password' => \Hash::make('Admin123!@#'),
    'email_confirmed_at' => now(),
    'created_at' => now(),
    'updated_at' => now(),
]);

\DB::table('profiles')->insert([
    'id' => $userId,
    'email' => 'admin@nazim.local',
    'full_name' => 'Super Admin',
    'role' => 'super_admin',
    'organization_id' => null,
    'is_active' => true,
    'created_at' => now(),
    'updated_at' => now(),
]);
```

## Environment Variables

### Frontend `.env`:
```env
VITE_API_URL=http://localhost:8000/api
```

### Backend `.env`:
```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=nazim_web
DB_USERNAME=postgres
DB_PASSWORD=root

FRONTEND_URL=http://localhost:8080
```
