-- Fix infinite recursion in profiles RLS policy
-- The policy was querying profiles table to get organization_id, causing infinite recursion
-- Solution: Use a SECURITY DEFINER function to get organization_id without triggering RLS

-- Create function to get current user's organization_id (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_organization_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    user_org_id UUID;
BEGIN
    SELECT organization_id INTO user_org_id
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN user_org_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_organization_id() TO authenticated;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can read profiles in their organization" ON public.profiles;

-- Recreate the policy using the function (no recursion)
CREATE POLICY "Users can read profiles in their organization"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        -- Users can read profiles in their organization
        organization_id = public.get_current_user_organization_id()
        -- OR super admin (organization_id IS NULL) can read all
        OR public.get_current_user_organization_id() IS NULL
    );

-- Also fix the admin update policy to avoid recursion
DROP POLICY IF EXISTS "Admins can update profiles in their organization" ON public.profiles;

-- Create function to get current user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN user_role;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- Recreate the admin update policy using the function
CREATE POLICY "Admins can update profiles in their organization"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        -- Check if user is admin or super_admin
        public.get_current_user_role() IN ('admin', 'super_admin')
        AND (
            -- Admin can update profiles in their organization
            organization_id = public.get_current_user_organization_id()
            -- OR super admin (organization_id IS NULL) can update all
            OR public.get_current_user_organization_id() IS NULL
        )
    )
    WITH CHECK (
        -- Same check for WITH CHECK clause
        public.get_current_user_role() IN ('admin', 'super_admin')
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
    );

-- Add comments
COMMENT ON FUNCTION public.get_current_user_organization_id() IS 'Gets the current user''s organization_id without triggering RLS recursion';
COMMENT ON FUNCTION public.get_current_user_role() IS 'Gets the current user''s role without triggering RLS recursion';

