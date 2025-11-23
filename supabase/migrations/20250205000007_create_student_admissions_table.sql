-- =============================================================================
-- Student Admissions Table and Permissions
-- =============================================================================
-- Tracks admissions from registration into classes with residency, rooming, and
-- academic year context. Supports multi-tenancy, soft deletes, and status stages
-- (pending, admitted, active, inactive, suspended, withdrawn, graduated).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.student_admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding (id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
    academic_year_id UUID NULL REFERENCES public.academic_years (id) ON DELETE SET NULL,
    class_id UUID NULL REFERENCES public.classes (id) ON DELETE SET NULL,
    class_academic_year_id UUID NULL REFERENCES public.class_academic_years (id) ON DELETE SET NULL,
    residency_type_id UUID NULL REFERENCES public.residency_types (id) ON DELETE SET NULL,
    room_id UUID NULL REFERENCES public.rooms (id) ON DELETE SET NULL,
    admission_year VARCHAR(10) NULL,
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    enrollment_status VARCHAR(30) NOT NULL DEFAULT 'admitted'
        CHECK (enrollment_status IN ('pending','admitted','active','inactive','suspended','withdrawn','graduated')),
    enrollment_type VARCHAR(50) NULL,
    shift VARCHAR(50) NULL,
    is_boarder BOOLEAN NOT NULL DEFAULT FALSE,
    fee_status VARCHAR(50) NULL,
    placement_notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Prevent duplicate admissions per student per academic year
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_admissions_unique_year
    ON public.student_admissions (student_id, academic_year_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_student_admissions_org ON public.student_admissions (organization_id);
CREATE INDEX IF NOT EXISTS idx_student_admissions_school ON public.student_admissions (school_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_student_admissions_status ON public.student_admissions (enrollment_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_student_admissions_class ON public.student_admissions (class_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_student_admissions_residency ON public.student_admissions (residency_type_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_student_admissions_room ON public.student_admissions (room_id) WHERE deleted_at IS NULL;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_student_admissions_updated_at
    BEFORE UPDATE ON public.student_admissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Propagate and validate organization + contextual fields
CREATE OR REPLACE FUNCTION public.ensure_student_admission_context()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Default organization from student when missing
    IF NEW.organization_id IS NULL THEN
        SELECT organization_id INTO NEW.organization_id
        FROM public.students
        WHERE id = NEW.student_id;
    END IF;

    -- Default school from student when available
    IF NEW.school_id IS NULL THEN
        SELECT school_id INTO NEW.school_id
        FROM public.students
        WHERE id = NEW.student_id;
    END IF;

    -- Align academic year and class from class_academic_year if provided
    IF NEW.class_academic_year_id IS NOT NULL THEN
        SELECT class_id, academic_year_id, room_id INTO NEW.class_id, NEW.academic_year_id, NEW.room_id
        FROM public.class_academic_years
        WHERE id = NEW.class_academic_year_id AND deleted_at IS NULL;
    END IF;

    -- Enforce organization consistency
    IF EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = NEW.student_id
          AND s.organization_id IS NOT NULL
          AND NEW.organization_id IS NOT NULL
          AND s.organization_id <> NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'Student organization mismatch for admission';
    END IF;

    IF NEW.school_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = NEW.student_id
          AND s.school_id IS NOT NULL
          AND s.school_id <> NEW.school_id
    ) THEN
        RAISE EXCEPTION 'Student school mismatch for admission';
    END IF;

    IF NEW.class_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = NEW.class_id
          AND c.organization_id IS NOT NULL
          AND NEW.organization_id IS NOT NULL
          AND c.organization_id <> NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'Class organization mismatch for admission';
    END IF;

    IF NEW.academic_year_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.academic_years ay
        WHERE ay.id = NEW.academic_year_id
          AND ay.organization_id IS NOT NULL
          AND NEW.organization_id IS NOT NULL
          AND ay.organization_id <> NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'Academic year organization mismatch for admission';
    END IF;

    IF NEW.residency_type_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.residency_types rt
        WHERE rt.id = NEW.residency_type_id
          AND rt.organization_id IS NOT NULL
          AND NEW.organization_id IS NOT NULL
          AND rt.organization_id <> NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'Residency type organization mismatch for admission';
    END IF;

    IF NEW.room_id IS NOT NULL THEN
        PERFORM 1 FROM public.rooms r
        WHERE r.id = NEW.room_id
          AND NEW.school_id IS NOT NULL
          AND r.school_id <> NEW.school_id;

        IF FOUND THEN
            RAISE EXCEPTION 'Room school mismatch for admission';
        END IF;

        IF NEW.school_id IS NULL THEN
            SELECT school_id INTO NEW.school_id FROM public.rooms WHERE id = NEW.room_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_student_admission_context_trigger
    BEFORE INSERT OR UPDATE ON public.student_admissions
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_student_admission_context();

-- Enable RLS
ALTER TABLE public.student_admissions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.student_admissions IS 'Admissions that place registered students into academic years, classes, and residency types.';

-- =============================================================================
-- Row Level Security Policies
-- =============================================================================

-- Service role full access
CREATE POLICY "Service role full access to student_admissions" ON public.student_admissions
    FOR ALL TO service_role
    USING (TRUE) WITH CHECK (TRUE);

-- Authenticated users can read within their org (or all for super admin)
CREATE POLICY "Users can read student_admissions" ON public.student_admissions
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            public.get_current_user_role() = 'super_admin'
            OR (
                organization_id = public.get_current_user_organization_id()
                AND (
                    school_id IS NULL
                    OR public.get_current_user_school_ids() IS NULL
                    OR school_id = ANY(public.get_current_user_school_ids())
                )
            )
        )
    );

-- Authenticated users can insert within their org (super admin anywhere)
CREATE POLICY "Users can insert student_admissions" ON public.student_admissions
    FOR INSERT TO authenticated
    WITH CHECK (
        deleted_at IS NULL
        AND (
            public.get_current_user_role() = 'super_admin'
            OR (
                organization_id = public.get_current_user_organization_id()
                AND (
                    school_id IS NULL
                    OR public.get_current_user_school_ids() IS NULL
                    OR school_id = ANY(public.get_current_user_school_ids())
                )
            )
        )
    );

-- Authenticated users can update within their org (super admin anywhere)
CREATE POLICY "Users can update student_admissions" ON public.student_admissions
    FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            public.get_current_user_role() = 'super_admin'
            OR (
                organization_id = public.get_current_user_organization_id()
                AND (
                    school_id IS NULL
                    OR public.get_current_user_school_ids() IS NULL
                    OR school_id = ANY(public.get_current_user_school_ids())
                )
            )
        )
    )
    WITH CHECK (
        deleted_at IS NULL
        AND (
            public.get_current_user_role() = 'super_admin'
            OR (
                organization_id = public.get_current_user_organization_id()
                AND (
                    school_id IS NULL
                    OR public.get_current_user_school_ids() IS NULL
                    OR school_id = ANY(public.get_current_user_school_ids())
                )
            )
        )
    );

-- Authenticated users can delete (soft-delete) within their org (super admin anywhere)
CREATE POLICY "Users can delete student_admissions" ON public.student_admissions
    FOR DELETE TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            public.get_current_user_role() = 'super_admin'
            OR (
                organization_id = public.get_current_user_organization_id()
                AND (
                    school_id IS NULL
                    OR public.get_current_user_school_ids() IS NULL
                    OR school_id = ANY(public.get_current_user_school_ids())
                )
            )
        )
    );

-- =============================================================================
-- Permissions for Student Admissions
-- =============================================================================

INSERT INTO public.permissions (name, resource, action, description, organization_id)
VALUES
    ('student_admissions.read', 'student_admissions', 'read', 'View student admissions', NULL),
    ('student_admissions.create', 'student_admissions', 'create', 'Create student admissions', NULL),
    ('student_admissions.update', 'student_admissions', 'update', 'Update student admissions', NULL),
    ('student_admissions.delete', 'student_admissions', 'delete', 'Delete student admissions', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Give super_admin global access
INSERT INTO public.role_permissions (role, permission_id, organization_id)
SELECT 'super_admin', id, NULL
FROM public.permissions
WHERE name LIKE 'student_admissions.%' AND organization_id IS NULL
ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

-- Update default role assignments to include student admissions
CREATE OR REPLACE FUNCTION public.assign_default_role_permissions(target_org UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Super admin role permissions scoped to organization (read-only mirror)
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'super_admin', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
    ON CONFLICT DO NOTHING;

    -- Admin: full control except destructive org-level settings
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'admin', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'users.read','users.create','users.update','users.delete',
        'buildings.read','buildings.create','buildings.update','buildings.delete',
        'rooms.read','rooms.create','rooms.update','rooms.delete',
        'profiles.read','profiles.update',
        'branding.read','branding.create','branding.update','branding.delete',
        'reports.read','reports.export',
        'auth_monitoring.read','security_monitoring.read',
        'permissions.read','permissions.update',
        'backup.read',
        'academic.residency_types.read','academic.residency_types.create',
        'academic.residency_types.update','academic.residency_types.delete',
        'academic.academic_years.read','academic.academic_years.create',
        'academic.academic_years.update','academic.academic_years.delete',
        'academic.classes.read','academic.classes.create',
        'academic.classes.update','academic.classes.delete',
        'academic.classes.assign','academic.classes.copy',
        'academic.subjects.read','academic.subjects.create',
        'academic.subjects.update','academic.subjects.delete',
        'academic.subjects.assign','academic.subjects.copy',
        'students.read','students.create','students.update','students.delete',
        'students.manage_documents',
        'student_admissions.read','student_admissions.create','student_admissions.update','student_admissions.delete'
      )
    ON CONFLICT DO NOTHING;

    -- Teacher-like roles get read-only access plus settings visibility
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT role_name, p.id, target_org
    FROM public.permissions p
    CROSS JOIN (VALUES
        ('teacher'),('staff'),('accountant'),('librarian'),
        ('parent'),('student'),('hostel_manager'),('asset_manager')
    ) AS roles(role_name)
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'buildings.read','rooms.read','profiles.read','reports.read',
        'academic.residency_types.read',
        'academic.academic_years.read',
        'academic.classes.read',
        'academic.subjects.read',
        'students.read',
        'student_admissions.read'
      )
    ON CONFLICT DO NOTHING;
END;
$$;

-- Assign new permissions to existing organizations
DO $$
DECLARE
    org_record RECORD;
BEGIN
    FOR org_record IN SELECT id FROM public.organizations WHERE deleted_at IS NULL LOOP
        -- Admin permissions
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        SELECT 'admin', p.id, org_record.id
        FROM public.permissions p
        WHERE p.organization_id IS NULL
          AND p.name IN ('student_admissions.read','student_admissions.create','student_admissions.update','student_admissions.delete')
        ON CONFLICT DO NOTHING;

        -- Read permissions for teacher-like roles
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        SELECT role_name, p.id, org_record.id
        FROM public.permissions p
        CROSS JOIN (VALUES
            ('teacher'),('staff'),('accountant'),('librarian'),
            ('parent'),('student'),('hostel_manager'),('asset_manager')
        ) AS roles(role_name)
        WHERE p.organization_id IS NULL
          AND p.name = 'student_admissions.read'
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$;
