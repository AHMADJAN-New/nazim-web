-- ============================================================================
-- Subjects (Base Subject Definitions)
-- ============================================================================
-- Base subject definitions that can be reused across academic years
-- Supports multi-tenancy with organization_id (NULL = global subjects available to all)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    organization_id UUID NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Unique constraint: code must be unique per organization (or globally if organization_id is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_unique_code_per_org ON public.subjects (code, organization_id)
WHERE
    deleted_at IS NULL;

-- Index on organization_id for performance
CREATE INDEX IF NOT EXISTS idx_subjects_organization_id ON public.subjects (organization_id);

-- Index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_subjects_is_active ON public.subjects (is_active)
WHERE
    deleted_at IS NULL;

-- Index on deleted_at for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_subjects_deleted_at ON public.subjects (deleted_at)
WHERE
    deleted_at IS NULL;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON public.subjects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

COMMENT ON
TABLE public.subjects IS 'Base subject definitions reusable across academic years with organization isolation. NULL organization_id = global subjects available to all organizations.';

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Service role full access
CREATE POLICY "Service role full access to subjects" ON public.subjects FOR ALL TO service_role USING (true)
WITH
    CHECK (true);

-- Users can read:
-- 1. Global subjects (organization_id IS NULL)
-- 2. Subjects for their organization
-- 3. Super admin can read all
CREATE POLICY "Users can read subjects" ON public.subjects FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            organization_id IS NULL
            OR organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_organization_id () IS NULL
        )
    );

-- Users can insert subjects for their organization
-- Super admin can insert global subjects (organization_id = NULL)
CREATE POLICY "Users can insert subjects" ON public.subjects FOR
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

-- Users can update subjects for their organization
-- Super admin can update all
CREATE POLICY "Users can update subjects" ON public.subjects FOR
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

-- Users can delete (soft delete) subjects for their organization
-- Super admin can delete all
CREATE POLICY "Users can delete subjects" ON public.subjects FOR DELETE TO authenticated USING (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id ()
        OR public.get_current_user_organization_id () IS NULL
    )
);

