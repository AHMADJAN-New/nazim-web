-- ============================================================================
-- Class Subject Templates (Base Subject Assignments to Classes)
-- ============================================================================
-- Links subjects to classes (base assignment)
-- Subjects assigned here appear in all academic years for that class
-- Year-specific customizations (teacher, room, hours) are in class_subjects
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.class_subject_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    class_id UUID NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects (id) ON DELETE CASCADE,
    organization_id UUID NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Unique constraint: one subject per class
CREATE UNIQUE INDEX IF NOT EXISTS idx_class_subject_templates_unique_subject_per_class ON public.class_subject_templates (
    class_id,
    subject_id
)
WHERE
    deleted_at IS NULL;

-- Index on class_id for performance
CREATE INDEX IF NOT EXISTS idx_class_subject_templates_class_id ON public.class_subject_templates (class_id);

-- Index on subject_id for performance
CREATE INDEX IF NOT EXISTS idx_class_subject_templates_subject_id ON public.class_subject_templates (subject_id);

-- Index on organization_id for multi-tenancy
CREATE INDEX IF NOT EXISTS idx_class_subject_templates_organization_id ON public.class_subject_templates (organization_id);

-- Index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_class_subject_templates_is_active ON public.class_subject_templates (is_active)
WHERE
    deleted_at IS NULL;

-- Index on deleted_at for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_class_subject_templates_deleted_at ON public.class_subject_templates (deleted_at)
WHERE
    deleted_at IS NULL;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_class_subject_templates_updated_at
    BEFORE UPDATE ON public.class_subject_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-set organization_id from classes
CREATE OR REPLACE FUNCTION public.auto_set_class_subject_template_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- If organization_id is not set, get it from classes
    IF NEW.organization_id IS NULL THEN
        SELECT organization_id INTO NEW.organization_id
        FROM public.classes
        WHERE id = NEW.class_id AND deleted_at IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER auto_set_class_subject_template_organization_id_trigger
    BEFORE INSERT OR UPDATE ON public.class_subject_templates
    FOR EACH ROW
    WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION public.auto_set_class_subject_template_organization_id();

-- Enable RLS
ALTER TABLE public.class_subject_templates ENABLE ROW LEVEL SECURITY;

COMMENT ON
TABLE public.class_subject_templates IS 'Base subject assignments to classes. Subjects assigned here appear in all academic years for that class. Year-specific customizations are in class_subjects.';

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Service role full access
CREATE POLICY "Service role full access to class_subject_templates" ON public.class_subject_templates FOR ALL TO service_role USING (true)
WITH
    CHECK (true);

-- Users can read class subject templates for their organization
-- Super admin can read all
CREATE POLICY "Users can read class_subject_templates" ON public.class_subject_templates FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id ()
            OR public.get_current_user_organization_id () IS NULL
        )
    );

-- Users can insert class subject templates for their organization
CREATE POLICY "Users can insert class_subject_templates" ON public.class_subject_templates FOR
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

-- Users can update class subject templates for their organization
-- Super admin can update all
CREATE POLICY "Users can update class_subject_templates" ON public.class_subject_templates FOR
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

-- Users can delete (soft delete) class subject templates for their organization
-- Super admin can delete all
CREATE POLICY "Users can delete class_subject_templates" ON public.class_subject_templates FOR DELETE TO authenticated USING (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id ()
        OR public.get_current_user_organization_id () IS NULL
    )
);

