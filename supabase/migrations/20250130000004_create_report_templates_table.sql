-- Create report_templates table for multi-tenant SaaS report templates
CREATE TABLE IF NOT EXISTS public.report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.school_branding(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(100) NOT NULL,
    header_text TEXT,
    footer_text TEXT,
    header_html TEXT,
    footer_html TEXT,
    report_logo_selection VARCHAR(50),
    show_page_numbers BOOLEAN DEFAULT true,
    show_generation_date BOOLEAN DEFAULT true,
    table_alternating_colors BOOLEAN DEFAULT true,
    report_font_size VARCHAR(10),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    -- Ensure unique template name per school
    CONSTRAINT unique_template_name_per_school UNIQUE (school_id, template_name, deleted_at)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_report_templates_organization_id ON public.report_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_school_id ON public.report_templates(school_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_template_type ON public.report_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_report_templates_is_active ON public.report_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_report_templates_is_default ON public.report_templates(is_default);
CREATE INDEX IF NOT EXISTS idx_report_templates_deleted_at ON public.report_templates(deleted_at) WHERE deleted_at IS NULL;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_report_templates_updated_at
    BEFORE UPDATE ON public.report_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role full access
CREATE POLICY "Service role full access to report_templates"
    ON public.report_templates FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Policy 2: Users can read templates for their organization
CREATE POLICY "Users can read their organization's report_templates"
    ON public.report_templates FOR SELECT TO authenticated
    USING (
        organization_id = (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
        OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
    );

-- Policy 3: Users can insert templates in their organization
CREATE POLICY "Users can insert report_templates in their organization"
    ON public.report_templates FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
        OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
    );

-- Policy 4: Users can update their organization's templates
CREATE POLICY "Users can update their organization's report_templates"
    ON public.report_templates FOR UPDATE TO authenticated
    USING (
        organization_id = (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
        OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
    )
    WITH CHECK (
        organization_id = (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
        OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
    );

-- Policy 5: Users can delete their organization's templates (soft delete)
CREATE POLICY "Users can delete their organization's report_templates"
    ON public.report_templates FOR DELETE TO authenticated
    USING (
        organization_id = (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
        OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
    );

-- Add comment to table
COMMENT ON TABLE public.report_templates IS 'Report templates for customizing PDF and Excel exports per school';
COMMENT ON COLUMN public.report_templates.template_type IS 'Type of report: buildings, rooms, staff, students, etc.';
COMMENT ON COLUMN public.report_templates.report_logo_selection IS 'Logo selection: primary, secondary, both, ministry, primary_ministry';
COMMENT ON COLUMN public.report_templates.is_default IS 'Whether this template is the default for its template_type';

