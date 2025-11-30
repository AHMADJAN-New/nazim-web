-- =============================================================================
-- Student Documents Table
-- =============================================================================
-- Dedicated table for managing student documents
-- Supports organization and school-based folder structure
-- Multi-tenancy with RLS policies
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.student_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding (id) ON DELETE SET NULL,
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NULL,
    mime_type VARCHAR(100) NULL,
    description TEXT NULL,
    uploaded_by UUID NULL REFERENCES public.profiles (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Index on student_id for performance
CREATE INDEX IF NOT EXISTS idx_student_documents_student_id 
    ON public.student_documents (student_id);

-- Index on organization_id for multi-tenancy
CREATE INDEX IF NOT EXISTS idx_student_documents_organization_id 
    ON public.student_documents (organization_id);

-- Index on school_id for school-based filtering
CREATE INDEX IF NOT EXISTS idx_student_documents_school_id 
    ON public.student_documents (school_id);

-- Index on document_type for filtering
CREATE INDEX IF NOT EXISTS idx_student_documents_document_type 
    ON public.student_documents (document_type)
    WHERE deleted_at IS NULL;

-- Index on deleted_at for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_student_documents_deleted_at 
    ON public.student_documents (deleted_at)
    WHERE deleted_at IS NULL;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_student_documents_updated_at
    BEFORE UPDATE ON public.student_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-set organization_id from student
CREATE OR REPLACE FUNCTION public.auto_set_student_document_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- If organization_id is not set, get it from student
    IF NEW.organization_id IS NULL THEN
        SELECT organization_id INTO NEW.organization_id
        FROM public.students
        WHERE id = NEW.student_id AND deleted_at IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER auto_set_student_document_organization_id_trigger
    BEFORE INSERT OR UPDATE ON public.student_documents
    FOR EACH ROW
    WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION public.auto_set_student_document_organization_id();

-- Enable RLS
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.student_documents IS 'Student documents with organization and school-based folder structure.';

-- =============================================================================
-- Row Level Security Policies
-- =============================================================================

-- Service role full access
CREATE POLICY "Service role full access to student_docs" 
    ON public.student_documents FOR ALL TO service_role 
    USING (true) WITH CHECK (true);

-- Users can read their organization's documents
CREATE POLICY "Users can read student_documents" 
    ON public.student_documents FOR SELECT TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
    );

-- Users can insert documents for their organization
CREATE POLICY "Users can insert student_documents" 
    ON public.student_documents FOR INSERT TO authenticated 
    WITH CHECK (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR (
                public.get_current_user_organization_id() IS NULL
                AND public.get_current_user_role() = 'super_admin'
            )
        )
    );

-- Users can update their organization's documents
CREATE POLICY "Users can update student_documents" 
    ON public.student_documents FOR UPDATE TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
    )
    WITH CHECK (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
    );

-- Users can delete their organization's documents
CREATE POLICY "Users can delete student_documents" 
    ON public.student_documents FOR DELETE TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
    );

