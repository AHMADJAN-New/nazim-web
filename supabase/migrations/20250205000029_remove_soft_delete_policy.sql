-- ============================================================================
-- Remove Soft Delete Policy from Students
-- ============================================================================
-- Removes the deleted_at IS NULL check from SELECT policy so deleted records
-- are visible. Users can still see all students regardless of deleted_at status.
-- ============================================================================

-- ============================================================================
-- SELECT Policy: Remove deleted_at check
-- ============================================================================
DROP POLICY IF EXISTS "Users can read students" ON public.students;

CREATE POLICY "Users can read students" ON public.students
FOR SELECT TO authenticated
USING (
    -- Removed deleted_at IS NULL check - show all records including deleted ones
    -- Default allow if role is NULL OR if user is super_admin
    public.get_current_user_role() IS NULL
    OR public.get_current_user_role() = 'super_admin'
    OR (
        -- Regular users can read students in their organization
        organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR school_id = ANY(public.get_current_user_school_ids())
        )
    )
);

