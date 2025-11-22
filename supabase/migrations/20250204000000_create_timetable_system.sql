-- ============================================================================
-- Teaching periods, preferences, and timetable entries
-- ============================================================================
SET statement_timeout = 0;
SET lock_timeout = 0;

-- Teaching periods master table
CREATE TABLE IF NOT EXISTS public.teaching_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (end_time > start_time),
    sort_order INTEGER NOT NULL DEFAULT 1,
    is_break BOOLEAN NOT NULL DEFAULT FALSE,
    max_parallel_classes INTEGER NOT NULL DEFAULT 1 CHECK (max_parallel_classes >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT teaching_periods_unique_slot UNIQUE (organization_id, day_of_week, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_teaching_periods_org ON public.teaching_periods (organization_id);
CREATE INDEX IF NOT EXISTS idx_teaching_periods_day ON public.teaching_periods (day_of_week);

CREATE TRIGGER update_teaching_periods_updated_at
    BEFORE UPDATE ON public.teaching_periods
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.teaching_periods ENABLE ROW LEVEL SECURITY;

-- Teacher period preferences table
CREATE TABLE IF NOT EXISTS public.teacher_period_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    teacher_staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.teaching_periods(id) ON DELETE CASCADE,
    preference VARCHAR(15) NOT NULL CHECK (preference IN ('preferred','available','unavailable')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT teacher_period_pref_unique UNIQUE (teacher_staff_id, period_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_period_pref_org ON public.teacher_period_preferences (organization_id);
CREATE INDEX IF NOT EXISTS idx_teacher_period_pref_teacher ON public.teacher_period_preferences (teacher_staff_id);

CREATE TRIGGER update_teacher_period_pref_updated_at
    BEFORE UPDATE ON public.teacher_period_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.teacher_period_preferences ENABLE ROW LEVEL SECURITY;

-- Timetable entries table
CREATE TABLE IF NOT EXISTS public.timetable_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.teaching_periods(id) ON DELETE CASCADE,
    day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (end_time > start_time),
    status VARCHAR(15) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','locked')),
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    CONSTRAINT timetable_unique_class_slot UNIQUE (organization_id, class_id, day_of_week, period_id),
    CONSTRAINT timetable_unique_teacher_slot UNIQUE (organization_id, teacher_staff_id, day_of_week, period_id)
);

CREATE INDEX IF NOT EXISTS idx_timetable_entries_org ON public.timetable_entries (organization_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_teacher ON public.timetable_entries (teacher_staff_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_class ON public.timetable_entries (class_id);

CREATE TRIGGER update_timetable_entries_updated_at
    BEFORE UPDATE ON public.timetable_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

-- Extend class_subjects with sessions per week metadata
ALTER TABLE public.class_subjects
    ADD COLUMN IF NOT EXISTS sessions_per_week SMALLINT NOT NULL DEFAULT 1 CHECK (sessions_per_week BETWEEN 1 AND 14);

-- ============================================================================
-- RLS policies
-- ============================================================================
-- teaching_periods
CREATE POLICY "Periods service role all" ON public.teaching_periods
    FOR ALL TO service_role
    USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Periods read org" ON public.teaching_periods
    FOR SELECT TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

CREATE POLICY "Periods insert org" ON public.teaching_periods
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

CREATE POLICY "Periods update org" ON public.teaching_periods
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    )
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

CREATE POLICY "Periods delete org" ON public.teaching_periods
    FOR DELETE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

-- teacher_period_preferences
CREATE POLICY "Period prefs service role all" ON public.teacher_period_preferences
    FOR ALL TO service_role
    USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Period prefs read org" ON public.teacher_period_preferences
    FOR SELECT TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

CREATE POLICY "Period prefs insert org" ON public.teacher_period_preferences
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

CREATE POLICY "Period prefs update org" ON public.teacher_period_preferences
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    )
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

CREATE POLICY "Period prefs delete org" ON public.teacher_period_preferences
    FOR DELETE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

-- timetable_entries
CREATE POLICY "Timetable service role all" ON public.timetable_entries
    FOR ALL TO service_role
    USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Timetable read org" ON public.timetable_entries
    FOR SELECT TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

CREATE POLICY "Timetable insert org" ON public.timetable_entries
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

CREATE POLICY "Timetable update org" ON public.timetable_entries
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    )
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

CREATE POLICY "Timetable delete org" ON public.timetable_entries
    FOR DELETE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    );

-- ============================================================================
-- Permissions
-- ============================================================================
INSERT INTO public.permissions (name, resource, action, description, organization_id)
VALUES
    ('academic.periods.read', 'teaching_periods', 'read', 'View teaching periods', NULL),
    ('academic.periods.create', 'teaching_periods', 'create', 'Create teaching periods', NULL),
    ('academic.periods.update', 'teaching_periods', 'update', 'Update teaching periods', NULL),
    ('academic.periods.delete', 'teaching_periods', 'delete', 'Delete teaching periods', NULL),
    ('academic.timetables.read', 'timetable_entries', 'read', 'View timetable', NULL),
    ('academic.timetables.create', 'timetable_entries', 'create', 'Create timetable entries', NULL),
    ('academic.timetables.update', 'timetable_entries', 'update', 'Update timetable entries', NULL),
    ('academic.timetables.delete', 'timetable_entries', 'delete', 'Delete timetable entries', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- ============================================================================
-- Update default role permission helper to include timetable permissions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.assign_default_role_permissions(target_org UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'super_admin', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
    ON CONFLICT DO NOTHING;

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
        'academic.periods.read','academic.periods.create','academic.periods.update','academic.periods.delete',
        'academic.timetables.read','academic.timetables.create','academic.timetables.update','academic.timetables.delete',
        'academic.residency_types.read','academic.residency_types.create','academic.residency_types.update','academic.residency_types.delete'
      )
    ON CONFLICT DO NOTHING;

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
        'academic.classes.read','academic.subjects.read','academic.assignments.read',
        'academic.periods.read','academic.timetables.read','academic.residency_types.read'
      )
    ON CONFLICT DO NOTHING;
END;
$$;
