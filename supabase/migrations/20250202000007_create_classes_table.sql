-- ============================================================================
-- Classes (Base Class Definitions)
-- ============================================================================
-- Base class definitions that can be reused across academic years
-- Supports multi-tenancy with organization_id (NULL = global classes available to all)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    organization_id UUID NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    grade_level INTEGER NULL,
    description TEXT NULL,
    default_capacity INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Unique constraint: code must be unique per organization (or globally if organization_id is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_unique_code_per_org ON public.classes (code, organization_id)
WHERE
    deleted_at IS NULL;

-- Index on organization_id for performance
CREATE INDEX IF NOT EXISTS idx_classes_organization_id ON public.classes (organization_id);

-- Index on grade_level for filtering
CREATE INDEX IF NOT EXISTS idx_classes_grade_level ON public.classes (grade_level)
WHERE
    deleted_at IS NULL;

-- Index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_classes_is_active ON public.classes (is_active)
WHERE
    deleted_at IS NULL;

-- Index on deleted_at for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_classes_deleted_at ON public.classes (deleted_at)
WHERE
    deleted_at IS NULL;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON public.classes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

COMMENT ON
TABLE public.classes IS 'Base class definitions reusable across academic years with organization isolation. NULL organization_id = global classes available to all organizations.';

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Service role full access
CREATE POLICY "Service role full access to classes" ON public.classes FOR ALL TO service_role USING (true)
WITH
    CHECK (true);

-- Users can read:
-- 1. Global classes (organization_id IS NULL)
-- 2. Classes for their organization
-- 3. Super admin can read all
CREATE POLICY "Users can read classes" ON public.classes FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            organization_id IS NULL
            OR organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_organization_id () IS NULL
        )
    );

-- Users can insert classes for their organization
-- Super admin can insert global classes (organization_id = NULL)
CREATE POLICY "Users can insert classes" ON public.classes FOR
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

-- Users can update classes for their organization
-- Super admin can update all
CREATE POLICY "Users can update classes" ON public.classes FOR
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

-- Users can delete (soft delete) classes for their organization
-- Super admin can delete all
CREATE POLICY "Users can delete classes" ON public.classes FOR DELETE TO authenticated USING (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id ()
        OR public.get_current_user_organization_id () IS NULL
    )
);