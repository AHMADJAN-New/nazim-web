-- ============================================================================
-- Remove Super Admin Bypass and Enforce Org-Scoped Permissions
-- ============================================================================
-- - Super admins no longer bypass permission checks or NULL org scopes.
-- - Permission checks now use org-scoped role/user permissions.
-- - School IDs resolve from assigned organizations (including super_admin_organizations).
-- - Core RLS policies updated to drop super_admin shortcuts.
-- ============================================================================

-- Helper: list all organizations the current user may access
CREATE OR REPLACE FUNCTION public.get_accessible_organization_ids()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    current_uid UUID := (SELECT auth.uid());
    user_org_id UUID;
    user_role TEXT;
    org_ids UUID[] := ARRAY[]::UUID[];
BEGIN
    IF current_uid IS NULL THEN
        RETURN org_ids;
    END IF;

    SELECT organization_id, role
      INTO user_org_id, user_role
    FROM public.profiles
    WHERE id = current_uid
      AND deleted_at IS NULL;

    IF user_org_id IS NOT NULL THEN
        org_ids := array_append(org_ids, user_org_id);
    END IF;

    -- Super admins: include explicitly assigned organizations only
    IF user_role = 'super_admin' THEN
        org_ids := org_ids || COALESCE(
            ARRAY(
                SELECT DISTINCT sao.organization_id
                FROM public.super_admin_organizations sao
                WHERE sao.super_admin_id = current_uid
                  AND sao.deleted_at IS NULL
            ),
            ARRAY[]::UUID[]
        );
    END IF;

    -- Deduplicate and drop NULLs
    RETURN ARRAY(
        SELECT DISTINCT unnest(org_ids)
        WHERE unnest IS NOT NULL
    );
END;
$$;

-- Rebuild has_permission_for_resource without super_admin bypass
CREATE OR REPLACE FUNCTION public.has_permission_for_resource(
    resource_name TEXT,
    action_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    current_uid UUID := (SELECT auth.uid());
    user_role TEXT;
    user_org_id UUID;
    permitted_orgs UUID[] := ARRAY[]::UUID[];
    has_perm BOOLEAN := FALSE;
    orgs_len INT := 0;
BEGIN
    IF current_uid IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT role, organization_id
      INTO user_role, user_org_id
    FROM public.profiles
    WHERE id = current_uid
      AND deleted_at IS NULL;

    -- No profile -> deny
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    permitted_orgs := public.get_accessible_organization_ids();
    orgs_len := COALESCE(array_length(permitted_orgs, 1), 0);

    -- Per-user overrides (user_permissions)
    SELECT EXISTS(
        SELECT 1
        FROM public.user_permissions up
        JOIN public.permissions p ON up.permission_id = p.id
        WHERE up.user_id = current_uid
          AND up.deleted_at IS NULL
          AND p.resource = resource_name
          AND p.action = action_name
          AND (
              -- Global permission allowed for non-super_admin users
              (user_role <> 'super_admin' AND up.organization_id IS NULL AND p.organization_id IS NULL)
              OR
              -- Org-scoped permission allowed when org is assigned
              (orgs_len > 0 AND up.organization_id IS NOT NULL AND up.organization_id = ANY(permitted_orgs) AND p.organization_id = up.organization_id)
          )
    ) INTO has_perm;

    IF has_perm THEN
        RETURN TRUE;
    END IF;

    -- Role-based permissions (role_permissions)
    SELECT EXISTS(
        SELECT 1
        FROM public.role_permissions rp
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE rp.role = user_role
          AND p.resource = resource_name
          AND p.action = action_name
          AND (
              -- Global permissions for non-super_admin roles
              (user_role <> 'super_admin' AND rp.organization_id IS NULL AND p.organization_id IS NULL)
              OR
              -- Org-scoped permissions for assigned orgs
              (orgs_len > 0 AND rp.organization_id IS NOT NULL AND rp.organization_id = ANY(permitted_orgs) AND p.organization_id = rp.organization_id)
          )
    ) INTO has_perm;

    RETURN has_perm;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_permission_for_resource(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_organization_ids() TO authenticated;

-- Update get_current_user_school_ids to use accessible orgs (no super_admin bypass)
CREATE OR REPLACE FUNCTION public.get_current_user_school_ids()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    permitted_orgs UUID[] := public.get_accessible_organization_ids();
    school_ids UUID[];
BEGIN
    IF permitted_orgs IS NULL OR array_length(permitted_orgs, 1) IS NULL THEN
        RETURN ARRAY[]::UUID[];
    END IF;

    SELECT COALESCE(ARRAY_AGG(id), ARRAY[]::UUID[])
      INTO school_ids
    FROM public.school_branding
    WHERE organization_id = ANY(permitted_orgs)
      AND deleted_at IS NULL
      AND (is_active IS TRUE OR is_active IS NULL);

    RETURN school_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_school_ids () TO authenticated;

-- ============================================================================
-- Core RLS policy updates (remove super_admin bypass)
-- ============================================================================

-- Organizations: users see only assigned organizations
DROP POLICY IF EXISTS "Authenticated users can read their organization" ON public.organizations;
CREATE POLICY "Authenticated users can read their organization"
    ON public.organizations
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND id = ANY(public.get_accessible_organization_ids())
    );

-- Permissions table
DROP POLICY IF EXISTS "Authenticated users can read permissions" ON public.permissions;
CREATE POLICY "Authenticated users can read permissions"
    ON public.permissions
    FOR SELECT TO authenticated
    USING (
        organization_id IS NULL
        OR organization_id = ANY(public.get_accessible_organization_ids())
    );

DROP POLICY IF EXISTS "Authenticated users can insert their organization's permissions" ON public.permissions;
CREATE POLICY "Authenticated users can insert their organization's permissions"
    ON public.permissions
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = ANY(public.get_accessible_organization_ids())
    );

DROP POLICY IF EXISTS "Authenticated users can update their organization's permissions" ON public.permissions;
CREATE POLICY "Authenticated users can update their organization's permissions"
    ON public.permissions
    FOR UPDATE TO authenticated
    USING (organization_id = ANY(public.get_accessible_organization_ids()))
    WITH CHECK (organization_id = ANY(public.get_accessible_organization_ids()));

DROP POLICY IF EXISTS "Authenticated users can delete their organization's permissions" ON public.permissions;
CREATE POLICY "Authenticated users can delete their organization's permissions"
    ON public.permissions
    FOR DELETE TO authenticated
    USING (organization_id = ANY(public.get_accessible_organization_ids()));

-- Role permissions
DROP POLICY IF EXISTS "Users can read role_permissions" ON public.role_permissions;
CREATE POLICY "Users can read role_permissions"
    ON public.role_permissions
    FOR SELECT TO authenticated
    USING (
        organization_id IS NULL
        OR organization_id = ANY(public.get_accessible_organization_ids())
    );

DROP POLICY IF EXISTS "Users can insert org role_permissions" ON public.role_permissions;
CREATE POLICY "Users can insert org role_permissions"
    ON public.role_permissions
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = ANY(public.get_accessible_organization_ids())
    );

DROP POLICY IF EXISTS "Users can update org role_permissions" ON public.role_permissions;
CREATE POLICY "Users can update org role_permissions"
    ON public.role_permissions
    FOR UPDATE TO authenticated
    USING (organization_id = ANY(public.get_accessible_organization_ids()))
    WITH CHECK (organization_id = ANY(public.get_accessible_organization_ids()));

DROP POLICY IF EXISTS "Users can delete org role_permissions" ON public.role_permissions;
CREATE POLICY "Users can delete org role_permissions"
    ON public.role_permissions
    FOR DELETE TO authenticated
    USING (organization_id = ANY(public.get_accessible_organization_ids()));

-- User permissions RLS: permission-based check, no super_admin shortcuts
DROP POLICY IF EXISTS "Users can read their own permissions" ON public.user_permissions;
CREATE POLICY "Users can read their own permissions"
    ON public.user_permissions
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            user_id = (SELECT auth.uid())
            OR (
                organization_id = ANY(public.get_accessible_organization_ids())
                AND public.has_permission_for_resource('permissions', 'read')
            )
        )
    );

DROP POLICY IF EXISTS "Admins can insert user permissions" ON public.user_permissions;
CREATE POLICY "Users can insert user permissions"
    ON public.user_permissions
    FOR INSERT TO authenticated
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = ANY(public.get_accessible_organization_ids())
        AND public.has_permission_for_resource('permissions', 'update')
    );

DROP POLICY IF EXISTS "Admins can update user permissions" ON public.user_permissions;
CREATE POLICY "Users can update user permissions"
    ON public.user_permissions
    FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL
        AND organization_id = ANY(public.get_accessible_organization_ids())
        AND public.has_permission_for_resource('permissions', 'update')
    )
    WITH CHECK (
        organization_id = ANY(public.get_accessible_organization_ids())
        AND public.has_permission_for_resource('permissions', 'update')
    );

DROP POLICY IF EXISTS "Admins can delete user permissions" ON public.user_permissions;
CREATE POLICY "Users can delete user permissions"
    ON public.user_permissions
    FOR DELETE TO authenticated
    USING (
        deleted_at IS NULL
        AND organization_id = ANY(public.get_accessible_organization_ids())
        AND public.has_permission_for_resource('permissions', 'update')
    );

-- School branding (org scoped, no super_admin bypass)
DROP POLICY IF EXISTS "Users can read branding for their organization" ON public.school_branding;
CREATE POLICY "Users can read branding for their organization"
    ON public.school_branding
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND organization_id = ANY(public.get_accessible_organization_ids())
    );

DROP POLICY IF EXISTS "Admins can insert branding for their organization" ON public.school_branding;
CREATE POLICY "Users can insert branding for their organization"
    ON public.school_branding
    FOR INSERT TO authenticated
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = ANY(public.get_accessible_organization_ids())
        AND public.has_permission_for_resource('branding', 'create')
    );

DROP POLICY IF EXISTS "Admins can update branding for their organization" ON public.school_branding;
CREATE POLICY "Users can update branding for their organization"
    ON public.school_branding
    FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL
        AND organization_id = ANY(public.get_accessible_organization_ids())
        AND public.has_permission_for_resource('branding', 'update')
    )
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = ANY(public.get_accessible_organization_ids())
        AND public.has_permission_for_resource('branding', 'update')
    );

DROP POLICY IF EXISTS "Admins can delete branding for their organization" ON public.school_branding;
CREATE POLICY "Users can delete branding for their organization"
    ON public.school_branding
    FOR DELETE TO authenticated
    USING (
        deleted_at IS NULL
        AND organization_id = ANY(public.get_accessible_organization_ids())
        AND public.has_permission_for_resource('branding', 'delete')
    );

-- Staff table
DROP POLICY IF EXISTS "Users can read their organization's staff" ON public.staff;
CREATE POLICY "Users can read their organization's staff"
    ON public.staff
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND organization_id = ANY(public.get_accessible_organization_ids())
        AND public.has_permission_for_resource('staff', 'read')
    );

DROP POLICY IF EXISTS "Users can insert staff in their organization" ON public.staff;
CREATE POLICY "Users can insert staff in their organization"
    ON public.staff
    FOR INSERT TO authenticated
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = ANY(public.get_accessible_organization_ids())
        AND public.has_permission_for_resource('staff', 'create')
    );

DROP POLICY IF EXISTS "Users can update their organization's staff" ON public.staff;
CREATE POLICY "Users can update their organization's staff"
    ON public.staff
    FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL
        AND organization_id = ANY(public.get_accessible_organization_ids())
        AND public.has_permission_for_resource('staff', 'update')
    )
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = ANY(public.get_accessible_organization_ids())
        AND public.has_permission_for_resource('staff', 'update')
    );

DROP POLICY IF EXISTS "Users can delete their organization's staff" ON public.staff;
CREATE POLICY "Users can delete their organization's staff"
    ON public.staff
    FOR DELETE TO authenticated
    USING (
        deleted_at IS NULL
        AND organization_id = ANY(public.get_accessible_organization_ids())
        AND public.has_permission_for_resource('staff', 'delete')
    );

-- Report templates (org scoped)
DROP POLICY IF EXISTS "Users can read their organization's report_templates" ON public.report_templates;
CREATE POLICY "Users can read their organization's report_templates"
    ON public.report_templates
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND organization_id = ANY(public.get_accessible_organization_ids())
        AND public.has_permission_for_resource('reports', 'read')
    );

DROP POLICY IF EXISTS "Users can insert report_templates in their organization" ON public.report_templates;
CREATE POLICY "Users can insert report_templates in their organization"
    ON public.report_templates
    FOR INSERT TO authenticated
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = ANY(public.get_accessible_organization_ids())
        AND public.has_permission_for_resource('reports', 'create')
    );

DROP POLICY IF EXISTS "Users can update their organization's report_templates" ON public.report_templates;
CREATE POLICY "Users can update their organization's report_templates"
    ON public.report_templates
    FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL
        AND organization_id = ANY(public.get_accessible_organization_ids())
        AND public.has_permission_for_resource('reports', 'update')
    )
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = ANY(public.get_accessible_organization_ids())
        AND public.has_permission_for_resource('reports', 'update')
    );

DROP POLICY IF EXISTS "Users can delete their organization's report_templates" ON public.report_templates;
CREATE POLICY "Users can delete their organization's report_templates"
    ON public.report_templates
    FOR DELETE TO authenticated
    USING (
        deleted_at IS NULL
        AND organization_id = ANY(public.get_accessible_organization_ids())
        AND public.has_permission_for_resource('reports', 'delete')
    );

-- Storage: staff-files bucket (remove super_admin bypass)
DROP POLICY IF EXISTS "Users can upload staff files in their organization" ON storage.objects;
CREATE POLICY "Users can upload staff files in their organization"
    ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'staff-files'
        AND (storage.foldername(name))[1]::UUID = ANY(public.get_accessible_organization_ids())
    );

DROP POLICY IF EXISTS "Users can read staff files in their organization" ON storage.objects;
CREATE POLICY "Users can read staff files in their organization"
    ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'staff-files'
        AND (storage.foldername(name))[1]::UUID = ANY(public.get_accessible_organization_ids())
    );

DROP POLICY IF EXISTS "Users can update staff files in their organization" ON storage.objects;
CREATE POLICY "Users can update staff files in their organization"
    ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'staff-files'
        AND (storage.foldername(name))[1]::UUID = ANY(public.get_accessible_organization_ids())
    )
    WITH CHECK (
        bucket_id = 'staff-files'
        AND (storage.foldername(name))[1]::UUID = ANY(public.get_accessible_organization_ids())
    );

DROP POLICY IF EXISTS "Users can delete staff files in their organization" ON storage.objects;
CREATE POLICY "Users can delete staff files in their organization"
    ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'staff-files'
        AND (storage.foldername(name))[1]::UUID = ANY(public.get_accessible_organization_ids())
    );

COMMENT ON FUNCTION public.get_accessible_organization_ids() IS 'Returns all organizations the current user is explicitly assigned to (including super_admin_organizations). Removes any super_admin-wide bypass.';
COMMENT ON FUNCTION public.has_permission_for_resource(TEXT, TEXT) IS 'Checks permission via user_permissions then role_permissions without super_admin bypass; requires org-scoped permissions.';
COMMENT ON FUNCTION public.get_current_user_school_ids() IS 'Returns schools for the organizations available to the current user (including super_admin assignments); no global super_admin bypass.';
