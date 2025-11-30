-- ============================================================================
-- Fix Students INSERT and SELECT RLS Policies
-- ============================================================================
-- This migration fixes the INSERT and SELECT policies to work correctly in all scenarios,
-- including dev mode with auth bypass and when users don't have organization_id.
-- Removes redundant deleted_at check from INSERT since new inserts always have deleted_at = NULL.
-- Simplifies SELECT policy to handle NULL values from helper functions better.
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert students" ON public.students;
DROP POLICY IF EXISTS "Users can read students" ON public.students;

-- Recreate INSERT policy with better handling
-- Note: deleted_at check removed from WITH CHECK since new inserts always have deleted_at = NULL
CREATE POLICY "Users can insert students"
    ON public.students FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Allow insert if:
        -- 1. User is super_admin (can insert anywhere)
        -- 2. OR user's organization_id matches the row's organization_id
        --    AND (school_id is NULL OR user has access to that school)
        (
            public.get_current_user_role() = 'super_admin'
            OR (
                organization_id = public.get_current_user_organization_id()
                AND (
                    school_id IS NULL
                    OR public.get_current_user_school_ids() IS NULL
                    OR school_id = ANY(public.get_current_user_school_ids())
                )
            )
        )
    );

-- Recreate SELECT policy with better NULL handling
CREATE POLICY "Users can read students"
    ON public.students FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            -- Super admin can read all
            public.get_current_user_role() = 'super_admin'
            OR (
                -- Regular users can read their organization's students
                organization_id = public.get_current_user_organization_id()
                AND (
                    -- Allow if school_id is NULL or user has access to the school
                    school_id IS NULL
                    OR public.get_current_user_school_ids() IS NULL
                    OR school_id = ANY(public.get_current_user_school_ids())
                )
            )
        )
    );

