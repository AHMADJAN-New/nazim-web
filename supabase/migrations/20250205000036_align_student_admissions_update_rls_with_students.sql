-- ============================================================================
-- Align student_admissions UPDATE RLS policy with working students policy
-- ============================================================================
-- This migration makes the UPDATE policy for student_admissions behave
-- exactly like the students UPDATE policy (see 20250205000028_fix_students_rls_handle_null_role.sql),
-- which is already confirmed to work in the app.
--
-- Key points:
-- - No deleted_at checks in USING/WITH CHECK (soft delete is allowed)
-- - Super admin (or NULL role) can update any row
-- - Regular users can only update rows in their organization / allowed schools
-- ============================================================================

-- Drop any existing UPDATE policy variants for student_admissions
DROP POLICY IF EXISTS "Users can update student_admissions" ON public.student_admissions;
DROP POLICY IF EXISTS "Users can update their organization's student_admissions" ON public.student_admissions;
DROP POLICY IF EXISTS "Authenticated users can update student_admissions" ON public.student_admissions;

-- Recreate UPDATE policy mirroring the students UPDATE policy
CREATE POLICY "Users can update student_admissions" ON public.student_admissions
FOR UPDATE TO authenticated
USING (
    -- Default allow if role is NULL (profile doesn't exist or role not set)
    -- OR if user is super_admin
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
WITH CHECK (
    -- WITH CHECK: Same logic - default allow if role NULL or super_admin
    public.get_current_user_role() IS NULL
    OR public.get_current_user_role() = 'super_admin'
    OR (
        organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR school_id = ANY(public.get_current_user_school_ids())
        )
    )
);

COMMENT ON POLICY "Users can update student_admissions" ON public.student_admissions IS
  'UPDATE policy aligned with students: super_admin or NULL role can update any row; regular users can update rows in their organization / allowed schools. Soft deletes are allowed by setting deleted_at in the row.';


