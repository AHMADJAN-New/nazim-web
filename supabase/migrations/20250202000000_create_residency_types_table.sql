-- ============================================================================
-- Residency Types
-- ============================================================================
-- Residency types define whether a student is day (نهاري) or night (لیلیه) student
-- Supports multi-tenancy with organization_id (NULL = global types available to all)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.residency_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Unique constraint: code must be unique per organization (or globally if organization_id is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_residency_types_unique_code_per_org 
    ON public.residency_types (code, organization_id)
    WHERE deleted_at IS NULL;

-- Index on organization_id for performance
CREATE INDEX IF NOT EXISTS idx_residency_types_organization_id 
    ON public.residency_types(organization_id);

-- Index on deleted_at for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_residency_types_deleted_at 
    ON public.residency_types(deleted_at)
    WHERE deleted_at IS NULL;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_residency_types_updated_at
    BEFORE UPDATE ON public.residency_types
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.residency_types ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.residency_types IS 'Residency types (نهاري - Day, لیلیه - Night) with organization isolation. NULL organization_id = global types available to all organizations.';

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Service role full access
CREATE POLICY "Service role full access to residency_types" 
    ON public.residency_types FOR ALL TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Users can read:
-- 1. Global residency types (organization_id IS NULL)
-- 2. Residency types for their organization
-- 3. Super admin can read all
CREATE POLICY "Users can read residency_types" 
    ON public.residency_types FOR SELECT TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id IS NULL
            OR organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
    );

-- Users can insert residency types for their organization
-- Super admin can insert global types (organization_id = NULL)
CREATE POLICY "Users can insert residency_types" 
    ON public.residency_types FOR INSERT TO authenticated 
    WITH CHECK (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR (
                public.get_current_user_organization_id() IS NULL
                AND public.get_current_user_role() = 'super_admin'
            )
        )
    );

-- Users can update residency types for their organization
-- Super admin can update all
CREATE POLICY "Users can update residency_types" 
    ON public.residency_types FOR UPDATE TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
    )
    WITH CHECK (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
    );

-- Users can delete (soft delete) residency types for their organization
-- Super admin can delete all
CREATE POLICY "Users can delete residency_types" 
    ON public.residency_types FOR DELETE TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
    );

