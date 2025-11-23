-- ============================================================================
-- Fix Staff INSERT RLS Policy
-- ============================================================================
-- This migration fixes the INSERT policy to work correctly in all scenarios,
-- including dev mode with auth bypass and when users don't have organization_id.
-- ============================================================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert staff in their organization" ON public.staff;

-- Recreate INSERT policy with better handling
-- Note: deleted_at check removed from WITH CHECK since new inserts always have deleted_at = NULL
CREATE POLICY "Users can insert staff in their organization"
    ON public.staff FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Allow insert if:
        -- 1. User's organization_id matches the row's organization_id
        -- 2. OR user is super_admin (organization_id is NULL and role is super_admin)
        (
            organization_id = public.get_current_user_organization_id()
            OR (
                public.get_current_user_organization_id() IS NULL
                AND public.get_current_user_role() = 'super_admin'
            )
        )
    );

