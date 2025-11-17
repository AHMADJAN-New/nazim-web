-- Add soft delete (deleted_at) column to all tables that don't have it
-- This allows us to soft delete records instead of hard deleting them

-- Organizations table
ALTER TABLE public.organizations 
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at ON public.organizations(deleted_at) WHERE deleted_at IS NULL;

-- Profiles table
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at) WHERE deleted_at IS NULL;

-- Buildings table
ALTER TABLE public.buildings 
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
CREATE INDEX IF NOT EXISTS idx_buildings_deleted_at ON public.buildings(deleted_at) WHERE deleted_at IS NULL;

-- Rooms table
ALTER TABLE public.rooms 
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
CREATE INDEX IF NOT EXISTS idx_rooms_deleted_at ON public.rooms(deleted_at) WHERE deleted_at IS NULL;

-- Staff table
ALTER TABLE public.staff 
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
CREATE INDEX IF NOT EXISTS idx_staff_deleted_at ON public.staff(deleted_at) WHERE deleted_at IS NULL;

-- Super admin organizations table
ALTER TABLE public.super_admin_organizations 
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
CREATE INDEX IF NOT EXISTS idx_super_admin_orgs_deleted_at ON public.super_admin_organizations(deleted_at) WHERE deleted_at IS NULL;

-- Update RLS policies to exclude soft-deleted records
-- This will be done in a separate migration to avoid conflicts

-- Add comments
COMMENT ON COLUMN public.organizations.deleted_at IS 'Soft delete timestamp - NULL means not deleted';
COMMENT ON COLUMN public.profiles.deleted_at IS 'Soft delete timestamp - NULL means not deleted';
COMMENT ON COLUMN public.buildings.deleted_at IS 'Soft delete timestamp - NULL means not deleted';
COMMENT ON COLUMN public.rooms.deleted_at IS 'Soft delete timestamp - NULL means not deleted';
COMMENT ON COLUMN public.staff.deleted_at IS 'Soft delete timestamp - NULL means not deleted';
COMMENT ON COLUMN public.super_admin_organizations.deleted_at IS 'Soft delete timestamp - NULL means not deleted';

