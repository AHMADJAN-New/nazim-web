-- Optimize rooms RLS policies for better performance
-- The current policies query school_branding and profiles tables for every row check
-- This migration uses helper functions and simplifies the logic

-- Create helper function to get user's school IDs (cached, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_current_user_school_ids()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    user_org_id UUID;
    school_ids UUID[];
BEGIN
    -- Get user's organization_id
    user_org_id := public.get_current_user_organization_id();
    
    -- If super admin (org_id IS NULL), return NULL (can access all schools)
    IF user_org_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get all school IDs for user's organization
    SELECT ARRAY_AGG(id) INTO school_ids
    FROM public.school_branding
    WHERE organization_id = user_org_id
    AND deleted_at IS NULL;
    
    RETURN school_ids;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_current_user_school_ids() TO authenticated;

-- Drop old policies
DROP POLICY IF EXISTS "Users can read rooms for their organization schools" ON public.rooms;
DROP POLICY IF EXISTS "Users can insert rooms for their organization schools" ON public.rooms;
DROP POLICY IF EXISTS "Users can update rooms for their organization schools" ON public.rooms;
DROP POLICY IF EXISTS "Users can delete rooms for their organization schools" ON public.rooms;

-- Create optimized policies using helper function
-- This avoids querying profiles and school_branding for every row

-- SELECT policy: Users can read rooms for schools in their organization
CREATE POLICY "Users can read rooms for their organization schools"
    ON public.rooms
    FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            -- Super admin can see all (get_current_user_organization_id() returns NULL)
            public.get_current_user_organization_id() IS NULL
            OR
            -- Regular users: room's school_id must be in their organization's schools
            school_id = ANY(public.get_current_user_school_ids())
        )
    );

-- INSERT policy: Users can insert rooms for schools in their organization
CREATE POLICY "Users can insert rooms for their organization schools"
    ON public.rooms
    FOR INSERT
    TO authenticated
    WITH CHECK (
        deleted_at IS NULL
        AND (
            -- Super admin can insert for any school
            public.get_current_user_organization_id() IS NULL
            OR
            -- Regular users: room's school_id must be in their organization's schools
            school_id = ANY(public.get_current_user_school_ids())
        )
    );

-- UPDATE policy: Users can update rooms for schools in their organization
CREATE POLICY "Users can update rooms for their organization schools"
    ON public.rooms
    FOR UPDATE
    TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            -- Super admin can update any room
            public.get_current_user_organization_id() IS NULL
            OR
            -- Regular users: room's school_id must be in their organization's schools
            school_id = ANY(public.get_current_user_school_ids())
        )
    )
    WITH CHECK (
        deleted_at IS NULL
        AND (
            -- Super admin can update any room
            public.get_current_user_organization_id() IS NULL
            OR
            -- Regular users: room's school_id must be in their organization's schools
            school_id = ANY(public.get_current_user_school_ids())
        )
    );

-- DELETE policy: Users can delete rooms for schools in their organization
CREATE POLICY "Users can delete rooms for their organization schools"
    ON public.rooms
    FOR DELETE
    TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            -- Super admin can delete any room
            public.get_current_user_organization_id() IS NULL
            OR
            -- Regular users: room's school_id must be in their organization's schools
            school_id = ANY(public.get_current_user_school_ids())
        )
    );

-- Add comment
COMMENT ON FUNCTION public.get_current_user_school_ids() IS 'Returns array of school IDs for current user organization. Returns NULL for super admin. Used in RLS policies for performance.';

