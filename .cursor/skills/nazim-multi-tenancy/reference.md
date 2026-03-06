# Multi-Tenancy Reference

## Security Checklist

- [ ] Table has `organization_id` column
- [ ] Table has `school_id` column (school-scoped)
- [ ] Index on `organization_id` and `school_id`
- [ ] RLS enabled; policies enforce organization isolation
- [ ] Frontend query key includes `profile?.default_school_id`
- [ ] API passes both `organization_id` and `school_id`
- [ ] Controller uses `getCurrentSchoolId()` (never client `school_id`)
- [ ] Mutations validate organization scope
- [ ] Storage paths include `organization_id`

## RLS Policy Pattern (5 policies)

```sql
-- 1. Service role full access
CREATE POLICY "Service role full access to your_table"
    ON public.your_table FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 2. SELECT
CREATE POLICY "Users can read their org your_table"
    ON public.your_table FOR SELECT TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
    );

-- 3. INSERT
CREATE POLICY "Users can insert org your_table"
    ON public.your_table FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
    );

-- 4. UPDATE
CREATE POLICY "Users can update org your_table"
    ON public.your_table FOR UPDATE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
    )
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
    );

-- 5. DELETE
CREATE POLICY "Users can delete org your_table"
    ON public.your_table FOR DELETE TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
    );
```

Policy names must be under 63 characters. Use "org" instead of "organization".

## Common Mistakes

❌ Query key without `default_school_id`
❌ API call without `school_id`
❌ Using client-provided `school_id` in controller
❌ Filtering by `organization_id` only (missing `school_id` for school-scoped)
❌ Allowing `organization_id` change in update mutation
