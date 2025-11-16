-- Create super_admin_organizations junction table for multi-organization support
CREATE TABLE IF NOT EXISTS public.super_admin_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    super_admin_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now(),
        UNIQUE (
            super_admin_id,
            organization_id
        )
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_super_admin_orgs_super_admin_id ON public.super_admin_organizations (super_admin_id);

CREATE INDEX IF NOT EXISTS idx_super_admin_orgs_organization_id ON public.super_admin_organizations (organization_id);

CREATE INDEX IF NOT EXISTS idx_super_admin_orgs_is_primary ON public.super_admin_organizations (is_primary);

-- Create trigger to automatically update updated_at (if needed in future)
-- For now, we only track created_at

-- Enable Row Level Security
ALTER TABLE public.super_admin_organizations ENABLE ROW LEVEL SECURITY;

-- Create policy: Super admins can read their own organization assignments
CREATE POLICY "Super admins can read their own organization assignments" ON public.super_admin_organizations FOR
SELECT TO authenticated USING (
        super_admin_id = auth.uid ()
        OR (
            SELECT role
            FROM public.profiles
            WHERE
                id = auth.uid ()
        ) = 'super_admin'
    );

-- Create policy: Super admins can update their own organization assignments
CREATE POLICY "Super admins can update their own organization assignments" ON public.super_admin_organizations FOR
UPDATE TO authenticated USING (
    (
        SELECT role
        FROM public.profiles
        WHERE
            id = auth.uid ()
    ) = 'super_admin'
    AND (
        super_admin_id = auth.uid ()
        OR (
            SELECT role
            FROM public.profiles
            WHERE
                id = auth.uid ()
        ) = 'super_admin'
        AND (
            SELECT id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        ) IN (
            SELECT super_admin_id
            FROM public.super_admin_organizations
        )
    )
)
WITH
    CHECK (
        (
            SELECT role
            FROM public.profiles
            WHERE
                id = auth.uid ()
        ) = 'super_admin'
    );

-- Create policy: Super admins can insert their own organization assignments
CREATE POLICY "Super admins can insert their own organization assignments" ON public.super_admin_organizations FOR
INSERT
    TO authenticated
WITH
    CHECK (
        (
            SELECT role
            FROM public.profiles
            WHERE
                id = auth.uid ()
        ) = 'super_admin'
        AND (
            super_admin_id = auth.uid ()
            OR (
                SELECT id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            ) = super_admin_id
        )
    );

-- Create policy: Super admins can delete their own organization assignments
CREATE POLICY "Super admins can delete their own organization assignments" ON public.super_admin_organizations FOR DELETE TO authenticated USING (
    (
        SELECT role
        FROM public.profiles
        WHERE
            id = auth.uid ()
    ) = 'super_admin'
    AND (
        super_admin_id = auth.uid ()
        OR (
            SELECT id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        ) = super_admin_id
    )
);

-- Create policy: Service role has full access
CREATE POLICY "Service role full access to super_admin_organizations" ON public.super_admin_organizations FOR ALL TO service_role USING (true)
WITH
    CHECK (true);

-- Add comment to table
COMMENT ON
TABLE public.super_admin_organizations IS 'Junction table linking super admins to multiple organizations';