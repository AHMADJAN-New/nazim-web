-- Update auto_set_school_id function to handle super admins with multiple organizations
-- This migration updates the existing function to get schools from super_admin_organizations table

-- Update the function to handle super admins better
CREATE OR REPLACE FUNCTION auto_set_school_id()
RETURNS TRIGGER AS $$
DECLARE
    user_org_id UUID;
    user_role VARCHAR;
    default_school_id UUID;
    primary_org_id UUID;
BEGIN
    -- Get the current user's organization_id and role
    SELECT organization_id, role INTO user_org_id, user_role
    FROM public.profiles
    WHERE id = auth.uid()
    AND deleted_at IS NULL;

    -- If school_id is already set, keep it
    IF NEW.school_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- For super_admin: get schools from their organizations via super_admin_organizations
    IF user_role = 'super_admin' THEN
        -- First, try to get primary organization
        SELECT organization_id INTO primary_org_id
        FROM public.super_admin_organizations
        WHERE super_admin_id = auth.uid()
        AND is_primary = true
        AND deleted_at IS NULL
        LIMIT 1;
        
        -- If no primary, get any organization
        IF primary_org_id IS NULL THEN
            SELECT organization_id INTO primary_org_id
            FROM public.super_admin_organizations
            WHERE super_admin_id = auth.uid()
            AND deleted_at IS NULL
            ORDER BY created_at ASC
            LIMIT 1;
        END IF;
        
        -- If still no organization, try profile's organization_id (for backward compatibility)
        IF primary_org_id IS NULL THEN
            primary_org_id := user_org_id;
        END IF;
        
        -- Get first active school from the organization
        IF primary_org_id IS NOT NULL THEN
            SELECT id INTO default_school_id
            FROM public.school_branding
            WHERE organization_id = primary_org_id
            AND deleted_at IS NULL
            AND (is_active = true OR is_active IS NULL)
            ORDER BY created_at ASC
            LIMIT 1;
            
            IF default_school_id IS NOT NULL THEN
                NEW.school_id := default_school_id;
            END IF;
        END IF;
        
        -- If no school found, allow NULL (super admin can set manually)
        RETURN NEW;
    END IF;

    -- For regular users: get the first active school for their organization
    IF user_org_id IS NOT NULL THEN
        SELECT id INTO default_school_id
        FROM public.school_branding
        WHERE organization_id = user_org_id
        AND deleted_at IS NULL
        AND (is_active = true OR is_active IS NULL)  -- Handle NULL is_active
        ORDER BY created_at ASC
        LIMIT 1;

        IF default_school_id IS NOT NULL THEN
            NEW.school_id := default_school_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update triggers to always run (remove WHEN clause so it always executes)
DROP TRIGGER IF EXISTS auto_set_buildings_school_id ON public.buildings;

CREATE TRIGGER auto_set_buildings_school_id
    BEFORE INSERT ON public.buildings
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_school_id();

DROP TRIGGER IF EXISTS auto_set_rooms_school_id ON public.rooms;

CREATE TRIGGER auto_set_rooms_school_id
    BEFORE INSERT ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_school_id();

COMMENT ON FUNCTION auto_set_school_id () IS 'Automatically sets school_id from current user organization on INSERT. Handles super admins with multiple organizations.';