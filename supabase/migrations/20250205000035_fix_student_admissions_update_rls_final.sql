-- ============================================================================
-- Fix Student Admissions UPDATE RLS Policy - Final Fix
-- ============================================================================
-- This migration ensures the UPDATE policy correctly allows soft deletes
-- by removing deleted_at check from WITH CHECK clause.
-- Also handles super_admin with NULL organization_id correctly.
-- ============================================================================

-- Drop ALL possible UPDATE policy names (in case of naming variations)
DROP POLICY IF EXISTS "Users can update student_admissions" ON public.student_admissions;
DROP POLICY IF EXISTS "Users can update their organization's student_admissions" ON public.student_admissions;
DROP POLICY IF EXISTS "Authenticated users can update student_admissions" ON public.student_admissions;

-- Recreate UPDATE policy with correct logic
CREATE POLICY "Users can update student_admissions" ON public.student_admissions
    FOR UPDATE TO authenticated
    USING (
        -- USING: Check OLD row - can only update non-deleted records
        deleted_at IS NULL
        AND (
            -- Super admin or NULL role can update any record
            public.get_current_user_role() IS NULL
            OR public.get_current_user_role() = 'super_admin'
            OR (
                -- Regular users can update admissions in their organization
                organization_id = public.get_current_user_organization_id()
                AND (
                    school_id IS NULL
                    OR public.get_current_user_school_ids() IS NULL
                    OR school_id = ANY(public.get_current_user_school_ids())
                )
            )
        )
    )
    WITH CHECK (
        -- WITH CHECK: Check NEW row - allow setting deleted_at for soft deletes
        -- CRITICAL: We do NOT check deleted_at here to allow soft deletes
        -- Super admin or NULL role can update any record (including setting deleted_at)
        public.get_current_user_role() IS NULL
        OR public.get_current_user_role() = 'super_admin'
        OR (
            -- Regular users can update admissions in their organization
            -- Check organization_id from the NEW row (after update)
            organization_id = public.get_current_user_organization_id()
            AND (
                school_id IS NULL
                OR public.get_current_user_school_ids() IS NULL
                OR school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

-- Verify the policy was created
COMMENT ON POLICY "Users can update student_admissions" ON public.student_admissions IS 
    'Allows authenticated users to update student admissions. Super admin can update any record. Regular users can only update records in their organization. WITH CHECK allows setting deleted_at for soft deletes.';

