-- ============================================================================
-- Update Class Subjects to Reference Templates
-- ============================================================================
-- Add class_subject_template_id to class_subjects
-- This links year-specific customizations to base class-subject assignments
-- ============================================================================

-- Add class_subject_template_id column (nullable for backward compatibility)
ALTER TABLE public.class_subjects
    ADD COLUMN IF NOT EXISTS class_subject_template_id UUID NULL REFERENCES public.class_subject_templates (id) ON DELETE CASCADE;

-- Create index on class_subject_template_id
CREATE INDEX IF NOT EXISTS idx_class_subjects_template_id ON public.class_subjects (class_subject_template_id)
WHERE
    deleted_at IS NULL;

-- Update comment to reflect new structure
COMMENT ON
TABLE public.class_subjects IS 'Year-specific subject customizations for class instances. Links to class_subject_templates for base assignment, and class_academic_years for year-specific data (teacher, room, weekly hours).';

