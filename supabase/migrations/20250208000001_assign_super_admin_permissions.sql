-- ============================================================================
-- Assign All Permissions to Existing Super Admins
-- ============================================================================
-- This migration assigns all permissions to super_admin role for all
-- organizations that existing super admin users are assigned to via
-- super_admin_organizations table. Also includes their profile's organization_id.
-- ============================================================================

-- Function to assign all permissions to super_admin for a specific organization
CREATE OR REPLACE FUNCTION public.assign_super_admin_permissions_for_org(org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    perm_record RECORD;
BEGIN
    -- Assign all global permissions to super_admin role for this organization
    FOR perm_record IN 
        SELECT id FROM public.permissions 
        WHERE organization_id IS NULL
    LOOP
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        VALUES ('super_admin', perm_record.id, org_id)
        ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
    END LOOP;
END;
$$;

-- Assign permissions to all existing super admins for all their assigned organizations
DO $$
DECLARE
    super_admin_record RECORD;
    org_record RECORD;
    org_ids UUID[];
BEGIN
    -- For each super admin user
    FOR super_admin_record IN 
        SELECT id, organization_id 
        FROM public.profiles 
        WHERE role = 'super_admin' 
          AND deleted_at IS NULL
    LOOP
        -- Collect all organization IDs for this super admin
        org_ids := ARRAY[]::UUID[];
        
        -- Get organizations from super_admin_organizations table
        FOR org_record IN 
            SELECT organization_id 
            FROM public.super_admin_organizations 
            WHERE super_admin_id = super_admin_record.id
              AND deleted_at IS NULL
        LOOP
            org_ids := array_append(org_ids, org_record.organization_id);
        END LOOP;
        
        -- Also include profile's organization_id if not already in the list
        IF super_admin_record.organization_id IS NOT NULL 
           AND NOT (super_admin_record.organization_id = ANY(org_ids)) THEN
            org_ids := array_append(org_ids, super_admin_record.organization_id);
        END IF;
        
        -- If no organizations found, assign to all existing organizations
        IF array_length(org_ids, 1) IS NULL THEN
            FOR org_record IN 
                SELECT id FROM public.organizations 
                WHERE deleted_at IS NULL
            LOOP
                PERFORM public.assign_super_admin_permissions_for_org(org_record.id);
            END LOOP;
        ELSE
            -- Assign permissions for each organization
            FOR org_record IN 
                SELECT unnest(org_ids) AS id
            LOOP
                PERFORM public.assign_super_admin_permissions_for_org(org_record.id);
            END LOOP;
        END IF;
        
        RAISE NOTICE 'Assigned permissions to super_admin % for % organizations', 
            super_admin_record.id, 
            COALESCE(array_length(org_ids, 1), (SELECT COUNT(*) FROM public.organizations WHERE deleted_at IS NULL));
    END LOOP;
END;
$$;

COMMENT ON FUNCTION public.assign_super_admin_permissions_for_org(UUID) IS 
'Assigns all global permissions to super_admin role for a specific organization. Used when super admin is assigned to a new organization.';
