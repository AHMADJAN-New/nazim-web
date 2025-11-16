-- Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number VARCHAR(100) NOT NULL,
    building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    staff_id UUID NULL, -- FK constraint will be added in migration 20250127130010_add_staff_fk_to_rooms.sql
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Ensure unique room numbers within the same building
    UNIQUE(room_number, building_id)
);

-- Create index on building_id for faster foreign key lookups
CREATE INDEX IF NOT EXISTS idx_rooms_building_id ON public.rooms(building_id);

-- Create index on staff_id for faster foreign key lookups
CREATE INDEX IF NOT EXISTS idx_rooms_staff_id ON public.rooms(staff_id);

-- Create index on room_number for faster searches
CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON public.rooms(room_number);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read rooms
CREATE POLICY "Allow authenticated users to read rooms"
    ON public.rooms
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policy to allow authenticated users to insert rooms
CREATE POLICY "Allow authenticated users to insert rooms"
    ON public.rooms
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create policy to allow authenticated users to update rooms
CREATE POLICY "Allow authenticated users to update rooms"
    ON public.rooms
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create policy to allow authenticated users to delete rooms
CREATE POLICY "Allow authenticated users to delete rooms"
    ON public.rooms
    FOR DELETE
    TO authenticated
    USING (true);

-- Allow anon role for development (remove in production if needed)
CREATE POLICY "Allow anon users to read rooms"
    ON public.rooms
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow anon users to insert rooms"
    ON public.rooms
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anon users to update rooms"
    ON public.rooms
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anon users to delete rooms"
    ON public.rooms
    FOR DELETE
    TO anon
    USING (true);

-- Allow service_role for admin operations
CREATE POLICY "Allow service role full access to rooms"
    ON public.rooms
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE public.rooms IS 'Lookup table for rooms with building and staff relationships';

