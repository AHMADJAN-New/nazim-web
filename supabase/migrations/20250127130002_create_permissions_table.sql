-- Create permissions table for RBAC system
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON public.permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON public.permissions(action);
CREATE INDEX IF NOT EXISTS idx_permissions_name ON public.permissions(name);

-- Enable Row Level Security
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Create policy: Service role only (system table)
CREATE POLICY "Service role full access to permissions"
    ON public.permissions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Insert default permissions for common resources
INSERT INTO public.permissions (name, resource, action, description) VALUES
    ('organizations.read', 'organizations', 'read', 'View organizations'),
    ('organizations.create', 'organizations', 'create', 'Create organizations'),
    ('organizations.update', 'organizations', 'update', 'Update organizations'),
    ('organizations.delete', 'organizations', 'delete', 'Delete organizations'),
    ('buildings.read', 'buildings', 'read', 'View buildings'),
    ('buildings.create', 'buildings', 'create', 'Create buildings'),
    ('buildings.update', 'buildings', 'update', 'Update buildings'),
    ('buildings.delete', 'buildings', 'delete', 'Delete buildings'),
    ('rooms.read', 'rooms', 'read', 'View rooms'),
    ('rooms.create', 'rooms', 'create', 'Create rooms'),
    ('rooms.update', 'rooms', 'update', 'Update rooms'),
    ('rooms.delete', 'rooms', 'delete', 'Delete rooms'),
    ('profiles.read', 'profiles', 'read', 'View profiles'),
    ('profiles.update', 'profiles', 'update', 'Update profiles'),
    ('profiles.delete', 'profiles', 'delete', 'Delete profiles')
ON CONFLICT (name) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE public.permissions IS 'RBAC permissions table for fine-grained access control';

