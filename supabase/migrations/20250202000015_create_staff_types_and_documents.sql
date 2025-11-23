-- ============================================================================
-- Staff Types Lookup Table
-- ============================================================================
-- Lookup table for staff roles/types to replace hardcoded strings
-- Supports multi-tenancy with organization_id (NULL = global types)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.staff_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    organization_id UUID NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Unique constraint: code must be unique per organization (or globally if organization_id is NULL)
-- Use COALESCE to handle NULL organization_id for unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_types_unique_code_per_org 
ON public.staff_types (code, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid))
WHERE deleted_at IS NULL;

-- Index on organization_id for performance
CREATE INDEX IF NOT EXISTS idx_staff_types_organization_id ON public.staff_types (organization_id);

-- Index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_staff_types_is_active ON public.staff_types (is_active)
WHERE
    deleted_at IS NULL;

-- Index on deleted_at for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_staff_types_deleted_at ON public.staff_types (deleted_at)
WHERE
    deleted_at IS NULL;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_staff_types_updated_at
    BEFORE UPDATE ON public.staff_types
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.staff_types ENABLE ROW LEVEL SECURITY;

COMMENT ON
TABLE public.staff_types IS 'Lookup table for staff roles/types. NULL organization_id = global types available to all organizations.';

-- ============================================================================
-- Staff Documents Table
-- ============================================================================
-- Dedicated table for managing staff documents (replacing JSONB array)
-- Supports organization and school-based folder structure
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.staff_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    staff_id UUID NOT NULL REFERENCES public.staff (id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding (id) ON DELETE SET NULL,
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NULL,
    mime_type VARCHAR(100) NULL,
    description TEXT NULL,
    uploaded_by UUID NULL REFERENCES public.profiles (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Index on staff_id for performance
CREATE INDEX IF NOT EXISTS idx_staff_documents_staff_id ON public.staff_documents (staff_id);

-- Index on organization_id for multi-tenancy
CREATE INDEX IF NOT EXISTS idx_staff_documents_organization_id ON public.staff_documents (organization_id);

-- Index on school_id for school-based filtering
CREATE INDEX IF NOT EXISTS idx_staff_documents_school_id ON public.staff_documents (school_id);

-- Index on document_type for filtering
CREATE INDEX IF NOT EXISTS idx_staff_documents_document_type ON public.staff_documents (document_type)
WHERE
    deleted_at IS NULL;

-- Index on deleted_at for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_staff_documents_deleted_at ON public.staff_documents (deleted_at)
WHERE
    deleted_at IS NULL;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_staff_documents_updated_at
    BEFORE UPDATE ON public.staff_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-set organization_id from staff
CREATE OR REPLACE FUNCTION public.auto_set_staff_document_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- If organization_id is not set, get it from staff
    IF NEW.organization_id IS NULL THEN
        SELECT organization_id INTO NEW.organization_id
        FROM public.staff
        WHERE id = NEW.staff_id AND deleted_at IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER auto_set_staff_document_organization_id_trigger
    BEFORE INSERT OR UPDATE ON public.staff_documents
    FOR EACH ROW
    WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION public.auto_set_staff_document_organization_id();

-- Enable RLS
ALTER TABLE public.staff_documents ENABLE ROW LEVEL SECURITY;

COMMENT ON
TABLE public.staff_documents IS 'Staff documents with organization and school-based folder structure. Replaces JSONB document_urls array.';

-- ============================================================================
-- Update Staff Table
-- ============================================================================
-- Add new columns: staff_type_id and school_id
-- Migrate existing data from staff_type to staff_type_id
-- Remove old columns after migration
-- ============================================================================

-- Step 1: Add new columns (nullable initially for migration)
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS staff_type_id UUID NULL REFERENCES public.staff_types (id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS school_id UUID NULL REFERENCES public.school_branding (id) ON DELETE SET NULL;

-- Step 2: Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_staff_staff_type_id ON public.staff (staff_type_id);

CREATE INDEX IF NOT EXISTS idx_staff_school_id ON public.staff (school_id);

-- Step 3: Insert default global staff types
-- Use a subquery to check for existing records instead of ON CONFLICT
-- This works better with partial unique indexes
INSERT INTO public.staff_types (organization_id, name, code, description, display_order, is_active)
SELECT * FROM (VALUES
    (NULL::uuid, 'Teacher'::varchar, 'teacher'::varchar, 'Teaching staff'::text, 1::integer, true::boolean),
    (NULL::uuid, 'Administrator'::varchar, 'admin'::varchar, 'Administrative staff'::text, 2::integer, true::boolean),
    (NULL::uuid, 'Accountant'::varchar, 'accountant'::varchar, 'Financial staff'::text, 3::integer, true::boolean),
    (NULL::uuid, 'Librarian'::varchar, 'librarian'::varchar, 'Library staff'::text, 4::integer, true::boolean),
    (NULL::uuid, 'Hostel Manager'::varchar, 'hostel_manager'::varchar, 'Hostel management staff'::text, 5::integer, true::boolean),
    (NULL::uuid, 'Asset Manager'::varchar, 'asset_manager'::varchar, 'Asset management staff'::text, 6::integer, true::boolean),
    (NULL::uuid, 'Security'::varchar, 'security'::varchar, 'Security staff'::text, 7::integer, true::boolean),
    (NULL::uuid, 'Maintenance'::varchar, 'maintenance'::varchar, 'Maintenance staff'::text, 8::integer, true::boolean),
    (NULL::uuid, 'Other'::varchar, 'other'::varchar, 'Other staff types'::text, 9::integer, true::boolean)
) AS v(org_id, name_val, code_val, desc_val, order_val, active_val)
WHERE NOT EXISTS (
    SELECT 1 FROM public.staff_types st
    WHERE st.code = v.code_val
    AND (st.organization_id IS NULL AND v.org_id IS NULL)
    AND st.deleted_at IS NULL
);

-- Step 4: Migrate existing staff_type values to staff_type_id
UPDATE public.staff s
SET
    staff_type_id = (
        SELECT id
        FROM public.staff_types st
        WHERE
            st.code = s.staff_type
            AND st.organization_id IS NULL
            AND st.deleted_at IS NULL
        LIMIT 1
    )
WHERE
    s.staff_type_id IS NULL
    AND s.deleted_at IS NULL;

-- Step 5: Migrate existing documents from JSONB to staff_documents table
DO $$
DECLARE
    staff_record RECORD;
    doc_record JSONB;
    doc_type TEXT;
    doc_url TEXT;
    doc_name TEXT;
BEGIN
    FOR staff_record IN 
        SELECT id, organization_id, document_urls 
        FROM public.staff 
        WHERE document_urls IS NOT NULL 
        AND document_urls != '[]'::jsonb
        AND deleted_at IS NULL
    LOOP
        -- Parse each document in the JSONB array
        FOR doc_record IN SELECT * FROM jsonb_array_elements(staff_record.document_urls)
        LOOP
            doc_type := doc_record->>'type';
            doc_url := doc_record->>'url';
            doc_name := doc_record->>'name';
            
            -- Insert into staff_documents if valid
            -- Check if document already exists to avoid duplicates
            IF doc_type IS NOT NULL AND doc_url IS NOT NULL THEN
                -- Only insert if this document doesn't already exist
                IF NOT EXISTS (
                    SELECT 1 FROM public.staff_documents sd
                    WHERE sd.staff_id = staff_record.id
                    AND sd.document_type = doc_type
                    AND sd.file_path = doc_url
                    AND sd.deleted_at IS NULL
                ) THEN
                    INSERT INTO public.staff_documents (
                        staff_id,
                        organization_id,
                        document_type,
                        file_name,
                        file_path,
                        description
                    ) VALUES (
                        staff_record.id,
                        staff_record.organization_id,
                        doc_type,
                        COALESCE(doc_name, doc_url),
                        doc_url,
                        NULL
                    );
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Step 6: Make staff_type_id NOT NULL (after migration)
-- First, set any remaining NULL values to 'other' type
-- This handles cases where staff_type doesn't match any created type
DO $$
DECLARE
    other_type_id UUID;
BEGIN
    -- Get the 'other' type ID
    SELECT id INTO other_type_id
    FROM public.staff_types
    WHERE code = 'other' 
    AND organization_id IS NULL
    AND deleted_at IS NULL
    LIMIT 1;

    -- Only update if 'other' type exists
    IF other_type_id IS NOT NULL THEN
        UPDATE public.staff
        SET staff_type_id = other_type_id
        WHERE staff_type_id IS NULL
        AND deleted_at IS NULL;
    END IF;
END $$;

-- Now make it NOT NULL (only if all records have been migrated)
-- Check if there are any NULL values remaining
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM public.staff
    WHERE staff_type_id IS NULL
    AND deleted_at IS NULL;

    -- Only make NOT NULL if no NULL values remain
    IF null_count = 0 THEN
        ALTER TABLE public.staff
        ALTER COLUMN staff_type_id SET NOT NULL;

ELSE RAISE WARNING 'Cannot set staff_type_id to NOT NULL: % records still have NULL values',
null_count;

END IF;

END $$;

-- Step 7: Remove old columns (after ensuring migration is complete)
-- Only drop if staff_type_id is NOT NULL (migration successful)
DO $$
BEGIN
    -- Check if staff_type_id is NOT NULL
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'staff' 
        AND column_name = 'staff_type_id'
        AND is_nullable = 'NO'
    ) THEN
        -- Migration successful, safe to drop old columns
        ALTER TABLE public.staff
        DROP CONSTRAINT IF EXISTS staff_type_valid;
        
        ALTER TABLE public.staff
        DROP COLUMN IF EXISTS staff_type;
        
        ALTER TABLE public.staff
        DROP COLUMN IF EXISTS document_urls;
    ELSE
        RAISE WARNING 'Skipping column removal: staff_type_id is still nullable. Migration may be incomplete.';
    END IF;
END $$;

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Staff Types RLS Policies
CREATE POLICY "Service role full access to staff_types" ON public.staff_types FOR ALL TO service_role USING (true)
WITH
    CHECK (true);

CREATE POLICY "Users can read staff_types" ON public.staff_types FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            organization_id IS NULL
            OR organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_organization_id () IS NULL
        )
    );

CREATE POLICY "Users can insert staff_types" ON public.staff_types FOR
INSERT
    TO authenticated
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id ()
            OR (
                public.get_current_user_organization_id () IS NULL
                AND public.get_current_user_role () = 'super_admin'
            )
        )
    );

CREATE POLICY "Users can update staff_types" ON public.staff_types FOR
UPDATE TO authenticated USING (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id ()
        OR public.get_current_user_organization_id () IS NULL
    )
)
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_organization_id () IS NULL
        )
    );

CREATE POLICY "Users can delete staff_types" ON public.staff_types FOR DELETE TO authenticated USING (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id ()
        OR public.get_current_user_organization_id () IS NULL
    )
);

-- Staff Documents RLS Policies
CREATE POLICY "Service role full access to staff_documents" ON public.staff_documents FOR ALL TO service_role USING (true)
WITH
    CHECK (true);

CREATE POLICY "Users can read staff_documents" ON public.staff_documents FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_organization_id () IS NULL
        )
    );

CREATE POLICY "Users can insert staff_documents" ON public.staff_documents FOR
INSERT
    TO authenticated
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id ()
            OR (
                public.get_current_user_organization_id () IS NULL
                AND public.get_current_user_role () = 'super_admin'
            )
        )
    );

CREATE POLICY "Users can update staff_documents" ON public.staff_documents FOR
UPDATE TO authenticated USING (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id ()
        OR public.get_current_user_organization_id () IS NULL
    )
)
WITH
    CHECK (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_organization_id () IS NULL
        )
    );

CREATE POLICY "Users can delete staff_documents" ON public.staff_documents FOR DELETE TO authenticated USING (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id ()
        OR public.get_current_user_organization_id () IS NULL
    )
);