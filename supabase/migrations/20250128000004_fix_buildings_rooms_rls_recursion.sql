-- Fix infinite recursion in buildings and rooms RLS policies
-- The policies were querying profiles table to get organization_id, causing infinite recursion
-- Solution: Use the SECURITY DEFINER function we created earlier

-- Fix buildings policies
DROP POLICY IF EXISTS "Users can read their organization's buildings" ON public.buildings;
DROP POLICY IF EXISTS "Users can insert buildings in their organization" ON public.buildings;
DROP POLICY IF EXISTS "Users can update their organization's buildings" ON public.buildings;
DROP POLICY IF EXISTS "Users can delete their organization's buildings" ON public.buildings;

CREATE POLICY "Users can read their organization's buildings"
    ON public.buildings
    FOR SELECT
    TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can insert buildings in their organization"
    ON public.buildings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can update their organization's buildings"
    ON public.buildings
    FOR UPDATE
    TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_organization_id() IS NULL
    )
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can delete their organization's buildings"
    ON public.buildings
    FOR DELETE
    TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_organization_id() IS NULL
    );

-- Fix rooms policies
DROP POLICY IF EXISTS "Users can read their organization's rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can insert rooms in their organization" ON public.rooms;
DROP POLICY IF EXISTS "Users can update their organization's rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can delete their organization's rooms" ON public.rooms;

CREATE POLICY "Users can read their organization's rooms"
    ON public.rooms
    FOR SELECT
    TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can insert rooms in their organization"
    ON public.rooms
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can update their organization's rooms"
    ON public.rooms
    FOR UPDATE
    TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_organization_id() IS NULL
    )
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can delete their organization's rooms"
    ON public.rooms
    FOR DELETE
    TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_organization_id() IS NULL
    );


