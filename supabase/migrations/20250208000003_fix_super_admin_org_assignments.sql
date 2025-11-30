-- ============================================================================
-- Fix Super Admin Organization Assignments and Permissions
-- ============================================================================
-- - Ensure every super_admin profile is assigned to at least one organization.
-- - Ensure super_admin_organizations rows exist for assigned orgs.
-- - Assign org-scoped permissions to super_admin role for those orgs.
-- ============================================================================

DO $$
DECLARE
    org RECORD;
    sa RECORD;
    target_org UUID;
BEGIN
    -- Ensure there is at least one organization
    SELECT id INTO target_org
    FROM public.organizations
    WHERE deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;

    IF target_org IS NULL THEN
        -- Create a default organization if none exists
        INSERT INTO public.organizations (name, slug, settings)
        VALUES ('Default Organization', 'default-org', '{}'::jsonb)
        RETURNING id INTO target_org;
    END IF;

    -- For each super_admin profile, ensure organization_id is set
    FOR sa IN
        SELECT id, organization_id
        FROM public.profiles
        WHERE role = 'super_admin'
          AND deleted_at IS NULL
    LOOP
        IF sa.organization_id IS NULL THEN
            UPDATE public.profiles
            SET organization_id = target_org
            WHERE id = sa.id;
        END IF;
    END LOOP;

    -- Ensure super_admin_organizations entries exist for each super_admin and all organizations
    FOR sa IN
        SELECT id, organization_id
        FROM public.profiles
        WHERE role = 'super_admin'
          AND deleted_at IS NULL
    LOOP
        FOR org IN
            SELECT id
            FROM public.organizations
            WHERE deleted_at IS NULL
        LOOP
            INSERT INTO public.super_admin_organizations (super_admin_id, organization_id, is_primary)
            VALUES (sa.id, org.id, (org.id = sa.organization_id))
            ON CONFLICT (super_admin_id, organization_id) DO NOTHING;

            -- Assign permissions for this org
            PERFORM public.assign_super_admin_permissions_for_org(org.id);
        END LOOP;
    END LOOP;
END;
$$;

COMMENT ON SCHEMA public IS 'Includes migration 20250208000003_fix_super_admin_org_assignments to ensure super_admin users are assigned to organizations and have org-scoped permissions.';
