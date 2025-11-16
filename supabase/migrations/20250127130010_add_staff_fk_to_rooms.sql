-- Add foreign key constraint from rooms.staff_id to staff.id
-- This migration runs after staff table is created

-- First, ensure the staff_id column exists (it should from the original rooms migration)
-- If it doesn't exist, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'rooms' 
        AND column_name = 'staff_id'
    ) THEN
        ALTER TABLE public.rooms ADD COLUMN staff_id UUID NULL;
    END IF;
END $$;

-- Drop the foreign key constraint if it exists (in case it was added incorrectly)
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_staff_id_fkey;

-- Add the foreign key constraint to staff table
ALTER TABLE public.rooms 
    ADD CONSTRAINT rooms_staff_id_fkey 
    FOREIGN KEY (staff_id) 
    REFERENCES public.staff(id) 
    ON DELETE SET NULL;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_rooms_staff_id ON public.rooms(staff_id);

-- Add comment
COMMENT ON COLUMN public.rooms.staff_id IS 'Reference to staff member assigned to this room (e.g., warden, manager)';

