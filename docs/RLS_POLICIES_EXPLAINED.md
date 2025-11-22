# 🔒 Row-Level Security (RLS) Policies Explained

## What is Row-Level Security (RLS)?

Row-Level Security is a database-level security feature that controls **which rows** users can access in a table. It's like having a bouncer at the database level that checks permissions before allowing any operation.

## Why Do We Need RLS in Supabase?

### 1. **Security at the Database Level**
- Even if your frontend code has bugs, the database enforces security
- Prevents unauthorized access even if someone bypasses your React app
- Protects against SQL injection and direct database access

### 2. **Multi-Tenancy Support (SaaS)**
For a SaaS application like Nazim, you'll likely have:
- **Multiple schools/organizations** using the same database
- Each school should only see **their own data**
- RLS policies can filter data by `organization_id` or `school_id`

### 3. **Role-Based Access Control**
Different user roles need different permissions:
- **Super Admin**: Full access to all schools
- **School Admin**: Access only to their school's data
- **Teacher**: Access only to their classes
- **Student**: Access only to their own records

## Understanding the Three User Types

### 1. **`authenticated` Role** (Logged-In Users)
```sql
CREATE POLICY "Allow authenticated users to read buildings"
    ON public.buildings
    FOR SELECT
    TO authenticated
    USING (true);
```

**Who are they?**
- Users who have successfully logged in
- Have a valid JWT token from Supabase Auth
- Their identity is verified

**When to use:**
- ✅ **Production**: All logged-in users should access data
- ✅ **SaaS**: Filter by organization/school ID
- ✅ **Role-based**: Check user roles (admin, teacher, etc.)

### 2. **`anon` Role** (Not Logged-In / Anonymous)
```sql
CREATE POLICY "Allow anon users to read buildings"
    ON public.buildings
    FOR SELECT
    TO anon
    USING (true);
```

**Who are they?**
- Users who haven't logged in
- Public API requests without authentication
- Development mode (when auth is bypassed)

**When to use:**
- ⚠️ **Development**: Allows testing without login
- ⚠️ **Public Data**: For public-facing features (like public school info)
- ❌ **Production**: Usually removed for sensitive data

### 3. **`service_role` Role** (Backend/Admin)
```sql
CREATE POLICY "Allow service role full access to buildings"
    ON public.buildings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
```

**Who are they?**
- Backend services using the service role key
- Admin scripts and migrations
- Server-side operations that need full access

**When to use:**
- ✅ **Backend Operations**: Server-side data processing
- ✅ **Admin Tools**: Management scripts
- ✅ **Migrations**: Database schema changes

## Current Setup Analysis

### What We Have Now:
```sql
-- Authenticated users (logged in)
TO authenticated  -- ✅ Good for production

-- Anonymous users (not logged in)
TO anon           -- ⚠️ Only for development

-- Service role (backend)
TO service_role   -- ✅ For admin operations
```

### Why We Have `anon` Policies:
1. **Development Mode**: Your app bypasses auth in dev mode
   - Without `anon` policies, you'd get RLS errors
   - Makes local development easier

2. **Testing**: Allows testing without setting up auth

3. **Future Public Features**: If you add public pages (like school directory)

## How This Benefits Your SaaS App

### Scenario 1: Multi-School Architecture
```sql
-- Better RLS policy for SaaS
CREATE POLICY "Users can only see their school's buildings"
    ON public.buildings
    FOR SELECT
    TO authenticated
    USING (
        -- Check if user's school_id matches building's school_id
        school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    );
```

**Benefits:**
- School A can't see School B's buildings
- Automatic data isolation
- No need to filter in application code

### Scenario 2: Role-Based Access
```sql
-- Teachers can read, but only admins can modify
CREATE POLICY "Teachers can read buildings"
    ON public.buildings
    FOR SELECT
    TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher')
    );

CREATE POLICY "Only admins can modify buildings"
    ON public.buildings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );
```

**Benefits:**
- Teachers can view but not modify
- Admins have full control
- Security enforced at database level

### Scenario 3: Organization Isolation
```sql
-- Each organization sees only their data
CREATE POLICY "Organization isolation"
    ON public.buildings
    FOR ALL
    TO authenticated
    USING (
        organization_id = (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id = (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );
```

## Recommended Setup for Production

### Option 1: Remove `anon` Policies (Most Secure)
```sql
-- Remove these in production:
DROP POLICY IF EXISTS "Allow anon users to read buildings" ON public.buildings;
DROP POLICY IF EXISTS "Allow anon users to insert buildings" ON public.buildings;
-- ... etc
```

**When:** Production environment, sensitive data

### Option 2: Keep `anon` for Public Data Only
```sql
-- Keep anon for public read-only data
CREATE POLICY "Public can read buildings"
    ON public.buildings
    FOR SELECT
    TO anon
    USING (is_public = true);  -- Only public buildings
```

**When:** You have public-facing features

### Option 3: Environment-Based Policies
```sql
-- Use environment variable or config table
CREATE POLICY "Conditional anon access"
    ON public.buildings
    FOR SELECT
    TO anon
    USING (
        -- Only allow in development
        current_setting('app.environment', true) = 'development'
    );
```

## Best Practices for Your SaaS App

### 1. **Always Use RLS**
- Never disable RLS in production
- Even for "admin" tables, use `service_role` policies

### 2. **Principle of Least Privilege**
- Start with restrictive policies
- Add permissions as needed
- Don't use `USING (true)` for everything

### 3. **Multi-Tenancy First**
- Design with organization/school isolation from the start
- Use `organization_id` or `school_id` in all policies

### 4. **Role-Based Policies**
- Check user roles in policies
- Different roles = different permissions
- Example: `role = 'admin'` vs `role = 'teacher'`

### 5. **Test Both Roles**
- Test with authenticated users
- Test with anon users (if policies exist)
- Test with service_role (for admin operations)

## Migration Strategy

### Development (Current)
```sql
-- Allow both authenticated and anon
TO authenticated  -- Real users
TO anon            -- Dev mode
TO service_role   -- Admin
```

### Production (Recommended)
```sql
-- Remove anon, add organization filtering
TO authenticated   -- With organization_id check
TO service_role    -- Admin operations
-- Remove: TO anon
```

## Example: Production-Ready Policy

```sql
-- Production policy for buildings table
CREATE POLICY "Users can access their organization's buildings"
    ON public.buildings
    FOR ALL
    TO authenticated
    USING (
        organization_id = (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
        AND (
            -- Admins can do everything
            (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
            OR
            -- Teachers can only read
            (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
        )
    )
    WITH CHECK (
        organization_id = (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );
```

## Summary

| Role | Use Case | Production | Development |
|------|----------|------------|-------------|
| `authenticated` | Logged-in users | ✅ Required | ✅ Required |
| `anon` | Not logged-in | ⚠️ Optional | ✅ Helpful |
| `service_role` | Backend/admin | ✅ Required | ✅ Required |

**For Your SaaS App:**
1. Keep `authenticated` policies - always needed
2. Remove `anon` policies in production (or make them very restrictive)
3. Add organization/school filtering to `authenticated` policies
4. Use `service_role` for admin operations
5. Test thoroughly before deploying

## Next Steps

1. **Add Organization/School ID** to your tables
2. **Update Policies** to filter by organization
3. **Remove `anon` Policies** before production launch
4. **Add Role Checks** to policies for fine-grained control
5. **Test Multi-Tenancy** to ensure data isolation

