-- Migration: Add school_id to buildings and rooms, remove organization_id
-- This changes the data model so buildings and rooms belong to schools, not directly to organizations
-- Hierarchy: Organization -> School -> Building -> Room

-- ============================================
-- 1. ADD SCHOOL_ID TO BUILDINGS
-- ============================================

-- Add school_id column to buildings
ALTER TABLE public.buildings
ADD COLUMN IF NOT EXISTS school_id UUID NULL REFERENCES public.school_branding (id) ON DELETE CASCADE;

-- Create index on school_id
CREATE INDEX IF NOT EXISTS idx_buildings_school_id ON public.buildings (school_id);

-- Migrate existing data: Set school_id based on organization_id
-- If a building has organization_id, find the first school for that organization
UPDATE public.buildings b
SET
    school_id = (
        SELECT sb.id
        FROM public.school_branding sb
        WHERE
            sb.organization_id = b.organization_id
            AND sb.deleted_at IS NULL
        ORDER BY sb.created_at ASC
        LIMIT 1
    )
WHERE
    b.school_id IS NULL
    AND b.organization_id IS NOT NULL;

-- Make school_id NOT NULL after migration (but allow NULL temporarily for data migration)
-- We'll enforce NOT NULL in a later step after ensuring all buildings have schools

-- Drop old policies that depend on organization_id (must be done before dropping column)
DROP POLICY IF EXISTS "Users can read their organization's buildings" ON public.buildings;

DROP POLICY IF EXISTS "Users can insert buildings in their organization" ON public.buildings;

DROP POLICY IF EXISTS "Users can update their organization's buildings" ON public.buildings;

DROP POLICY IF EXISTS "Users can delete their organization's buildings" ON public.buildings;

DROP POLICY IF EXISTS "Allow authenticated users to read buildings" ON public.buildings;

DROP POLICY IF EXISTS "Allow authenticated users to insert buildings" ON public.buildings;

DROP POLICY IF EXISTS "Allow authenticated users to update buildings" ON public.buildings;

DROP POLICY IF EXISTS "Allow authenticated users to delete buildings" ON public.buildings;

-- Drop old trigger that depends on organization_id
DROP TRIGGER IF EXISTS auto_set_buildings_organization_id ON public.buildings;

-- Update unique constraint: building_name should be unique per school (not per organization)
ALTER TABLE public.buildings
DROP CONSTRAINT IF EXISTS buildings_building_name_organization_id_key;

ALTER TABLE public.buildings
DROP CONSTRAINT IF EXISTS buildings_building_name_organization_unique;

CREATE UNIQUE INDEX IF NOT EXISTS buildings_building_name_school_id_key ON public.buildings (building_name, school_id)
WHERE
    deleted_at IS NULL;

-- Drop organization_id column (no longer needed - we get it through school.organization_id)
ALTER TABLE public.buildings DROP COLUMN IF EXISTS organization_id;

-- Drop old organization_id index
DROP INDEX IF EXISTS idx_buildings_organization_id;

-- Add comment
COMMENT ON COLUMN public.buildings.school_id IS 'Foreign key to school_branding table - buildings belong to schools';

-- ============================================
-- 2. ADD SCHOOL_ID TO ROOMS
-- ============================================

-- Add school_id column to rooms
ALTER TABLE public.rooms
ADD COLUMN IF NOT EXISTS school_id UUID NULL REFERENCES public.school_branding (id) ON DELETE CASCADE;

-- Create index on school_id
CREATE INDEX IF NOT EXISTS idx_rooms_school_id ON public.rooms (school_id);

-- Migrate existing data: Set school_id from building's school_id
UPDATE public.rooms r
SET
    school_id = (
        SELECT b.school_id
        FROM public.buildings b
        WHERE
            b.id = r.building_id
            AND b.deleted_at IS NULL
    )
WHERE
    r.school_id IS NULL;

-- Note: If building doesn't have school_id, we can't migrate it automatically
-- Those rooms will need to be manually assigned or the building needs a school_id first

-- Update unique constraint: room_number should be unique per building (already exists, but ensure it's correct)
-- The existing UNIQUE(room_number, building_id) is still valid

-- Drop old policies that depend on organization_id (must be done before dropping column)
DROP POLICY IF EXISTS "Users can read their organization's rooms" ON public.rooms;

DROP POLICY IF EXISTS "Users can insert rooms in their organization" ON public.rooms;

DROP POLICY IF EXISTS "Users can update their organization's rooms" ON public.rooms;

DROP POLICY IF EXISTS "Users can delete their organization's rooms" ON public.rooms;

DROP POLICY IF EXISTS "Allow authenticated users to read rooms" ON public.rooms;

DROP POLICY IF EXISTS "Allow authenticated users to insert rooms" ON public.rooms;

DROP POLICY IF EXISTS "Allow authenticated users to update rooms" ON public.rooms;

DROP POLICY IF EXISTS "Allow authenticated users to delete rooms" ON public.rooms;

-- Drop old triggers that depend on organization_id
DROP TRIGGER IF EXISTS auto_set_rooms_organization_id ON public.rooms;

DROP TRIGGER IF EXISTS set_room_organization_trigger ON public.rooms;

DROP FUNCTION IF EXISTS set_room_organization_from_building ();

-- Drop organization_id column (no longer needed - we get it through school.organization_id)
ALTER TABLE public.rooms DROP COLUMN IF EXISTS organization_id;

-- Drop old organization_id index
DROP INDEX IF EXISTS idx_rooms_organization_id;

-- Add comment
COMMENT ON COLUMN public.rooms.school_id IS 'Foreign key to school_branding table - rooms belong to schools';

-- ============================================
-- 3. UPDATE TRIGGERS - Set school_id instead of organization_id
-- ============================================

-- Drop old organization_id triggers
DROP TRIGGER IF EXISTS auto_set_buildings_organization_id ON public.buildings;

DROP TRIGGER IF EXISTS auto_set_rooms_organization_id ON public.rooms;

-- Create function to automatically set school_id from user's organization
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

-- Create triggers for buildings
DROP TRIGGER IF EXISTS auto_set_buildings_school_id ON public.buildings;

CREATE TRIGGER auto_set_buildings_school_id
    BEFORE INSERT ON public.buildings
    FOR EACH ROW
    WHEN (NEW.school_id IS NULL)
    EXECUTE FUNCTION auto_set_school_id();

-- Create triggers for rooms
DROP TRIGGER IF EXISTS auto_set_rooms_school_id ON public.rooms;

CREATE TRIGGER auto_set_rooms_school_id
    BEFORE INSERT ON public.rooms
    FOR EACH ROW
    WHEN (NEW.school_id IS NULL)
    EXECUTE FUNCTION auto_set_school_id();

-- Also ensure room's school_id matches building's school_id
CREATE OR REPLACE FUNCTION ensure_room_school_matches_building()
RETURNS TRIGGER AS $$
BEGIN
    -- If building_id is set, ensure school_id matches building's school_id
    IF NEW.building_id IS NOT NULL THEN
        SELECT school_id INTO NEW.school_id
        FROM public.buildings
        WHERE id = NEW.building_id
        AND deleted_at IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_room_school_matches_building_trigger ON public.rooms;

CREATE TRIGGER ensure_room_school_matches_building_trigger
    BEFORE INSERT OR UPDATE ON public.rooms
    FOR EACH ROW
    WHEN (NEW.building_id IS NOT NULL)
    EXECUTE FUNCTION ensure_room_school_matches_building();

-- Add comment
COMMENT ON FUNCTION auto_set_school_id () IS 'Automatically sets school_id from current user organization on INSERT';

-- ============================================
-- 4. UPDATE RLS POLICIES FOR SCHOOL_ID
-- ============================================

-- Drop old organization-based policies
DROP POLICY IF EXISTS "Allow authenticated users to read buildings" ON public.buildings;

DROP POLICY IF EXISTS "Allow authenticated users to insert buildings" ON public.buildings;

DROP POLICY IF EXISTS "Allow authenticated users to update buildings" ON public.buildings;

DROP POLICY IF EXISTS "Allow authenticated users to delete buildings" ON public.buildings;

DROP POLICY IF EXISTS "Allow anon users to read buildings" ON public.buildings;

DROP POLICY IF EXISTS "Allow anon users to insert buildings" ON public.buildings;

DROP POLICY IF EXISTS "Allow anon users to update buildings" ON public.buildings;

DROP POLICY IF EXISTS "Allow anon users to delete buildings" ON public.buildings;

-- Buildings: Users can read buildings for schools in their organization
CREATE POLICY "Users can read buildings for their organization schools" ON public.buildings FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            school_id IN (
                SELECT id
                FROM public.school_branding
                WHERE
                    organization_id = (
                        SELECT organization_id
                        FROM public.profiles
                        WHERE
                            id = auth.uid ()
                    )
                    AND deleted_at IS NULL
            )
            OR (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) IS NULL -- Super admin (can see all)
        )
    );

-- Buildings: Users can insert buildings for schools in their organization
CREATE POLICY "Users can insert buildings for their organization schools" ON public.buildings FOR
INSERT
    TO authenticated
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            school_id IN (
                SELECT id
                FROM public.school_branding
                WHERE
                    organization_id = (
                        SELECT organization_id
                        FROM public.profiles
                        WHERE
                            id = auth.uid ()
                    )
                    AND deleted_at IS NULL
            )
            OR (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) IS NULL -- Super admin
        )
    );

-- Buildings: Users can update buildings for schools in their organization
CREATE POLICY "Users can update buildings for their organization schools" ON public.buildings FOR
UPDATE TO authenticated USING (
    deleted_at IS NULL
    AND (
        school_id IN (
            SELECT id
            FROM public.school_branding
            WHERE
                organization_id = (
                    SELECT organization_id
                    FROM public.profiles
                    WHERE
                        id = auth.uid ()
                )
                AND deleted_at IS NULL
        )
        OR (
            SELECT organization_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        ) IS NULL -- Super admin
    )
)
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            school_id IN (
                SELECT id
                FROM public.school_branding
                WHERE
                    organization_id = (
                        SELECT organization_id
                        FROM public.profiles
                        WHERE
                            id = auth.uid ()
                    )
                    AND deleted_at IS NULL
            )
            OR (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) IS NULL -- Super admin
        )
    );

-- Buildings: Users can delete buildings for schools in their organization
CREATE POLICY "Users can delete buildings for their organization schools" ON public.buildings FOR DELETE TO authenticated USING (
    deleted_at IS NULL
    AND (
        school_id IN (
            SELECT id
            FROM public.school_branding
            WHERE
                organization_id = (
                    SELECT organization_id
                    FROM public.profiles
                    WHERE
                        id = auth.uid ()
                )
                AND deleted_at IS NULL
        )
        OR (
            SELECT organization_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        ) IS NULL -- Super admin
    )
);

-- Service role policy for buildings
DROP POLICY IF EXISTS "Service role full access to buildings" ON public.buildings;

DROP POLICY IF EXISTS "Allow service role full access to buildings" ON public.buildings;

CREATE POLICY "Service role full access to buildings" ON public.buildings FOR ALL TO service_role USING (true)
WITH
    CHECK (true);

-- Rooms: Drop old policies
DROP POLICY IF EXISTS "Allow authenticated users to read rooms" ON public.rooms;

DROP POLICY IF EXISTS "Allow authenticated users to insert rooms" ON public.rooms;

DROP POLICY IF EXISTS "Allow authenticated users to update rooms" ON public.rooms;

DROP POLICY IF EXISTS "Allow authenticated users to delete rooms" ON public.rooms;

DROP POLICY IF EXISTS "Allow anon users to read rooms" ON public.rooms;

DROP POLICY IF EXISTS "Allow anon users to insert rooms" ON public.rooms;

DROP POLICY IF EXISTS "Allow anon users to update rooms" ON public.rooms;

DROP POLICY IF EXISTS "Allow anon users to delete rooms" ON public.rooms;

-- Rooms: Users can read rooms for schools in their organization
CREATE POLICY "Users can read rooms for their organization schools" ON public.rooms FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            school_id IN (
                SELECT id
                FROM public.school_branding
                WHERE
                    organization_id = (
                        SELECT organization_id
                        FROM public.profiles
                        WHERE
                            id = auth.uid ()
                    )
                    AND deleted_at IS NULL
            )
            OR (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) IS NULL -- Super admin
        )
    );

-- Rooms: Users can insert rooms for schools in their organization
CREATE POLICY "Users can insert rooms for their organization schools" ON public.rooms FOR
INSERT
    TO authenticated
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            school_id IN (
                SELECT id
                FROM public.school_branding
                WHERE
                    organization_id = (
                        SELECT organization_id
                        FROM public.profiles
                        WHERE
                            id = auth.uid ()
                    )
                    AND deleted_at IS NULL
            )
            OR (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) IS NULL -- Super admin
        )
    );

-- Rooms: Users can update rooms for schools in their organization
CREATE POLICY "Users can update rooms for their organization schools" ON public.rooms FOR
UPDATE TO authenticated USING (
    deleted_at IS NULL
    AND (
        school_id IN (
            SELECT id
            FROM public.school_branding
            WHERE
                organization_id = (
                    SELECT organization_id
                    FROM public.profiles
                    WHERE
                        id = auth.uid ()
                )
                AND deleted_at IS NULL
        )
        OR (
            SELECT organization_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        ) IS NULL -- Super admin
    )
)
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            school_id IN (
                SELECT id
                FROM public.school_branding
                WHERE
                    organization_id = (
                        SELECT organization_id
                        FROM public.profiles
                        WHERE
                            id = auth.uid ()
                    )
                    AND deleted_at IS NULL
            )
            OR (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) IS NULL -- Super admin
        )
    );

-- Rooms: Users can delete rooms for schools in their organization
CREATE POLICY "Users can delete rooms for their organization schools" ON public.rooms FOR DELETE TO authenticated USING (
    deleted_at IS NULL
    AND (
        school_id IN (
            SELECT id
            FROM public.school_branding
            WHERE
                organization_id = (
                    SELECT organization_id
                    FROM public.profiles
                    WHERE
                        id = auth.uid ()
                )
                AND deleted_at IS NULL
        )
        OR (
            SELECT organization_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        ) IS NULL -- Super admin
    )
);

-- Service role policy for rooms
DROP POLICY IF EXISTS "Service role full access to rooms" ON public.rooms;

DROP POLICY IF EXISTS "Allow service role full access to rooms" ON public.rooms;

CREATE POLICY "Service role full access to rooms" ON public.rooms FOR ALL TO service_role USING (true)
WITH
    CHECK (true);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Buildings and rooms now belong to schools (school_id) instead of organizations
-- You can filter by organization through: school.organization_id
-- The triggers automatically set school_id from the user's organization