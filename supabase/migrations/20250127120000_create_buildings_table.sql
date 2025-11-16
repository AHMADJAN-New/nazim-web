-- Create buildings table
CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index on building_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_buildings_building_name ON public.buildings(building_name);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_buildings_updated_at
    BEFORE UPDATE ON public.buildings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read buildings
CREATE POLICY "Allow authenticated users to read buildings"
    ON public.buildings
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policy to allow authenticated users to insert buildings
CREATE POLICY "Allow authenticated users to insert buildings"
    ON public.buildings
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create policy to allow authenticated users to update buildings
CREATE POLICY "Allow authenticated users to update buildings"
    ON public.buildings
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create policy to allow authenticated users to delete buildings
CREATE POLICY "Allow authenticated users to delete buildings"
    ON public.buildings
    FOR DELETE
    TO authenticated
    USING (true);

-- Allow anon role for development (remove in production if needed)
CREATE POLICY "Allow anon users to read buildings"
    ON public.buildings
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow anon users to insert buildings"
    ON public.buildings
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anon users to update buildings"
    ON public.buildings
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anon users to delete buildings"
    ON public.buildings
    FOR DELETE
    TO anon
    USING (true);

-- Allow service_role for admin operations
CREATE POLICY "Allow service role full access to buildings"
    ON public.buildings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE public.buildings IS 'Lookup table for building names';

