-- ============================================================================
-- User Permissions Table
-- ============================================================================
-- Allows per-user permission overrides, enabling different staff users
-- (clerk, front desk, registrar, librarian, etc.) to have different permissions
-- while all having the same "staff" role.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT user_permissions_unique UNIQUE (user_id, permission_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON public.user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_organization_id ON public.user_permissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_org ON public.user_permissions(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_deleted_at ON public.user_permissions(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.user_permissions IS 'Per-user permission overrides. Allows individual users to have specific permissions beyond their role.';

-- ============================================================================
-- RLS Policies for user_permissions
-- ============================================================================

-- Service role full access
CREATE POLICY "Service role full access to user_permissions" 
    ON public.user_permissions FOR ALL TO service_role 
    USING (TRUE) WITH CHECK (TRUE);

-- Users can read their own permissions
CREATE POLICY "Users can read their own permissions" 
    ON public.user_permissions FOR SELECT TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            user_id = (SELECT auth.uid())
            OR (
                -- Admins can read permissions for users in their organization
                public.get_current_user_role() IN ('admin', 'super_admin')
                AND organization_id = public.get_current_user_organization_id()
            )
            OR (
                -- Super admin can read all permissions
                public.get_current_user_role() = 'super_admin'
            )
        )
    );

-- Admins can assign permissions to users in their organization
CREATE POLICY "Admins can insert user permissions" 
    ON public.user_permissions FOR INSERT TO authenticated 
    WITH CHECK (
        deleted_at IS NULL
        AND public.get_current_user_role() IN ('admin', 'super_admin')
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_role() = 'super_admin'
        )
    );

-- Admins can update permissions in their organization (including soft deletes)
CREATE POLICY "Admins can update user permissions" 
    ON public.user_permissions FOR UPDATE TO authenticated 
    USING (
        deleted_at IS NULL
        AND public.get_current_user_role() IN ('admin', 'super_admin')
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_role() = 'super_admin'
        )
    )
    WITH CHECK (
        -- Allow updates: can set deleted_at (soft delete) or keep it NULL (regular update)
        -- Still enforce organization and role checks
        public.get_current_user_role() IN ('admin', 'super_admin')
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_role() = 'super_admin'
        )
    );

-- Admins can delete (soft delete) permissions in their organization
CREATE POLICY "Admins can delete user permissions" 
    ON public.user_permissions FOR DELETE TO authenticated 
    USING (
        deleted_at IS NULL
        AND public.get_current_user_role() IN ('admin', 'super_admin')
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_role() = 'super_admin'
        )
    );

