-- Add organization_id to buildings table for multi-tenancy
-- First, add the column as nullable temporarily
ALTER TABLE public.buildings 
    ADD COLUMN IF NOT EXISTS organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create index on organization_id
CREATE INDEX IF NOT EXISTS idx_buildings_organization_id ON public.buildings(organization_id);

-- Drop old unique constraint on building_name
ALTER TABLE public.buildings 
    DROP CONSTRAINT IF EXISTS buildings_building_name_key;

-- Add new unique constraint: building_name must be unique within an organization
ALTER TABLE public.buildings 
    ADD CONSTRAINT buildings_building_name_organization_unique 
    UNIQUE (building_name, organization_id);

-- For existing data: If there are buildings without organization_id, 
-- you'll need to assign them to an organization manually or via a data migration
-- For now, we'll make it NOT NULL after ensuring all rows have an organization_id
-- This is a safety measure - in production, you'd handle existing data first

-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to read buildings" ON public.buildings;
DROP POLICY IF EXISTS "Allow authenticated users to insert buildings" ON public.buildings;
DROP POLICY IF EXISTS "Allow authenticated users to update buildings" ON public.buildings;
DROP POLICY IF EXISTS "Allow authenticated users to delete buildings" ON public.buildings;
DROP POLICY IF EXISTS "Allow anon users to read buildings" ON public.buildings;
DROP POLICY IF EXISTS "Allow anon users to insert buildings" ON public.buildings;
DROP POLICY IF EXISTS "Allow anon users to update buildings" ON public.buildings;
DROP POLICY IF EXISTS "Allow anon users to delete buildings" ON public.buildings;
DROP POLICY IF EXISTS "Allow service role full access to buildings" ON public.buildings;

-- Create new RLS policies with organization isolation
-- Note: These policies will use helper functions created in migration 20250127130006

-- Policy: Users can read buildings in their organization or all if super admin
CREATE POLICY "Users can read their organization's buildings"
    ON public.buildings
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

-- Policy: Users can insert buildings in their organization
CREATE POLICY "Users can insert buildings in their organization"
    ON public.buildings
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

-- Policy: Users can update buildings in their organization
CREATE POLICY "Users can update their organization's buildings"
    ON public.buildings
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

-- Policy: Users can delete buildings in their organization
CREATE POLICY "Users can delete their organization's buildings"
    ON public.buildings
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
CREATE POLICY "Service role full access to buildings"
    ON public.buildings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Update comment
COMMENT ON TABLE public.buildings IS 'Lookup table for building names with organization isolation';

