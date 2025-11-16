-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(role, permission_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);

-- Enable Row Level Security
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Create policy: Service role only (system table)
CREATE POLICY "Service role full access to role_permissions"
    ON public.role_permissions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Insert default role permissions
-- Super admin gets all permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'super_admin', id FROM public.permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Admin gets all permissions except organization management
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions
WHERE resource != 'organizations'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Teacher gets read permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'teacher', id FROM public.permissions
WHERE action = 'read'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Staff gets read permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'staff', id FROM public.permissions
WHERE action = 'read'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE public.role_permissions IS 'Junction table linking roles to permissions for RBAC';

