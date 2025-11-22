-- ============================================================================
-- Academic Structures: classes, subjects, and subject assignments
-- ============================================================================
SET statement_timeout = 0;
SET lock_timeout = 0;

-- ============================================================================
-- Classes table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    grade_level VARCHAR(50),
    section VARCHAR(50),
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    homeroom_teacher_id UUID NULL REFERENCES public.staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT classes_unique_code_org UNIQUE (organization_id, code),
    CONSTRAINT classes_status_valid CHECK (status IN ('active','inactive','archived'))
);

CREATE INDEX IF NOT EXISTS idx_classes_org_id ON public.classes (organization_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON public.classes (school_id);
CREATE INDEX IF NOT EXISTS idx_classes_status ON public.classes (status);
CREATE INDEX IF NOT EXISTS idx_classes_deleted_at ON public.classes (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_classes_homeroom_teacher ON public.classes (homeroom_teacher_id);

CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON public.classes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Subjects table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    grade_level VARCHAR(50),
    credit_hours NUMERIC(4,2),
    is_core BOOLEAN NOT NULL DEFAULT TRUE,
    color VARCHAR(7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT subjects_unique_code_org UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_subjects_org_id ON public.subjects (organization_id);
CREATE INDEX IF NOT EXISTS idx_subjects_grade_level ON public.subjects (grade_level);
CREATE INDEX IF NOT EXISTS idx_subjects_deleted_at ON public.subjects (deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON public.subjects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Class subject assignments (subject -> class -> teacher)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.class_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
    room_id UUID NULL REFERENCES public.rooms(id) ON DELETE SET NULL,
    schedule_slot VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT class_subject_unique UNIQUE (class_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_class_subjects_org_id ON public.class_subjects (organization_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_class_id ON public.class_subjects (class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_subject_id ON public.class_subjects (subject_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_teacher_id ON public.class_subjects (teacher_staff_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_deleted_at ON public.class_subjects (deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER update_class_subjects_updated_at
    BEFORE UPDATE ON public.class_subjects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper function: enforce organization consistency across assignments
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ensure_class_subject_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    class_org UUID;
    subject_org UUID;
    teacher_org UUID;
BEGIN
    SELECT organization_id INTO class_org FROM public.classes WHERE id = NEW.class_id;
    IF class_org IS NULL THEN
        RAISE EXCEPTION 'Class not found for assignment';
    END IF;
    IF class_org <> NEW.organization_id THEN
        RAISE EXCEPTION 'Class belongs to a different organization';
    END IF;

    SELECT organization_id INTO subject_org FROM public.subjects WHERE id = NEW.subject_id;
    IF subject_org IS NULL THEN
        RAISE EXCEPTION 'Subject not found for assignment';
    END IF;
    IF subject_org <> NEW.organization_id THEN
        RAISE EXCEPTION 'Subject belongs to a different organization';
    END IF;

    SELECT organization_id INTO teacher_org FROM public.staff WHERE id = NEW.teacher_staff_id;
    IF teacher_org IS NULL THEN
        RAISE EXCEPTION 'Teacher not found for assignment';
    END IF;
    IF teacher_org <> NEW.organization_id THEN
        RAISE EXCEPTION 'Teacher belongs to a different organization';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_class_subject_org_trigger
    BEFORE INSERT OR UPDATE ON public.class_subjects
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_class_subject_org();

-- ============================================================================
-- Row Level Security policies
-- ============================================================================
-- Classes
CREATE POLICY "Classes service role all" ON public.classes
    FOR ALL TO service_role
    USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Classes read org" ON public.classes
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_role() = 'super_admin'
        )
    );

CREATE POLICY "Classes insert org" ON public.classes
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

CREATE POLICY "Classes update org" ON public.classes
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    )
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

CREATE POLICY "Classes delete org" ON public.classes
    FOR DELETE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

-- Subjects
CREATE POLICY "Subjects service role all" ON public.subjects
    FOR ALL TO service_role
    USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Subjects read org" ON public.subjects
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_role() = 'super_admin'
        )
    );

CREATE POLICY "Subjects insert org" ON public.subjects
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

CREATE POLICY "Subjects update org" ON public.subjects
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    )
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

CREATE POLICY "Subjects delete org" ON public.subjects
    FOR DELETE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

-- Class subjects
CREATE POLICY "Class subj service role all" ON public.class_subjects
    FOR ALL TO service_role
    USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Class subj read org" ON public.class_subjects
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_role() = 'super_admin'
        )
    );

CREATE POLICY "Class subj insert org" ON public.class_subjects
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

CREATE POLICY "Class subj update org" ON public.class_subjects
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    )
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

CREATE POLICY "Class subj delete org" ON public.class_subjects
    FOR DELETE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

-- ============================================================================
-- Permission catalog updates for academics
-- ============================================================================
INSERT INTO public.permissions (name, resource, action, description, organization_id)
VALUES
    ('academic.classes.read', 'classes', 'read', 'View classes list', NULL),
    ('academic.classes.create', 'classes', 'create', 'Create classes', NULL),
    ('academic.classes.update', 'classes', 'update', 'Update classes', NULL),
    ('academic.classes.delete', 'classes', 'delete', 'Delete classes', NULL),
    ('academic.subjects.read', 'subjects', 'read', 'View subjects list', NULL),
    ('academic.subjects.create', 'subjects', 'create', 'Create subjects', NULL),
    ('academic.subjects.update', 'subjects', 'update', 'Update subjects', NULL),
    ('academic.subjects.delete', 'subjects', 'delete', 'Delete subjects', NULL),
    ('academic.assignments.read', 'class_subjects', 'read', 'View subject assignments', NULL),
    ('academic.assignments.create', 'class_subjects', 'create', 'Assign subjects to teachers', NULL),
    ('academic.assignments.update', 'class_subjects', 'update', 'Update subject assignments', NULL),
    ('academic.assignments.delete', 'class_subjects', 'delete', 'Remove subject assignments', NULL),
    ('academic.residency_types.read', 'residency_types', 'read', 'View residency types', NULL),
    ('academic.residency_types.create', 'residency_types', 'create', 'Create residency types', NULL),
    ('academic.residency_types.update', 'residency_types', 'update', 'Update residency types', NULL),
    ('academic.residency_types.delete', 'residency_types', 'delete', 'Delete residency types', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- ============================================================================
-- Update default role permission assignment helper
-- ============================================================================
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

    -- Admin: full control of core + academic modules
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
        'academic.classes.read','academic.classes.create','academic.classes.update','academic.classes.delete',
        'academic.subjects.read','academic.subjects.create','academic.subjects.update','academic.subjects.delete',
        'academic.assignments.read','academic.assignments.create','academic.assignments.update','academic.assignments.delete',
        'academic.residency_types.read','academic.residency_types.create','academic.residency_types.update','academic.residency_types.delete'
      )
    ON CONFLICT DO NOTHING;

    -- Teacher-like roles get read-only academics visibility
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
        'academic.classes.read','academic.subjects.read','academic.assignments.read','academic.residency_types.read'
      )
    ON CONFLICT DO NOTHING;
END;
$$;
