-- ============================================================================
-- Schedule Slots Table
-- ============================================================================
-- This table defines time ranges for scheduling classes and subjects.
-- Supports multiple days of the week, academic year specificity, and school-level customization.

CREATE TABLE IF NOT EXISTS public.schedule_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    days_of_week JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of day names: ['monday', 'tuesday', ...]
    default_duration_minutes INTEGER NOT NULL DEFAULT 45,
    academic_year_id UUID NULL REFERENCES public.academic_years(id) ON DELETE SET NULL,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE SET NULL,
    sort_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedule_slots_organization_id ON public.schedule_slots(organization_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_academic_year_id ON public.schedule_slots(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_school_id ON public.schedule_slots(school_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_days_of_week ON public.schedule_slots USING GIN(days_of_week);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_sort_order ON public.schedule_slots(sort_order);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_is_active ON public.schedule_slots(is_active);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_deleted_at ON public.schedule_slots(deleted_at);

-- Unique constraint: code must be unique per organization, academic year, and school (where not deleted)
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_slots_unique_code 
    ON public.schedule_slots(code, organization_id, academic_year_id, school_id) 
    WHERE deleted_at IS NULL;

-- Trigger to update updated_at column
CREATE TRIGGER update_schedule_slots_updated_at
    BEFORE UPDATE ON public.schedule_slots
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.schedule_slots ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies for schedule_slots
-- ============================================================================

-- Service role full access
CREATE POLICY "Service role full access to schedule_slots"
    ON public.schedule_slots FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Users can read schedule slots
CREATE POLICY "Users can read schedule_slots"
    ON public.schedule_slots FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            organization_id = (
                SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            )
            OR organization_id IS NULL
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    );

-- Users can insert schedule slots in their organization
CREATE POLICY "Users can insert schedule_slots in their organization"
    ON public.schedule_slots FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
        OR (
            (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
            AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
        )
    );

-- Users can update schedule slots in their organization
CREATE POLICY "Users can update schedule_slots in their organization"
    ON public.schedule_slots FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            organization_id = (
                SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            )
            OR organization_id IS NULL
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    )
    WITH CHECK (
        -- Allow updates where organization_id matches user's org, is NULL (global), or user is super_admin
        -- Since we preserve organization_id in soft deletes, this check ensures the updated row
        -- still belongs to the user's organization (or is global/super_admin accessible)
        (
            organization_id = (
                SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            )
            OR organization_id IS NULL
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    );

-- Users can delete schedule slots in their organization (hard delete)
CREATE POLICY "Users can delete schedule_slots in their organization"
    ON public.schedule_slots FOR DELETE TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            organization_id = (
                SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            )
            OR organization_id IS NULL
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    );

-- ============================================================================
-- Permissions
-- ============================================================================

-- Insert permissions for schedule slots
INSERT INTO public.permissions (name, resource, action, description, organization_id)
VALUES
    ('academic.schedule_slots.read', 'academic', 'read', 'Read schedule slots', NULL),
    ('academic.schedule_slots.create', 'academic', 'create', 'Create schedule slots', NULL),
    ('academic.schedule_slots.update', 'academic', 'update', 'Update schedule slots', NULL),
    ('academic.schedule_slots.delete', 'academic', 'delete', 'Delete schedule slots', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Assign permissions to roles (for each organization)
DO $$
DECLARE
    org_record RECORD;
BEGIN
    FOR org_record IN SELECT id FROM public.organizations WHERE deleted_at IS NULL
    LOOP
        -- Admin gets all schedule slots permissions
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        SELECT 'admin', p.id, org_record.id
        FROM public.permissions p
        WHERE p.name LIKE 'academic.schedule_slots.%'
          AND p.organization_id IS NULL
        ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

        -- Teacher gets read permission
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        SELECT 'teacher', p.id, org_record.id
        FROM public.permissions p
        WHERE p.name = 'academic.schedule_slots.read'
          AND p.organization_id IS NULL
        ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
    END LOOP;

    -- Super admin gets all global permissions
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'super_admin', id, NULL
    FROM public.permissions
    WHERE name LIKE 'academic.schedule_slots.%'
      AND organization_id IS NULL
    ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
END $$;

COMMENT ON TABLE public.schedule_slots IS 'Time ranges for scheduling classes and subjects. Supports multiple days, academic year specificity, and school-level customization.';

