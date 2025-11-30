-- ============================================================================
-- Update School Branding RLS Policies to Use Permission-Based Checks
-- ============================================================================
-- Replaces role-based checks (admin, super_admin) with permission-based checks
-- using has_permission_for_resource() function.
-- Note: branding.* permissions already exist in seed data.
-- ============================================================================

DROP POLICY IF EXISTS "Users can read branding for their organization" ON public.school_branding;
DROP POLICY IF EXISTS "Admins can insert branding for their organization" ON public.school_branding;
DROP POLICY IF EXISTS "Admins can update branding for their organization" ON public.school_branding;
DROP POLICY IF EXISTS "Admins can delete branding for their organization" ON public.school_branding;

CREATE POLICY "Users can read branding" ON public.school_branding
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    )
    AND public.has_permission_for_resource('branding', 'read')
);

CREATE POLICY "Users can insert branding" ON public.school_branding
    FOR INSERT TO authenticated
WITH CHECK (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    )
    AND public.has_permission_for_resource('branding', 'create')
);

CREATE POLICY "Users can update branding" ON public.school_branding
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    )
    AND public.has_permission_for_resource('branding', 'update')
)
WITH CHECK (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    )
    AND public.has_permission_for_resource('branding', 'update')
);

CREATE POLICY "Users can delete branding" ON public.school_branding
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    )
    AND public.has_permission_for_resource('branding', 'delete')
);

