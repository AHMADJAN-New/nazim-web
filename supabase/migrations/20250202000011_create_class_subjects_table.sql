-- ============================================================================
-- Class Subjects (Subject Assignments to Class Instances)
-- ============================================================================
-- Links subjects to class_academic_years with year-specific information
-- Allows different subjects for the same class across different academic years
-- Each subject assignment can have its own teacher and room
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.class_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    class_academic_year_id UUID NOT NULL REFERENCES public.class_academic_years (id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects (id) ON DELETE CASCADE,
    organization_id UUID NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    teacher_id UUID NULL REFERENCES public.profiles (id) ON DELETE SET NULL,
    room_id UUID NULL REFERENCES public.rooms (id) ON DELETE SET NULL,
    weekly_hours DECIMAL(4, 2) NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT class_subjects_weekly_hours_check CHECK (
        weekly_hours IS NULL
        OR weekly_hours >= 0
    )
);

-- Unique constraint: one subject per class_academic_year
CREATE UNIQUE INDEX IF NOT EXISTS idx_class_subjects_unique_subject_per_class ON public.class_subjects (
    class_academic_year_id,
    subject_id
)
WHERE
    deleted_at IS NULL;

-- Index on class_academic_year_id for performance
CREATE INDEX IF NOT EXISTS idx_class_subjects_class_academic_year_id ON public.class_subjects (class_academic_year_id);

-- Index on subject_id for performance
CREATE INDEX IF NOT EXISTS idx_class_subjects_subject_id ON public.class_subjects (subject_id);

-- Index on organization_id for multi-tenancy
CREATE INDEX IF NOT EXISTS idx_class_subjects_organization_id ON public.class_subjects (organization_id);

-- Index on teacher_id for filtering
CREATE INDEX IF NOT EXISTS idx_class_subjects_teacher_id ON public.class_subjects (teacher_id)
WHERE
    deleted_at IS NULL;

-- Index on room_id for filtering
CREATE INDEX IF NOT EXISTS idx_class_subjects_room_id ON public.class_subjects (room_id)
WHERE
    deleted_at IS NULL;

-- Index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_class_subjects_is_active ON public.class_subjects (is_active)
WHERE
    deleted_at IS NULL;

-- Index on deleted_at for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_class_subjects_deleted_at ON public.class_subjects (deleted_at)
WHERE
    deleted_at IS NULL;

-- Composite index for common queries (class_academic_year + active)
CREATE INDEX IF NOT EXISTS idx_class_subjects_class_year_active ON public.class_subjects (
    class_academic_year_id,
    is_active
)
WHERE
    deleted_at IS NULL;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_class_subjects_updated_at
    BEFORE UPDATE ON public.class_subjects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-set organization_id from class_academic_years
CREATE OR REPLACE FUNCTION public.auto_set_class_subject_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- If organization_id is not set, get it from class_academic_years
    IF NEW.organization_id IS NULL THEN
        SELECT organization_id INTO NEW.organization_id
        FROM public.class_academic_years
        WHERE id = NEW.class_academic_year_id AND deleted_at IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER auto_set_class_subject_organization_id_trigger
    BEFORE INSERT OR UPDATE ON public.class_subjects
    FOR EACH ROW
    WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION public.auto_set_class_subject_organization_id();

-- Enable RLS
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;

COMMENT ON
TABLE public.class_subjects IS 'Subject assignments to class instances per academic year. Links subjects to class_academic_years with year-specific data (teacher, room, weekly hours).';

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Service role full access
CREATE POLICY "Service role full access to class_subjects" ON public.class_subjects FOR ALL TO service_role USING (true)
WITH
    CHECK (true);

-- Users can read:
-- 1. Class subject assignments for their organization
-- 2. Super admin can read all
CREATE POLICY "Users can read class_subjects" ON public.class_subjects FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_organization_id () IS NULL
        )
    );

-- Users can insert class subject assignments for their organization
CREATE POLICY "Users can insert class_subjects" ON public.class_subjects FOR
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

-- Users can update class subject assignments for their organization
-- Super admin can update all
CREATE POLICY "Users can update class_subjects" ON public.class_subjects FOR
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

-- Users can delete (soft delete) class subject assignments for their organization
-- Super admin can delete all
CREATE POLICY "Users can delete class_subjects" ON public.class_subjects FOR DELETE TO authenticated USING (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id ()
        OR public.get_current_user_organization_id () IS NULL
    )
);

