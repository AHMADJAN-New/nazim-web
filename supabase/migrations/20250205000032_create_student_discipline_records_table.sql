-- =============================================================================
-- Student Discipline Records Table
-- =============================================================================
-- Tracks disciplinary incidents and actions for students
-- Supports organization and school-based structure
-- Multi-tenancy with RLS policies
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.student_discipline_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding (id) ON DELETE SET NULL,
    incident_date DATE NOT NULL,
    incident_type VARCHAR(100) NOT NULL,
    description TEXT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'minor' 
        CHECK (severity IN ('minor', 'moderate', 'major', 'severe')),
    action_taken TEXT NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_date DATE NULL,
    resolved_by UUID NULL REFERENCES public.profiles (id) ON DELETE SET NULL,
    created_by UUID NULL REFERENCES public.profiles (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Index on student_id for performance
CREATE INDEX IF NOT EXISTS idx_student_discipline_student_id 
    ON public.student_discipline_records (student_id);

-- Index on organization_id for multi-tenancy
CREATE INDEX IF NOT EXISTS idx_student_discipline_organization_id 
    ON public.student_discipline_records (organization_id);

-- Index on school_id for school-based filtering
CREATE INDEX IF NOT EXISTS idx_student_discipline_school_id 
    ON public.student_discipline_records (school_id);

-- Index on incident_date for filtering
CREATE INDEX IF NOT EXISTS idx_student_discipline_incident_date 
    ON public.student_discipline_records (incident_date)
    WHERE deleted_at IS NULL;

-- Index on severity for filtering
CREATE INDEX IF NOT EXISTS idx_student_discipline_severity 
    ON public.student_discipline_records (severity)
    WHERE deleted_at IS NULL;

-- Index on resolved status for filtering
CREATE INDEX IF NOT EXISTS idx_student_discipline_resolved 
    ON public.student_discipline_records (resolved)
    WHERE deleted_at IS NULL;

-- Index on deleted_at for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_student_discipline_deleted_at 
    ON public.student_discipline_records (deleted_at)
    WHERE deleted_at IS NULL;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_student_discipline_updated_at
    BEFORE UPDATE ON public.student_discipline_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-set organization_id from student
CREATE OR REPLACE FUNCTION public.auto_set_student_discipline_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- If organization_id is not set, get it from student
    IF NEW.organization_id IS NULL THEN
        SELECT organization_id INTO NEW.organization_id
        FROM public.students
        WHERE id = NEW.student_id AND deleted_at IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER auto_set_student_discipline_org_id_trigger
    BEFORE INSERT OR UPDATE ON public.student_discipline_records
    FOR EACH ROW
    WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION public.auto_set_student_discipline_organization_id();

-- Enable RLS
ALTER TABLE public.student_discipline_records ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.student_discipline_records IS 'Student discipline records tracking incidents and actions.';

-- =============================================================================
-- Row Level Security Policies
-- =============================================================================

-- Service role full access
CREATE POLICY "Service role full access to student_discipline" 
    ON public.student_discipline_records FOR ALL TO service_role 
    USING (true) WITH CHECK (true);

-- Users can read their organization's records
CREATE POLICY "Users can read student_discipline" 
    ON public.student_discipline_records FOR SELECT TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
    );

-- Users can insert records for their organization
CREATE POLICY "Users can insert student_discipline" 
    ON public.student_discipline_records FOR INSERT TO authenticated 
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

-- Users can update their organization's records
CREATE POLICY "Users can update student_discipline" 
    ON public.student_discipline_records FOR UPDATE TO authenticated 
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

-- Users can delete their organization's records
CREATE POLICY "Users can delete student_discipline" 
    ON public.student_discipline_records FOR DELETE TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
    );

