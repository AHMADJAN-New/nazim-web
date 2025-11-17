-- Combined Migration: Apply all new migrations for schools, soft deletes, and auto organization_id
-- Run this file in Supabase SQL Editor to apply all changes at once
--
-- This migration includes:
-- 1. Fix school_branding to allow multiple schools per organization
-- 2. Add soft delete (deleted_at) to all tables
-- 3. Update RLS policies for soft deletes
-- 4. Create automatic organization_id triggers

-- ============================================
-- 1. FIX SCHOOL_BRANDING - Allow Multiple Schools Per Organization
-- ============================================

-- Drop the unique constraint if it exists
ALTER TABLE public.school_branding
DROP CONSTRAINT IF EXISTS school_branding_organization_id_key;

-- Add deleted_at column for soft deletes (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'school_branding' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.school_branding 
            ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL;
    END IF;
END $$;

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_school_branding_deleted_at ON public.school_branding (deleted_at)
WHERE
    deleted_at IS NULL;

-- Update RLS policies to exclude soft-deleted records
DROP POLICY IF EXISTS "Users can read branding for their organization" ON public.school_branding;

CREATE POLICY "Users can read branding for their organization" ON public.school_branding FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            organization_id = (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            )
            OR (
                SELECT role
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) = 'super_admin'
        )
    );

-- Update insert policy
DROP POLICY IF EXISTS "Admins can insert branding for their organization" ON public.school_branding;

CREATE POLICY "Admins can insert branding for their organization" ON public.school_branding FOR
INSERT
    TO authenticated
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            (
                SELECT role
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) IN ('admin', 'super_admin')
            AND (
                organization_id = (
                    SELECT organization_id
                    FROM public.profiles
                    WHERE
                        id = auth.uid ()
                )
                OR (
                    SELECT role
                    FROM public.profiles
                    WHERE
                        id = auth.uid ()
                ) = 'super_admin'
            )
        )
    );

-- Update update policy
DROP POLICY IF EXISTS "Admins can update branding for their organization" ON public.school_branding;

CREATE POLICY "Admins can update branding for their organization" ON public.school_branding FOR
UPDATE TO authenticated USING (
    deleted_at IS NULL
    AND (
        (
            SELECT role
            FROM public.profiles
            WHERE
                id = auth.uid ()
        ) IN ('admin', 'super_admin')
        AND (
            organization_id = (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            )
            OR (
                SELECT role
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) = 'super_admin'
        )
    )
)
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            (
                SELECT role
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) IN ('admin', 'super_admin')
        )
    );

-- Add comment
COMMENT ON COLUMN public.school_branding.deleted_at IS 'Soft delete timestamp - NULL means not deleted';

-- ============================================
-- 2. ADD SOFT DELETE (deleted_at) TO ALL TABLES
-- ============================================

-- Organizations table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.organizations 
            ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL;

END IF;

END $$;

CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at ON public.organizations (deleted_at)
WHERE
    deleted_at IS NULL;

COMMENT ON COLUMN public.organizations.deleted_at IS 'Soft delete timestamp - NULL means not deleted';

-- Profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.profiles 
            ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL;

END IF;

END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles (deleted_at)
WHERE
    deleted_at IS NULL;

COMMENT ON COLUMN public.profiles.deleted_at IS 'Soft delete timestamp - NULL means not deleted';

-- Buildings table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'buildings' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.buildings 
            ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL;

END IF;

END $$;

CREATE INDEX IF NOT EXISTS idx_buildings_deleted_at ON public.buildings (deleted_at)
WHERE
    deleted_at IS NULL;

COMMENT ON COLUMN public.buildings.deleted_at IS 'Soft delete timestamp - NULL means not deleted';

-- Rooms table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'rooms' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.rooms 
            ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL;

END IF;

END $$;

CREATE INDEX IF NOT EXISTS idx_rooms_deleted_at ON public.rooms (deleted_at)
WHERE
    deleted_at IS NULL;

COMMENT ON COLUMN public.rooms.deleted_at IS 'Soft delete timestamp - NULL means not deleted';

-- Staff table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'staff' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.staff 
            ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL;

END IF;

END $$;

CREATE INDEX IF NOT EXISTS idx_staff_deleted_at ON public.staff (deleted_at)
WHERE
    deleted_at IS NULL;

COMMENT ON COLUMN public.staff.deleted_at IS 'Soft delete timestamp - NULL means not deleted';

-- Super admin organizations table (if exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'super_admin_organizations'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'super_admin_organizations' 
            AND column_name = 'deleted_at'
        ) THEN
            ALTER TABLE public.super_admin_organizations 
                ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL;

END IF;

END IF;

END $$;

CREATE INDEX IF NOT EXISTS idx_super_admin_orgs_deleted_at ON public.super_admin_organizations (deleted_at)
WHERE
    deleted_at IS NULL;

COMMENT ON COLUMN public.super_admin_organizations.deleted_at IS 'Soft delete timestamp - NULL means not deleted';

-- ============================================
-- 3. UPDATE RLS POLICIES FOR SOFT DELETES
-- ============================================

-- Organizations policies
DROP POLICY IF EXISTS "Authenticated users can read their organization" ON public.organizations;

CREATE POLICY "Authenticated users can read their organization" ON public.organizations FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            id = (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            )
            OR (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) IS NULL -- Super admin (organization_id IS NULL)
        )
    );

-- Profiles policies
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;

CREATE POLICY "Users can read their own profile" ON public.profiles FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND id = auth.uid ()
    );

DROP POLICY IF EXISTS "Users can read profiles in their organization" ON public.profiles;

CREATE POLICY "Users can read profiles in their organization" ON public.profiles FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            organization_id = (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            )
            OR (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) IS NULL -- Super admin can read all
        )
    );

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" ON public.profiles FOR
UPDATE TO authenticated USING (
    deleted_at IS NULL
    AND id = auth.uid ()
)
WITH
    CHECK (
        deleted_at IS NULL
        AND id = auth.uid ()
    );

DROP POLICY IF EXISTS "Admins can update profiles in their organization" ON public.profiles;

CREATE POLICY "Admins can update profiles in their organization" ON public.profiles FOR
UPDATE TO authenticated USING (
    deleted_at IS NULL
    AND (
        (
            SELECT role
            FROM public.profiles
            WHERE
                id = auth.uid ()
        ) IN ('admin', 'super_admin')
        AND (
            organization_id = (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            )
            OR (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) IS NULL -- Super admin
        )
    )
)
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            (
                SELECT role
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) IN ('admin', 'super_admin')
        )
    );

-- ============================================
-- 4. CREATE AUTOMATIC ORGANIZATION_ID TRIGGERS
-- ============================================

-- Create function to automatically set organization_id from user's profile
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

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- All migrations have been applied successfully!
-- The following changes are now active:
-- 1. Multiple schools per organization (removed UNIQUE constraint)
-- 2. Soft deletes (deleted_at column) added to all tables
-- 3. RLS policies updated to exclude soft-deleted records
-- 4. Automatic organization_id insertion via triggers