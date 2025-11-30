-- ============================================================================
-- Teacher Subject Assignments Table
-- ============================================================================
-- This table stores assignments of teachers to subjects for specific classes
-- and academic years, along with the schedule slots they will teach.
-- This is used to prepare data for timetable generation later.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.teacher_subject_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_academic_year_id UUID NOT NULL REFERENCES public.class_academic_years(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    schedule_slot_ids JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of schedule slot UUIDs
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE SET NULL,
    academic_year_id UUID NULL REFERENCES public.academic_years(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_organization_id ON public.teacher_subject_assignments (organization_id);

CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_teacher_id ON public.teacher_subject_assignments (teacher_id);

CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_class_academic_year_id ON public.teacher_subject_assignments (class_academic_year_id);

CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_subject_id ON public.teacher_subject_assignments (subject_id);

CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_school_id ON public.teacher_subject_assignments (school_id);

CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_academic_year_id ON public.teacher_subject_assignments (academic_year_id);

CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_schedule_slot_ids ON public.teacher_subject_assignments USING GIN (schedule_slot_ids);

CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_is_active ON public.teacher_subject_assignments (is_active);

CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_deleted_at ON public.teacher_subject_assignments (deleted_at);

-- Unique constraint: one assignment per teacher, class, and subject combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_subject_assignments_unique ON public.teacher_subject_assignments (
    teacher_id,
    class_academic_year_id,
    subject_id
)
WHERE
    deleted_at IS NULL;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_teacher_class_active ON public.teacher_subject_assignments (
    teacher_id,
    class_academic_year_id,
    is_active
)
WHERE
    deleted_at IS NULL;

-- Trigger to update updated_at column
CREATE TRIGGER update_teacher_subject_assignments_updated_at
    BEFORE UPDATE ON public.teacher_subject_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-set organization_id and academic_year_id
CREATE OR REPLACE FUNCTION public.auto_set_teacher_subject_assignment_org_year()
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
    
    -- If academic_year_id is not set, get it from class_academic_years
    IF NEW.academic_year_id IS NULL THEN
        SELECT academic_year_id INTO NEW.academic_year_id
        FROM public.class_academic_years
        WHERE id = NEW.class_academic_year_id AND deleted_at IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER auto_set_teacher_subject_assignment_org_year_trigger
    BEFORE INSERT OR UPDATE ON public.teacher_subject_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_set_teacher_subject_assignment_org_year();

-- Enable RLS
ALTER TABLE public.teacher_subject_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies for teacher_subject_assignments
-- ============================================================================

-- Service role full access
CREATE POLICY "Service role full access to teacher_subject_assignments" ON public.teacher_subject_assignments FOR ALL TO service_role USING (true)
WITH
    CHECK (true);

-- Users can read teacher subject assignments
CREATE POLICY "Users can read teacher_subject_assignments" ON public.teacher_subject_assignments FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            organization_id = (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            )
            OR organization_id IS NULL
            OR (
                (
                    SELECT organization_id
                    FROM public.profiles
                    WHERE
                        id = auth.uid ()
                ) IS NULL
                AND (
                    SELECT role
                    FROM public.profiles
                    WHERE
                        id = auth.uid ()
                ) = 'super_admin'
            )
        )
    );

-- Users can insert teacher subject assignments in their organization
CREATE POLICY "Users can insert org teacher_subject_assignments" ON public.teacher_subject_assignments FOR
INSERT
    TO authenticated
WITH
    CHECK (
        organization_id = (
            SELECT organization_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
        OR (
            (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) IS NULL
            AND (
                SELECT role
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) = 'super_admin'
        )
    );

-- Users can update teacher subject assignments in their organization
CREATE POLICY "Users can update org teacher_subject_assignments" ON public.teacher_subject_assignments FOR
UPDATE TO authenticated USING (
    deleted_at IS NULL
    AND (
        organization_id = (
            SELECT organization_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
        OR organization_id IS NULL
        OR (
            (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) IS NULL
            AND (
                SELECT role
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) = 'super_admin'
        )
    )
)
WITH
    CHECK (
        (
            organization_id = (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            )
            OR organization_id IS NULL
            OR (
                (
                    SELECT organization_id
                    FROM public.profiles
                    WHERE
                        id = auth.uid ()
                ) IS NULL
                AND (
                    SELECT role
                    FROM public.profiles
                    WHERE
                        id = auth.uid ()
                ) = 'super_admin'
            )
        )
    );

-- Users can delete teacher subject assignments in their organization (hard delete)
CREATE POLICY "Users can delete org teacher_subject_assignments" ON public.teacher_subject_assignments FOR DELETE TO authenticated USING (
    deleted_at IS NULL
    AND (
        organization_id = (
            SELECT organization_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
        OR organization_id IS NULL
        OR (
            (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) IS NULL
            AND (
                SELECT role
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) = 'super_admin'
        )
    )
);

-- ============================================================================
-- Permissions
-- ============================================================================

-- Insert permissions for teacher subject assignments
INSERT INTO
    public.permissions (
        name,
        resource,
        action,
        description,
        organization_id
    )
VALUES (
        'academic.teacher_subject_assignments.read',
        'academic',
        'read',
        'Read teacher subject assignments',
        NULL
    ),
    (
        'academic.teacher_subject_assignments.create',
        'academic',
        'create',
        'Create teacher subject assignments',
        NULL
    ),
    (
        'academic.teacher_subject_assignments.update',
        'academic',
        'update',
        'Update teacher subject assignments',
        NULL
    ),
    (
        'academic.teacher_subject_assignments.delete',
        'academic',
        'delete',
        'Delete teacher subject assignments',
        NULL
    ) ON CONFLICT (name, organization_id) DO NOTHING;

-- Assign permissions to roles (for each organization)
DO $$
DECLARE
    org_record RECORD;
BEGIN
    FOR org_record IN SELECT id FROM public.organizations WHERE deleted_at IS NULL
    LOOP
        -- Admin gets all teacher subject assignment permissions
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        SELECT 'admin', p.id, org_record.id
        FROM public.permissions p
        WHERE p.name LIKE 'academic.teacher_subject_assignments.%'
          AND p.organization_id IS NULL
        ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

        -- Teacher gets read permission
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        SELECT 'teacher', p.id, org_record.id
        FROM public.permissions p
        WHERE p.name = 'academic.teacher_subject_assignments.read'
          AND p.organization_id IS NULL
        ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
    END LOOP;

    -- Super admin gets all global permissions
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'super_admin', id, NULL
    FROM public.permissions
    WHERE name LIKE 'academic.teacher_subject_assignments.%'
      AND organization_id IS NULL
    ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
END $$;

COMMENT ON TABLE public.teacher_subject_assignments IS 'Assigns teachers to subjects for specific classes and academic years, with associated schedule slots. Used for timetable generation.';