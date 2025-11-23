-- ============================================================================
-- Fix Staff RLS Policies for Delete and Update
-- ============================================================================
-- This migration fixes the DELETE and UPDATE policies to work correctly
-- with hard deletes and updates.
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can update their organization's staff" ON public.staff;
DROP POLICY IF EXISTS "Users can delete their organization's staff" ON public.staff;

-- Recreate UPDATE policy - allow updates to non-deleted staff
CREATE POLICY "Users can update their organization's staff"
    ON public.staff FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_role() = 'super_admin'
        )
    )
    WITH CHECK (
        -- Allow updates where organization_id matches user's org or user is super_admin
        -- Note: We don't check deleted_at in WITH CHECK to allow setting it
        (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_role() = 'super_admin'
        )
    );

-- Recreate DELETE policy - allow hard delete of non-deleted staff
CREATE POLICY "Users can delete their organization's staff"
    ON public.staff FOR DELETE TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_role() = 'super_admin'
        )
    );

