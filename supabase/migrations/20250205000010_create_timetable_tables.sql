-- ============================================================================
-- Timetable Tables
-- ============================================================================
-- Creates:
-- 1) generated_timetables - stores timetable metadata
-- 2) timetable_entries - individual scheduled slots for a timetable
-- 3) teacher_timetable_preferences - teacher free periods (preferences)
--
-- Multi-tenant: organization_id on all tables (NULL allowed for global/super_admin scope)
-- RLS policies follow standard organization isolation pattern
-- ============================================================================

-- ============================================================================
-- Table: generated_timetables
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.generated_timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    academic_year_id UUID NULL REFERENCES public.academic_years(id) ON DELETE SET NULL,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    timetable_type VARCHAR(50) NOT NULL DEFAULT 'teaching', -- e.g., teaching, exam, etc.
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_generated_timetables_org_id ON public.generated_timetables(organization_id);
CREATE INDEX IF NOT EXISTS idx_generated_timetables_academic_year_id ON public.generated_timetables(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_generated_timetables_school_id ON public.generated_timetables(school_id);
CREATE INDEX IF NOT EXISTS idx_generated_timetables_is_active ON public.generated_timetables(is_active)
WHERE deleted_at IS NULL;

-- Trigger: updated_at
CREATE TRIGGER update_generated_timetables_updated_at
    BEFORE UPDATE ON public.generated_timetables
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.generated_timetables ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role full access to generated_timetables"
    ON public.generated_timetables FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Users can read generated_timetables"
    ON public.generated_timetables FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
            OR organization_id IS NULL
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    );

CREATE POLICY "Users can insert generated_timetables"
    ON public.generated_timetables FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR (
            (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
            AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
        )
    );

CREATE POLICY "Users can update generated_timetables"
    ON public.generated_timetables FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
            OR organization_id IS NULL
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    )
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR organization_id IS NULL
        OR (
            (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
            AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
        )
    );

CREATE POLICY "Users can delete generated_timetables"
    ON public.generated_timetables FOR DELETE TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
            OR organization_id IS NULL
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    );

COMMENT ON TABLE public.generated_timetables IS 'Stores timetable metadata for organizations (multi-tenant).';

-- ============================================================================
-- Table: timetable_entries
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.timetable_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    timetable_id UUID NOT NULL REFERENCES public.generated_timetables(id) ON DELETE CASCADE,
    class_academic_year_id UUID NOT NULL REFERENCES public.class_academic_years(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    schedule_slot_id UUID NOT NULL REFERENCES public.schedule_slots(id) ON DELETE CASCADE,
    day_name TEXT NOT NULL, -- 'monday'...'sunday' or 'all_year'
    period_order INTEGER NOT NULL, -- minutes from midnight for ordering
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT timetable_entries_day_name_check CHECK (
        day_name IN (
            'monday','tuesday','wednesday','thursday','friday','saturday','sunday','all_year'
        )
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_timetable_entries_org_id ON public.timetable_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_timetable_id ON public.timetable_entries(timetable_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_cay_id ON public.timetable_entries(class_academic_year_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_subject_id ON public.timetable_entries(subject_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_teacher_id ON public.timetable_entries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_slot_id ON public.timetable_entries(schedule_slot_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_day_name ON public.timetable_entries(day_name);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_period_order ON public.timetable_entries(period_order);

-- Trigger: updated_at
CREATE TRIGGER update_timetable_entries_updated_at
    BEFORE UPDATE ON public.timetable_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role full access to timetable_entries"
    ON public.timetable_entries FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Users can read timetable_entries"
    ON public.timetable_entries FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
            OR organization_id IS NULL
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    );

CREATE POLICY "Users can insert timetable_entries"
    ON public.timetable_entries FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR (
            (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
            AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
        )
    );

CREATE POLICY "Users can update timetable_entries"
    ON public.timetable_entries FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
            OR organization_id IS NULL
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    )
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR organization_id IS NULL
        OR (
            (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
            AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
        )
    );

CREATE POLICY "Users can delete timetable_entries"
    ON public.timetable_entries FOR DELETE TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
            OR organization_id IS NULL
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    );

COMMENT ON TABLE public.timetable_entries IS 'Individual scheduled slots for a generated timetable.';

-- ============================================================================
-- Table: teacher_timetable_preferences
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.teacher_timetable_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    academic_year_id UUID NULL REFERENCES public.academic_years(id) ON DELETE SET NULL,
    teacher_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    schedule_slot_ids JSONB NOT NULL DEFAULT '[]'::jsonb, -- free periods as array of schedule slot UUIDs
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_prefs_org_id ON public.teacher_timetable_preferences(organization_id);
CREATE INDEX IF NOT EXISTS idx_teacher_prefs_teacher_id ON public.teacher_timetable_preferences(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_prefs_academic_year_id ON public.teacher_timetable_preferences(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_teacher_prefs_schedule_slot_ids ON public.teacher_timetable_preferences USING GIN(schedule_slot_ids);

-- Trigger: updated_at
CREATE TRIGGER update_teacher_timetable_preferences_updated_at
    BEFORE UPDATE ON public.teacher_timetable_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.teacher_timetable_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role full access to teacher_prefs"
    ON public.teacher_timetable_preferences FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Users can read teacher_prefs"
    ON public.teacher_timetable_preferences FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
            OR organization_id IS NULL
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    );

CREATE POLICY "Users can insert teacher_prefs"
    ON public.teacher_timetable_preferences FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR (
            (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
            AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
        )
    );

CREATE POLICY "Users can update teacher_prefs"
    ON public.teacher_timetable_preferences FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
            OR organization_id IS NULL
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    )
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR organization_id IS NULL
        OR (
            (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
            AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
        )
    );

CREATE POLICY "Users can delete teacher_prefs"
    ON public.teacher_timetable_preferences FOR DELETE TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
            OR organization_id IS NULL
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    );

COMMENT ON TABLE public.teacher_timetable_preferences IS 'Teachers'' preferred free periods per organization/academic year.';

-- ============================================================================
-- End of migration
-- ============================================================================


