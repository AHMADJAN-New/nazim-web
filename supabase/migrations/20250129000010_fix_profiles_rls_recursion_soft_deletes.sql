-- Fix profiles RLS policies to avoid recursion with soft deletes
-- The policies were querying profiles table to get organization_id, causing infinite recursion
-- We need to use a helper function or fix the policies to avoid recursion

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can read profiles in their organization" ON public.profiles;

DROP POLICY IF EXISTS "Admins can update profiles in their organization" ON public.profiles;

-- Update helper function to include deleted_at check
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
    -- Get organization_id from profiles, but only if not soft-deleted
    SELECT organization_id INTO user_org_id
    FROM public.profiles
    WHERE id = auth.uid()
    AND deleted_at IS NULL;
    
    RETURN user_org_id;
END;
$$;

-- Drop and recreate helper function with correct return type and deleted_at check
DROP FUNCTION IF EXISTS public.get_current_user_role ();

CREATE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get role from profiles, but only if not soft-deleted
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid()
    AND deleted_at IS NULL;
    
    RETURN user_role;
END;
$$;

-- Recreate the policies using the helper functions to avoid recursion
CREATE POLICY "Users can read profiles in their organization" ON public.profiles FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_organization_id () IS NULL -- Super admin can read all
        )
    );

CREATE POLICY "Admins can update profiles in their organization" ON public.profiles FOR
UPDATE TO authenticated USING (
    deleted_at IS NULL
    AND (
        public.get_current_user_role () IN ('admin', 'super_admin')
        AND (
            organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_organization_id () IS NULL -- Super admin
        )
    )
)
WITH
    CHECK (
        deleted_at IS NULL
        AND public.get_current_user_role () IN ('admin', 'super_admin')
    );

-- Add comments
COMMENT ON FUNCTION public.get_current_user_organization_id() IS 'Helper function to get current user organization_id without RLS recursion';

COMMENT ON FUNCTION public.get_current_user_role () IS 'Helper function to get current user role without RLS recursion';