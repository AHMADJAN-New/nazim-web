# How to Apply Migrations to Supabase

The 404 errors you're seeing mean the database tables don't exist yet. You need to run the migrations in your Supabase project.

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Open the migration files in this order:
   - `20250127120000_create_buildings_table.sql`
   - `20250127120001_create_rooms_table.sql`
5. Copy the contents of each file
6. Paste into the SQL Editor
7. Click **Run** (or press Ctrl+Enter)
8. Verify the tables were created by checking the **Table Editor** section

## Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Make sure you're logged in
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

## Important Notes

- The `rooms` table has a foreign key to `staff` table. If the `staff` table doesn't exist yet, you'll get an error. You can either:
  1. Comment out the `staff_id` foreign key constraint temporarily
  2. Create a dummy `staff` table first
  3. Wait until you create the staff module

- After running migrations, refresh your browser and the 404 errors should be gone.

## Verify Tables Were Created

1. In Supabase Dashboard, go to **Table Editor**
2. You should see:
   - `buildings` table
   - `rooms` table

## Troubleshooting

If you get foreign key errors:
- The `staff` table doesn't exist yet (this is expected)
- You can temporarily modify the rooms migration to make `staff_id` foreign key optional or remove it until the staff table is created

