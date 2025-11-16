# Development Scripts

## Seed Super Admin User

This script creates a super admin user for local development.

### Method 1: Using SQL Migration (Recommended)

The migration file `supabase/migrations/20250128000000_seed_super_admin.sql` will automatically create the super admin user when you run migrations.

To apply it manually:

```bash
# Using PowerShell
Get-Content supabase\migrations\20250128000000_seed_super_admin.sql | docker exec -i supabase_db_wkrzoelctjwpiwdswmdj psql -U postgres -d postgres

# Or using Supabase CLI (if migrations are set up)
supabase db reset
```

### Method 2: Using TypeScript Script

```bash
npm run seed:admin
```

Or directly:

```bash
npx tsx scripts/seed-admin.ts
```

### Credentials

After running the seed script, you can log in with:

- **Email:** `admin@nazim.local`
- **Password:** `Admin123!@#`
- **Role:** `super_admin`
- **Organization:** None (super admins don't belong to organizations)

### Notes

- This seed script is for **development only** - never run it in production!
- The user is automatically created with email confirmation (no email verification needed)
- The profile is automatically set to `super_admin` role with `organization_id = NULL`
- If the user already exists, the script will update the profile to ensure it's a super admin

