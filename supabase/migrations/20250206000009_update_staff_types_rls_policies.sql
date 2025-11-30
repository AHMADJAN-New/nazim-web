-- ============================================================================
-- Update Staff Types RLS Policies to Use Permission-Based Checks
-- ============================================================================
-- Replaces role-based checks with permission-based checks using
-- has_permission_for_resource() function.
-- ============================================================================

DROP POLICY IF EXISTS "Users can read staff_types" ON public.staff_types;
DROP POLICY IF EXISTS "Users can insert staff_types" ON public.staff_types;
DROP POLICY IF EXISTS "Users can update staff_types" ON public.staff_types;
DROP POLICY IF EXISTS "Users can delete staff_types" ON public.staff_types;

CREATE POLICY "Users can read staff_types" ON public.staff_types
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('staff_types', 'read')
);

CREATE POLICY "Users can insert staff_types" ON public.staff_types
    FOR INSERT TO authenticated
WITH CHECK (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id()
        OR (
            organization_id IS NULL
            AND public.get_current_user_role() = 'super_admin'
        )
    )
    AND public.has_permission_for_resource('staff_types', 'create')
);

CREATE POLICY "Users can update staff_types" ON public.staff_types
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('staff_types', 'update')
)
WITH CHECK (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('staff_types', 'update')
);

CREATE POLICY "Users can delete staff_types" ON public.staff_types
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('staff_types', 'delete')
);

