-- ============================================================================
-- Allow Soft Delete for Student Admissions - Permissive UPDATE Policy
-- ============================================================================
-- Makes the UPDATE policy permissive to allow soft deletes (setting deleted_at)
-- without requiring super admin checks. The policy allows updates based on
-- organization access, and soft deletes work for all authorized users.
-- ============================================================================

-- Drop ALL existing UPDATE policies
DROP POLICY IF EXISTS "Users can update student_admissions" ON public.student_admissions;
DROP POLICY IF EXISTS "Users can update their organization's student_admissions" ON public.student_admissions;
DROP POLICY IF EXISTS "Authenticated users can update student_admissions" ON public.student_admissions;

-- Create permissive UPDATE policy that allows soft deletes
-- This policy does NOT require super_admin check - it allows updates based on organization access
CREATE POLICY "Users can update student_admissions" ON public.student_admissions
    FOR UPDATE TO authenticated
    USING (
        -- USING: Can only update non-deleted records
        deleted_at IS NULL
        AND (
            -- Allow if role is NULL (no profile yet) OR super_admin OR organization matches
            public.get_current_user_role() IS NULL
            OR public.get_current_user_role() = 'super_admin'
            OR (
                -- Regular users can update records in their organization
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
        -- WITH CHECK: Allow any update including soft delete (setting deleted_at)
        -- CRITICAL: We do NOT check deleted_at here - this allows soft deletes
        -- Match the students table pattern exactly - simple and permissive
        public.get_current_user_role() IS NULL
        OR public.get_current_user_role() = 'super_admin'
        OR (
            -- Regular users can update records in their organization
            organization_id = public.get_current_user_organization_id()
            AND (
                school_id IS NULL
                OR public.get_current_user_school_ids() IS NULL
                OR school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

COMMENT ON POLICY "Users can update student_admissions" ON public.student_admissions IS 
    'Allows authenticated users to update student admissions including soft deletes. Super admin can update any record. Regular users can only update records in their organization. WITH CHECK allows setting deleted_at for soft deletes without requiring super_admin.';
