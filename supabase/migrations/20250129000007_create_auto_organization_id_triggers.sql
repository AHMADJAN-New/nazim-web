-- Create function to automatically set organization_id from user's profile
-- This function will be used by triggers to automatically populate organization_id

CREATE OR REPLACE FUNCTION auto_set_organization_id()
RETURNS TRIGGER AS $$
DECLARE
    user_org_id UUID;
    user_role VARCHAR;
BEGIN
    -- Get the current user's organization_id and role
    SELECT organization_id, role INTO user_org_id, user_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- If user is super_admin, they can set organization_id manually
    -- Otherwise, automatically set it from their profile
    IF user_role = 'super_admin' THEN
        -- Super admin can set organization_id manually, but if not provided, leave it NULL
        -- For INSERT, if organization_id is NULL and user is not super_admin, set it
        IF NEW.organization_id IS NULL AND user_role != 'super_admin' THEN
            NEW.organization_id := user_org_id;
        END IF;
    ELSE
        -- Regular users: always set organization_id from their profile
        IF NEW.organization_id IS NULL OR NEW.organization_id != user_org_id THEN
            NEW.organization_id := user_org_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for tables that have organization_id column
-- Note: Only apply to INSERT operations, UPDATE should preserve existing organization_id

-- Buildings table
DROP TRIGGER IF EXISTS auto_set_buildings_organization_id ON public.buildings;

CREATE TRIGGER auto_set_buildings_organization_id
    BEFORE INSERT ON public.buildings
    FOR EACH ROW
    WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION auto_set_organization_id();

-- Rooms table
DROP TRIGGER IF EXISTS auto_set_rooms_organization_id ON public.rooms;

CREATE TRIGGER auto_set_rooms_organization_id
    BEFORE INSERT ON public.rooms
    FOR EACH ROW
    WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION auto_set_organization_id();

-- Staff table
DROP TRIGGER IF EXISTS auto_set_staff_organization_id ON public.staff;

CREATE TRIGGER auto_set_staff_organization_id
    BEFORE INSERT ON public.staff
    FOR EACH ROW
    WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION auto_set_organization_id();

-- School branding table
DROP TRIGGER IF EXISTS auto_set_school_branding_organization_id ON public.school_branding;

CREATE TRIGGER auto_set_school_branding_organization_id
    BEFORE INSERT ON public.school_branding
    FOR EACH ROW
    WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION auto_set_organization_id();

-- Add comment
COMMENT ON FUNCTION auto_set_organization_id () IS 'Automatically sets organization_id from current user profile on INSERT';