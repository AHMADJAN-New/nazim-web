-- ============================================================================
-- Update Class Subject Templates RLS Policies to Use Permission-Based Checks
-- ============================================================================
-- Replaces role-based checks with permission-based checks using
-- has_permission_for_resource() function.
-- ============================================================================

DROP POLICY IF EXISTS "Users can read class_subject_templates" ON public.class_subject_templates;
DROP POLICY IF EXISTS "Users can insert class_subject_templates" ON public.class_subject_templates;
DROP POLICY IF EXISTS "Users can update class_subject_templates" ON public.class_subject_templates;
DROP POLICY IF EXISTS "Users can delete class_subject_templates" ON public.class_subject_templates;

CREATE POLICY "Users can read class_subject_templates" ON public.class_subject_templates
    FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('class_subject_templates', 'read')
);

CREATE POLICY "Users can insert class_subject_templates" ON public.class_subject_templates
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
    AND public.has_permission_for_resource('class_subject_templates', 'create')
);

CREATE POLICY "Users can update class_subject_templates" ON public.class_subject_templates
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('class_subject_templates', 'update')
)
WITH CHECK (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('class_subject_templates', 'update')
);

CREATE POLICY "Users can delete class_subject_templates" ON public.class_subject_templates
    FOR DELETE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id IS NULL
        OR organization_id = public.get_current_user_organization_id()
    )
    AND public.has_permission_for_resource('class_subject_templates', 'delete')
);

