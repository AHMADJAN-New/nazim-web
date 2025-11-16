-- Create school_branding table for multi-tenant SaaS branding
CREATE TABLE IF NOT EXISTS public.school_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    school_name VARCHAR(255) NOT NULL,
    school_name_arabic VARCHAR(255),
    school_name_pashto VARCHAR(255),
    school_address TEXT,
    school_phone VARCHAR(50),
    school_email VARCHAR(100),
    school_website VARCHAR(200),
    logo_path TEXT,
    header_image_path TEXT,
    footer_text TEXT,
    primary_color VARCHAR(7) DEFAULT '#0b0b56',
    secondary_color VARCHAR(7) DEFAULT '#0056b3',
    accent_color VARCHAR(7) DEFAULT '#ff6b35',
    font_family VARCHAR(100) DEFAULT 'Bahij Nassim',
    report_font_size VARCHAR(10) DEFAULT '12px',
    primary_logo_binary BYTEA,
    primary_logo_mime_type VARCHAR(100),
    primary_logo_filename VARCHAR(255),
    primary_logo_size INTEGER,
    secondary_logo_binary BYTEA,
    secondary_logo_mime_type VARCHAR(100),
    secondary_logo_filename VARCHAR(255),
    secondary_logo_size INTEGER,
    ministry_logo_binary BYTEA,
    ministry_logo_mime_type VARCHAR(100),
    ministry_logo_filename VARCHAR(255),
    ministry_logo_size INTEGER,
    primary_logo_usage VARCHAR(100) DEFAULT 'reports',
    secondary_logo_usage VARCHAR(100) DEFAULT 'certificates',
    ministry_logo_usage VARCHAR(100) DEFAULT 'official_documents',
    header_text TEXT,
    table_alternating_colors BOOLEAN DEFAULT true,
    show_page_numbers BOOLEAN DEFAULT true,
    show_generation_date BOOLEAN DEFAULT true,
    report_logo_selection VARCHAR(50) DEFAULT 'primary,secondary',
    calendar_preference VARCHAR(20) DEFAULT 'jalali',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now(),
        -- Ensure one branding per organization
        UNIQUE (organization_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_school_branding_organization_id ON public.school_branding (organization_id);

CREATE INDEX IF NOT EXISTS idx_school_branding_is_active ON public.school_branding (is_active);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_school_branding_updated_at
    BEFORE UPDATE ON public.school_branding
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.school_branding ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can read branding for their organization
CREATE POLICY "Users can read branding for their organization" ON public.school_branding FOR
SELECT TO authenticated USING (
        organization_id = (
            SELECT organization_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
        OR (
            SELECT role
            FROM public.profiles
            WHERE
                id = auth.uid ()
        ) = 'super_admin'
    );

-- Create policy: Admins can update branding for their organization
CREATE POLICY "Admins can update branding for their organization" ON public.school_branding FOR
UPDATE TO authenticated USING (
    (
        SELECT role
        FROM public.profiles
        WHERE
            id = auth.uid ()
    ) IN ('admin', 'super_admin')
    AND (
        organization_id = (
            SELECT organization_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
        OR (
            SELECT role
            FROM public.profiles
            WHERE
                id = auth.uid ()
        ) = 'super_admin'
    )
)
WITH
    CHECK (
        (
            SELECT role
            FROM public.profiles
            WHERE
                id = auth.uid ()
        ) IN ('admin', 'super_admin')
    );

-- Create policy: Admins can insert branding for their organization
CREATE POLICY "Admins can insert branding for their organization" ON public.school_branding FOR
INSERT
    TO authenticated
WITH
    CHECK (
        (
            SELECT role
            FROM public.profiles
            WHERE
                id = auth.uid ()
        ) IN ('admin', 'super_admin')
        AND (
            organization_id = (
                SELECT organization_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            )
            OR (
                SELECT role
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) = 'super_admin'
        )
    );

-- Create policy: Service role has full access
CREATE POLICY "Service role full access to school_branding" ON public.school_branding FOR ALL TO service_role USING (true)
WITH
    CHECK (true);

-- Add comment to table
COMMENT ON
TABLE public.school_branding IS 'Multi-tenant school branding configuration for SaaS isolation';