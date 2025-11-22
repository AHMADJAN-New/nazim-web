-- ============================================================================
-- Class Academic Years (Historical Class Instances)
-- ============================================================================
-- Links classes to academic years with year-specific information
-- Supports multiple sections per class per year
-- Tracks historical data (teachers, rooms, capacity, student count)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.class_academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    class_id UUID NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years (id) ON DELETE CASCADE,
    organization_id UUID NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    section_name VARCHAR(50) NULL,
    teacher_id UUID NULL REFERENCES public.profiles (id) ON DELETE SET NULL,
    room_id UUID NULL REFERENCES public.rooms (id) ON DELETE SET NULL,
    capacity INTEGER NULL,
    current_student_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT class_academic_years_capacity_check CHECK (
        capacity IS NULL
        OR capacity > 0
    ),
    CONSTRAINT class_academic_years_student_count_check CHECK (current_student_count >= 0)
);

-- Unique constraint: one section per class per academic year
-- If section_name is NULL, it means the default section (only one allowed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_class_academic_years_unique_section ON public.class_academic_years (
    class_id,
    academic_year_id,
    COALESCE(section_name, '')
)
WHERE
    deleted_at IS NULL;

-- Index on class_id for performance
CREATE INDEX IF NOT EXISTS idx_class_academic_years_class_id ON public.class_academic_years (class_id);

-- Index on academic_year_id for performance
CREATE INDEX IF NOT EXISTS idx_class_academic_years_academic_year_id ON public.class_academic_years (academic_year_id);

-- Index on organization_id for multi-tenancy
CREATE INDEX IF NOT EXISTS idx_class_academic_years_organization_id ON public.class_academic_years (organization_id);

-- Index on teacher_id for filtering
CREATE INDEX IF NOT EXISTS idx_class_academic_years_teacher_id ON public.class_academic_years (teacher_id)
WHERE
    deleted_at IS NULL;

-- Index on room_id for filtering
CREATE INDEX IF NOT EXISTS idx_class_academic_years_room_id ON public.class_academic_years (room_id)
WHERE
    deleted_at IS NULL;

-- Index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_class_academic_years_is_active ON public.class_academic_years (is_active)
WHERE
    deleted_at IS NULL;

-- Index on deleted_at for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_class_academic_years_deleted_at ON public.class_academic_years (deleted_at)
WHERE
    deleted_at IS NULL;

-- Composite index for common queries (class + year + active)
CREATE INDEX IF NOT EXISTS idx_class_academic_years_class_year_active ON public.class_academic_years (
    class_id,
    academic_year_id,
    is_active
)
WHERE
    deleted_at IS NULL;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_class_academic_years_updated_at
    BEFORE UPDATE ON public.class_academic_years
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-set organization_id from class or academic_year
CREATE OR REPLACE FUNCTION public.auto_set_class_academic_year_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- If organization_id is not set, try to get it from class or academic_year
    IF NEW.organization_id IS NULL THEN
        -- Try to get from class first
        SELECT organization_id INTO NEW.organization_id
        FROM public.classes
        WHERE id = NEW.class_id AND deleted_at IS NULL;
        
        -- If still NULL, try to get from academic_year
        IF NEW.organization_id IS NULL THEN
            SELECT organization_id INTO NEW.organization_id
            FROM public.academic_years
            WHERE id = NEW.academic_year_id AND deleted_at IS NULL;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER auto_set_class_academic_year_organization_id_trigger
    BEFORE INSERT OR UPDATE ON public.class_academic_years
    FOR EACH ROW
    WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION public.auto_set_class_academic_year_organization_id();

-- Enable RLS
ALTER TABLE public.class_academic_years ENABLE ROW LEVEL SECURITY;

COMMENT ON
TABLE public.class_academic_years IS 'Historical class instances per academic year. Links classes to academic years with year-specific data (sections, teachers, rooms, capacity).';

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Service role full access
CREATE POLICY "Service role full access to class_academic_years" ON public.class_academic_years FOR ALL TO service_role USING (true)
WITH
    CHECK (true);

-- Users can read:
-- 1. Class instances for their organization
-- 2. Super admin can read all
CREATE POLICY "Users can read class_academic_years" ON public.class_academic_years FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_organization_id () IS NULL
        )
    );

-- Users can insert class instances for their organization
CREATE POLICY "Users can insert class_academic_years" ON public.class_academic_years FOR
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

-- Users can update class instances for their organization
-- Super admin can update all
CREATE POLICY "Users can update class_academic_years" ON public.class_academic_years FOR
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

-- Users can delete (soft delete) class instances for their organization
-- Super admin can delete all
CREATE POLICY "Users can delete class_academic_years" ON public.class_academic_years FOR DELETE TO authenticated USING (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id ()
        OR public.get_current_user_organization_id () IS NULL
    )
);