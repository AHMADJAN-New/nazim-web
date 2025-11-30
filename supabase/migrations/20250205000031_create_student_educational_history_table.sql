-- =============================================================================
-- Student Educational History Table
-- =============================================================================
-- Tracks students' previous academic records and educational background
-- Supports organization and school-based structure
-- Multi-tenancy with RLS policies
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.student_educational_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding (id) ON DELETE SET NULL,
    institution_name VARCHAR(255) NOT NULL,
    academic_year VARCHAR(20) NULL,
    grade_level VARCHAR(50) NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    achievements TEXT NULL,
    notes TEXT NULL,
    created_by UUID NULL REFERENCES public.profiles (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Index on student_id for performance
CREATE INDEX IF NOT EXISTS idx_student_edu_history_student_id 
    ON public.student_educational_history (student_id);

-- Index on organization_id for multi-tenancy
CREATE INDEX IF NOT EXISTS idx_student_edu_history_organization_id 
    ON public.student_educational_history (organization_id);

-- Index on school_id for school-based filtering
CREATE INDEX IF NOT EXISTS idx_student_edu_history_school_id 
    ON public.student_educational_history (school_id);

-- Index on deleted_at for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_student_edu_history_deleted_at 
    ON public.student_educational_history (deleted_at)
    WHERE deleted_at IS NULL;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_student_edu_history_updated_at
    BEFORE UPDATE ON public.student_educational_history
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-set organization_id from student
CREATE OR REPLACE FUNCTION public.auto_set_student_edu_history_organization_id()
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

CREATE TRIGGER auto_set_student_edu_history_org_id_trigger
    BEFORE INSERT OR UPDATE ON public.student_educational_history
    FOR EACH ROW
    WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION public.auto_set_student_edu_history_organization_id();

-- Enable RLS
ALTER TABLE public.student_educational_history ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.student_educational_history IS 'Student educational history tracking previous academic records.';

-- =============================================================================
-- Row Level Security Policies
-- =============================================================================

-- Service role full access
CREATE POLICY "Service role full access to student_edu_hist" 
    ON public.student_educational_history FOR ALL TO service_role 
    USING (true) WITH CHECK (true);

-- Users can read their organization's history
CREATE POLICY "Users can read student_edu_history" 
    ON public.student_educational_history FOR SELECT TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
    );

-- Users can insert history for their organization
CREATE POLICY "Users can insert student_edu_history" 
    ON public.student_educational_history FOR INSERT TO authenticated 
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

-- Users can update their organization's history
CREATE POLICY "Users can update student_edu_history" 
    ON public.student_educational_history FOR UPDATE TO authenticated 
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

-- Users can delete their organization's history
CREATE POLICY "Users can delete student_edu_history" 
    ON public.student_educational_history FOR DELETE TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
    );

