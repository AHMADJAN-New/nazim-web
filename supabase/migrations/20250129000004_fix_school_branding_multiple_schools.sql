-- Fix school_branding table to allow multiple schools per organization
-- Remove UNIQUE constraint on organization_id
-- Add deleted_at for soft deletes

-- Drop the unique constraint if it exists
ALTER TABLE public.school_branding 
    DROP CONSTRAINT IF EXISTS school_branding_organization_id_key;

-- Add deleted_at column for soft deletes
ALTER TABLE public.school_branding 
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_school_branding_deleted_at ON public.school_branding(deleted_at) WHERE deleted_at IS NULL;

-- Update RLS policies to exclude soft-deleted records
DROP POLICY IF EXISTS "Users can read branding for their organization" ON public.school_branding;
CREATE POLICY "Users can read branding for their organization"
    ON public.school_branding
    FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            organization_id = (
                SELECT organization_id 
                FROM public.profiles 
                WHERE id = auth.uid()
            )
            OR (
                SELECT role 
                FROM public.profiles 
                WHERE id = auth.uid()
            ) = 'super_admin'
        )
    );

-- Update insert policy
DROP POLICY IF EXISTS "Admins can insert branding for their organization" ON public.school_branding;
CREATE POLICY "Admins can insert branding for their organization"
    ON public.school_branding
    FOR INSERT
    TO authenticated
    WITH CHECK (
        deleted_at IS NULL
        AND (
            (
                SELECT role 
                FROM public.profiles 
                WHERE id = auth.uid()
            ) IN ('admin', 'super_admin')
            AND (
                organization_id = (
                    SELECT organization_id 
                    FROM public.profiles 
                    WHERE id = auth.uid()
                )
                OR (
                    SELECT role 
                    FROM public.profiles 
                    WHERE id = auth.uid()
                ) = 'super_admin'
            )
        )
    );

-- Update update policy
DROP POLICY IF EXISTS "Admins can update branding for their organization" ON public.school_branding;
CREATE POLICY "Admins can update branding for their organization"
    ON public.school_branding
    FOR UPDATE
    TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            (
                SELECT role 
                FROM public.profiles 
                WHERE id = auth.uid()
            ) IN ('admin', 'super_admin')
            AND (
                organization_id = (
                    SELECT organization_id 
                    FROM public.profiles 
                    WHERE id = auth.uid()
                )
                OR (
                    SELECT role 
                    FROM public.profiles 
                    WHERE id = auth.uid()
                ) = 'super_admin'
            )
        )
    )
    WITH CHECK (
        deleted_at IS NULL
        AND (
            (
                SELECT role 
                FROM public.profiles 
                WHERE id = auth.uid()
            ) IN ('admin', 'super_admin')
        )
    );

-- Add comment
COMMENT ON COLUMN public.school_branding.deleted_at IS 'Soft delete timestamp - NULL means not deleted';

