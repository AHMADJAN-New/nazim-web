-- ============================================================================
-- Update Staff Documents RLS Policies to Use Permission-Based Checks
-- ============================================================================
-- Replaces role-based checks with permission-based checks using
-- has_permission_for_resource() function.
-- ============================================================================

DROP POLICY IF EXISTS "Users can read staff_documents" ON public.staff_documents;
DROP POLICY IF EXISTS "Users can insert staff_documents" ON public.staff_documents;
DROP POLICY IF EXISTS "Users can update staff_documents" ON public.staff_documents;
DROP POLICY IF EXISTS "Users can delete staff_documents" ON public.staff_documents;

CREATE POLICY "Users can read staff_documents" ON public.staff_documents
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('staff_documents', 'read')
);

CREATE POLICY "Users can insert staff_documents" ON public.staff_documents
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
    AND public.has_permission_for_resource('staff_documents', 'create')
);

CREATE POLICY "Users can update staff_documents" ON public.staff_documents
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('staff_documents', 'update')
)
WITH CHECK (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('staff_documents', 'update')
);

CREATE POLICY "Users can delete staff_documents" ON public.staff_documents
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('staff_documents', 'delete')
);

