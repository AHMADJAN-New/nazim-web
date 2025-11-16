-- Create organizations table for multi-tenancy
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_name ON public.organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create policy: Service role has full access (needed for migrations)
CREATE POLICY "Service role full access to organizations"
    ON public.organizations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Note: Organization-specific RLS policies will be added in migration 20250127130001
-- after the profiles table is created, since they depend on profiles table

-- Add comment to table
COMMENT ON TABLE public.organizations IS 'Multi-tenant organizations table for SaaS isolation';

