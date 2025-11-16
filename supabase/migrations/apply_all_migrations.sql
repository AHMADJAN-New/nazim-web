-- Combined Migration File for Buildings and Rooms Tables
-- Run this file in Supabase SQL Editor to create both tables at once

-- ============================================
-- 1. CREATE BUILDINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index on building_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_buildings_building_name ON public.buildings(building_name);

-- Create function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_buildings_updated_at ON public.buildings;
CREATE TRIGGER update_buildings_updated_at
    BEFORE UPDATE ON public.buildings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read buildings" ON public.buildings;
DROP POLICY IF EXISTS "Allow authenticated users to insert buildings" ON public.buildings;
DROP POLICY IF EXISTS "Allow authenticated users to update buildings" ON public.buildings;
DROP POLICY IF EXISTS "Allow authenticated users to delete buildings" ON public.buildings;

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

-- Add comment to table
COMMENT ON TABLE public.buildings IS 'Lookup table for building names';

-- ============================================
-- 2. CREATE ROOMS TABLE
-- ============================================
-- Note: This table references the staff table. If staff table doesn't exist yet,
-- you can temporarily comment out the staff_id foreign key constraint.

CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number VARCHAR(100) NOT NULL,
    building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    staff_id UUID NULL, -- Foreign key will be added when staff table exists
    -- staff_id UUID NULL REFERENCES public.staff(id) ON DELETE SET NULL, -- Uncomment when staff table exists
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Ensure unique room numbers within the same building
    UNIQUE(room_number, building_id)
);

-- Create index on building_id for faster foreign key lookups
CREATE INDEX IF NOT EXISTS idx_rooms_building_id ON public.rooms(building_id);

-- Create index on staff_id for faster foreign key lookups (when staff table exists)
CREATE INDEX IF NOT EXISTS idx_rooms_staff_id ON public.rooms(staff_id);

-- Create index on room_number for faster searches
CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON public.rooms(room_number);

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow authenticated users to insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow authenticated users to update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow authenticated users to delete rooms" ON public.rooms;

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

-- Add comment to table
COMMENT ON TABLE public.rooms IS 'Lookup table for rooms with building and staff relationships';

-- ============================================
-- 3. ADD STAFF FOREIGN KEY (Run this later when staff table exists)
-- ============================================
-- Uncomment and run this when you create the staff table:
/*
ALTER TABLE public.rooms 
    ADD CONSTRAINT rooms_staff_id_fkey 
    FOREIGN KEY (staff_id) 
    REFERENCES public.staff(id) 
    ON DELETE SET NULL;
*/

