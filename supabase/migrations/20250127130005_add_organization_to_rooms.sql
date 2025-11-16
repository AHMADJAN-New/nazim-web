-- Add organization_id to rooms table for multi-tenancy
-- Add the column as nullable temporarily
ALTER TABLE public.rooms 
    ADD COLUMN IF NOT EXISTS organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create index on organization_id
CREATE INDEX IF NOT EXISTS idx_rooms_organization_id ON public.rooms(organization_id);

-- Create function to automatically set organization_id from building
CREATE OR REPLACE FUNCTION set_room_organization_from_building()
RETURNS TRIGGER AS $$
BEGIN
    -- If organization_id is not set, get it from the building
    IF NEW.organization_id IS NULL THEN
        SELECT organization_id INTO NEW.organization_id
        FROM public.buildings
        WHERE id = NEW.building_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set organization_id from building
DROP TRIGGER IF EXISTS set_room_organization_trigger ON public.rooms;
CREATE TRIGGER set_room_organization_trigger
    BEFORE INSERT OR UPDATE ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION set_room_organization_from_building();

-- Update existing rooms to have organization_id from their building
UPDATE public.rooms r
SET organization_id = b.organization_id
FROM public.buildings b
WHERE r.building_id = b.id
AND r.organization_id IS NULL;

-- Add constraint to ensure organization_id matches building's organization
-- This will be enforced by the trigger, but we add a check constraint for safety
ALTER TABLE public.rooms
    ADD CONSTRAINT rooms_organization_matches_building CHECK (
        organization_id = (
            SELECT organization_id 
            FROM public.buildings 
            WHERE id = building_id
        )
    );

-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to read rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow authenticated users to insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow authenticated users to update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow authenticated users to delete rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow anon users to read rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow anon users to insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow anon users to update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow anon users to delete rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow service role full access to rooms" ON public.rooms;

-- Create new RLS policies with organization isolation

-- Policy: Users can read rooms in their organization or all if super admin
CREATE POLICY "Users can read their organization's rooms"
    ON public.rooms
    FOR SELECT
    TO authenticated
    USING (
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        ) IS NULL  -- Super admin
    );

-- Policy: Users can insert rooms in their organization
CREATE POLICY "Users can insert rooms in their organization"
    ON public.rooms
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        ) IS NULL  -- Super admin
    );

-- Policy: Users can update rooms in their organization
CREATE POLICY "Users can update their organization's rooms"
    ON public.rooms
    FOR UPDATE
    TO authenticated
    USING (
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        ) IS NULL  -- Super admin
    )
    WITH CHECK (
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        ) IS NULL  -- Super admin
    );

-- Policy: Users can delete rooms in their organization
CREATE POLICY "Users can delete their organization's rooms"
    ON public.rooms
    FOR DELETE
    TO authenticated
    USING (
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        ) IS NULL  -- Super admin
    );

-- Policy: Service role has full access
CREATE POLICY "Service role full access to rooms"
    ON public.rooms
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Update comment
COMMENT ON TABLE public.rooms IS 'Lookup table for rooms with building and staff relationships, organization isolated';

