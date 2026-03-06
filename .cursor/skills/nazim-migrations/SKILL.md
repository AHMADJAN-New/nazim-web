---
name: nazim-migrations
description: Enforces Nazim database migration patterns. Use when creating new tables, adding columns, or writing SQL migrations. Covers UUID primary keys, organization_id, school_id, RLS, search_path, policy naming, and Laravel migration format.
---

# Nazim Database Migrations

All migrations must follow these patterns for security, consistency, and multi-tenancy.

## UUID Primary Keys (REQUIRED)

**ALL tables** use UUID primary keys.

### SQL
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

### Laravel
```php
$table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
```

### Model
```php
public $incrementing = false;
protected $keyType = 'string';
// In boot(): static::creating() with Str::uuid() if not set
```

## Tenant Tables

- `organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`
- `school_id UUID` (for school-scoped resources)
- Index on `organization_id` and `school_id`
- RLS enabled; policies enforce organization isolation

## Laravel Migration Template

```php
Schema::create('your_table', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
    $table->uuid('organization_id')->nullable();
    $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
    $table->uuid('school_id')->nullable();  // if school-scoped
    // ... other columns
    $table->timestamps();
    $table->timestamp('deleted_at')->nullable();
    $table->index('organization_id');
    $table->index('school_id');
});
```

## SQL Functions

**ALWAYS** set `search_path = public` to prevent injection:

```sql
CREATE OR REPLACE FUNCTION public.your_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- body
    RETURN NEW;
END;
$$;
```

## RLS Policies

- Policy names: **under 63 characters** (use "org" not "organization")
- **Single consolidated policy per action** (no multiple permissive policies)
- Fresh migrations: **omit** `DROP IF EXISTS` (no NOTICE noise)

## Checklist

- [ ] UUID primary key
- [ ] organization_id (and school_id if school-scoped)
- [ ] Indexes on organization_id, school_id
- [ ] RLS enabled
- [ ] Functions have `SET search_path = public`
- [ ] Policy names under 63 chars
- [ ] No multiple permissive policies for same action
- [ ] No unnecessary DROP IF EXISTS (fresh migrations)

## Additional Resources

- Full SQL and Laravel migration templates: [reference.md](reference.md)
