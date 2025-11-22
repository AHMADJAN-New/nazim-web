-- ============================================================================
-- Academic Years
-- ============================================================================
-- Academic years define the time periods for academic activities
-- Supports multi-tenancy with organization_id (NULL = global years available to all)
-- Only one current year (is_current = true) per organization
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT false,
    description TEXT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT academic_years_date_range CHECK (end_date > start_date)
);

-- Unique constraint: Only one current year per organization (or globally if organization_id is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_unique_current_per_org 
    ON public.academic_years (organization_id, is_current)
    WHERE deleted_at IS NULL AND is_current = true;

-- Index on organization_id for performance
CREATE INDEX IF NOT EXISTS idx_academic_years_organization_id 
    ON public.academic_years(organization_id);

-- Index on is_current for quick current year lookup
CREATE INDEX IF NOT EXISTS idx_academic_years_is_current 
    ON public.academic_years(is_current)
    WHERE deleted_at IS NULL AND is_current = true;

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS idx_academic_years_status 
    ON public.academic_years(status)
    WHERE deleted_at IS NULL;

-- Index on deleted_at for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_academic_years_deleted_at 
    ON public.academic_years(deleted_at)
    WHERE deleted_at IS NULL;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_academic_years_updated_at
    BEFORE UPDATE ON public.academic_years
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to ensure only one current year per organization
CREATE OR REPLACE FUNCTION public.ensure_single_current_academic_year()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- If setting a year as current, unset all other current years for the same organization
    IF NEW.is_current = true AND (OLD.is_current IS DISTINCT FROM NEW.is_current OR OLD IS NULL) THEN
        UPDATE public.academic_years
        SET is_current = false
        WHERE organization_id IS NOT DISTINCT FROM NEW.organization_id
          AND id != NEW.id
          AND deleted_at IS NULL
          AND is_current = true;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_single_current_academic_year_trigger
    BEFORE INSERT OR UPDATE ON public.academic_years
    FOR EACH ROW
    WHEN (NEW.is_current = true)
    EXECUTE FUNCTION public.ensure_single_current_academic_year();

-- Enable RLS
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.academic_years IS 'Academic years with organization isolation. NULL organization_id = global years available to all organizations. Only one current year per organization.';

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Service role full access
CREATE POLICY "Service role full access to academic_years" 
    ON public.academic_years FOR ALL TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Users can read:
-- 1. Global academic years (organization_id IS NULL)
-- 2. Academic years for their organization
-- 3. Super admin can read all
CREATE POLICY "Users can read academic_years" 
    ON public.academic_years FOR SELECT TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id IS NULL
            OR organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
    );

-- Users can insert academic years for their organization
-- Super admin can insert global years (organization_id = NULL)
CREATE POLICY "Users can insert academic_years" 
    ON public.academic_years FOR INSERT TO authenticated 
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

-- Users can update academic years for their organization
-- Super admin can update all
CREATE POLICY "Users can update academic_years" 
    ON public.academic_years FOR UPDATE TO authenticated 
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

-- Users can delete (soft delete) academic years for their organization
-- Super admin can delete all
CREATE POLICY "Users can delete academic_years" 
    ON public.academic_years FOR DELETE TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
    );

