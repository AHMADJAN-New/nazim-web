-- =============================================================================
-- Student profile enhancements: documents, previous studies, and behavior logs
-- =============================================================================
-- Adds supporting tables to capture student documents, prior education history,
-- and behavior notes with multi-tenant RLS aligned to existing student records.
-- =============================================================================

-- Student documents table
CREATE TABLE IF NOT EXISTS public.student_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE SET NULL,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NULL,
    mime_type VARCHAR(150) NULL,
    description TEXT NULL,
    uploaded_by UUID NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_documents_student ON public.student_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_org ON public.student_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_type ON public.student_documents(document_type);

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to student_documents" ON public.student_documents
    FOR ALL TO service_role
    USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Users can read student_documents" ON public.student_documents
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() = 'super_admin'
        OR (
            organization_id = public.get_current_user_organization_id()
            AND (
                school_id IS NULL
                OR public.get_current_user_school_ids() IS NULL
                OR school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can insert student_documents" ON public.student_documents
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() = 'super_admin'
        OR (
            organization_id = public.get_current_user_organization_id()
            AND (
                school_id IS NULL
                OR public.get_current_user_school_ids() IS NULL
                OR school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

-- Previous studies table
CREATE TABLE IF NOT EXISTS public.student_previous_studies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE SET NULL,
    institution_name VARCHAR(200) NOT NULL,
    level VARCHAR(100) NULL,
    start_year VARCHAR(10) NULL,
    end_year VARCHAR(10) NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_previous_studies_student ON public.student_previous_studies(student_id);
CREATE INDEX IF NOT EXISTS idx_student_previous_studies_org ON public.student_previous_studies(organization_id);

ALTER TABLE public.student_previous_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to student_previous_studies" ON public.student_previous_studies
    FOR ALL TO service_role
    USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Users can read student_previous_studies" ON public.student_previous_studies
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() = 'super_admin'
        OR (
            organization_id = public.get_current_user_organization_id()
            AND (
                school_id IS NULL
                OR public.get_current_user_school_ids() IS NULL
                OR school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can insert student_previous_studies" ON public.student_previous_studies
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() = 'super_admin'
        OR (
            organization_id = public.get_current_user_organization_id()
            AND (
                school_id IS NULL
                OR public.get_current_user_school_ids() IS NULL
                OR school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

-- Student behavior table
CREATE TABLE IF NOT EXISTS public.student_behaviors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE SET NULL,
    behavior_type VARCHAR(20) NOT NULL CHECK (behavior_type IN ('positive', 'negative')),
    severity VARCHAR(20) NULL CHECK (severity IN ('low', 'medium', 'high')),
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    reported_by UUID NULL REFERENCES auth.users(id),
    occurred_on DATE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_behaviors_student ON public.student_behaviors(student_id);
CREATE INDEX IF NOT EXISTS idx_student_behaviors_org ON public.student_behaviors(organization_id);
CREATE INDEX IF NOT EXISTS idx_student_behaviors_type ON public.student_behaviors(behavior_type);

ALTER TABLE public.student_behaviors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to student_behaviors" ON public.student_behaviors
    FOR ALL TO service_role
    USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Users can read student_behaviors" ON public.student_behaviors
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() = 'super_admin'
        OR (
            organization_id = public.get_current_user_organization_id()
            AND (
                school_id IS NULL
                OR public.get_current_user_school_ids() IS NULL
                OR school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can insert student_behaviors" ON public.student_behaviors
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() = 'super_admin'
        OR (
            organization_id = public.get_current_user_organization_id()
            AND (
                school_id IS NULL
                OR public.get_current_user_school_ids() IS NULL
                OR school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );
