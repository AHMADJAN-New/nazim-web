-- Fix infinite recursion in staff RLS policies
-- The policies were querying profiles table to get organization_id, causing infinite recursion
-- Solution: Use the SECURITY DEFINER function we created earlier

-- Drop existing staff policies
DROP POLICY IF EXISTS "Users can read their organization's staff" ON public.staff;
DROP POLICY IF EXISTS "Users can insert staff in their organization" ON public.staff;
DROP POLICY IF EXISTS "Users can update their organization's staff" ON public.staff;
DROP POLICY IF EXISTS "Users can delete their organization's staff" ON public.staff;

-- Recreate policies using the function (no recursion)
CREATE POLICY "Users can read their organization's staff"
    ON public.staff
    FOR SELECT
    TO authenticated
    USING (
        -- Users can read staff in their organization
        organization_id = public.get_current_user_organization_id()
        -- OR super admin (organization_id IS NULL) can read all
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can insert staff in their organization"
    ON public.staff
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Users can insert staff in their organization
        organization_id = public.get_current_user_organization_id()
        -- OR super admin (organization_id IS NULL) can insert anywhere
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can update their organization's staff"
    ON public.staff
    FOR UPDATE
    TO authenticated
    USING (
        -- Users can update staff in their organization
        organization_id = public.get_current_user_organization_id()
        -- OR super admin (organization_id IS NULL) can update all
        OR public.get_current_user_organization_id() IS NULL
    )
    WITH CHECK (
        -- Same check for WITH CHECK clause
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can delete their organization's staff"
    ON public.staff
    FOR DELETE
    TO authenticated
    USING (
        -- Users can delete staff in their organization
        organization_id = public.get_current_user_organization_id()
        -- OR super admin (organization_id IS NULL) can delete all
        OR public.get_current_user_organization_id() IS NULL
    );

