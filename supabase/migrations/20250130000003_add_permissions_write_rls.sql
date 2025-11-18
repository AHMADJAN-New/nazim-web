-- Migration: Add RLS policies for write operations (INSERT/UPDATE/DELETE) on permissions and role_permissions
-- This enables organization-scoped permissions management where each organization can manage their own permissions

-- ============================================================================
-- 1. RLS POLICIES FOR permissions TABLE - WRITE OPERATIONS
-- ============================================================================

-- Authenticated users can INSERT permissions for their organization
CREATE POLICY "Authenticated users can insert their organization's permissions"
    ON public.permissions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Users can only create permissions for their organization
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR
        -- Super admin can create global permissions (organization_id = NULL)
        (
            (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
            AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
        )
    );

-- Authenticated users can UPDATE permissions for their organization
CREATE POLICY "Authenticated users can update their organization's permissions"
    ON public.permissions
    FOR UPDATE
    TO authenticated
    USING (
        -- Users can only update permissions for their organization
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR
        -- Super admin can update all permissions
        (
            (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
            AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
        )
    )
    WITH CHECK (
        -- Ensure updated permission still belongs to user's organization
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR
        -- Super admin can update all permissions
        (
            (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
            AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
        )
    );

-- Authenticated users can DELETE permissions for their organization
CREATE POLICY "Authenticated users can delete their organization's permissions"
    ON public.permissions
    FOR DELETE
    TO authenticated
    USING (
        -- Users can only delete permissions for their organization
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR
        -- Super admin can delete all permissions
        (
            (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
            AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
        )
    );

-- ============================================================================
-- 2. RLS POLICIES FOR role_permissions TABLE - WRITE OPERATIONS
-- ============================================================================

-- Authenticated users can INSERT role_permissions for their organization
CREATE POLICY "Authenticated users can insert their organization's role_permissions"
    ON public.role_permissions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Users can only assign permissions to roles for their organization
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR
        -- Super admin can assign global role permissions (organization_id = NULL)
        (
            (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
            AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
        )
    );

-- Authenticated users can UPDATE role_permissions for their organization
CREATE POLICY "Authenticated users can update their organization's role_permissions"
    ON public.role_permissions
    FOR UPDATE
    TO authenticated
    USING (
        -- Users can only update role_permissions for their organization
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR
        -- Super admin can update all role_permissions
        (
            (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
            AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
        )
    )
    WITH CHECK (
        -- Ensure updated role_permission still belongs to user's organization
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR
        -- Super admin can update all role_permissions
        (
            (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
            AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
        )
    );

-- Authenticated users can DELETE role_permissions for their organization
CREATE POLICY "Authenticated users can delete their organization's role_permissions"
    ON public.role_permissions
    FOR DELETE
    TO authenticated
    USING (
        -- Users can only delete role_permissions for their organization
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR
        -- Super admin can delete all role_permissions
        (
            (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
            AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
        )
    );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Authenticated users can insert their organization's permissions" ON public.permissions IS 
    'Allows authenticated users to create permissions for their organization only';

COMMENT ON POLICY "Authenticated users can update their organization's permissions" ON public.permissions IS 
    'Allows authenticated users to update permissions for their organization only';

COMMENT ON POLICY "Authenticated users can delete their organization's permissions" ON public.permissions IS 
    'Allows authenticated users to delete permissions for their organization only';

COMMENT ON POLICY "Authenticated users can insert their organization's role_permissions" ON public.role_permissions IS 
    'Allows authenticated users to assign permissions to roles for their organization only';

COMMENT ON POLICY "Authenticated users can update their organization's role_permissions" ON public.role_permissions IS 
    'Allows authenticated users to update role permission assignments for their organization only';

COMMENT ON POLICY "Authenticated users can delete their organization's role_permissions" ON public.role_permissions IS 
    'Allows authenticated users to remove permission assignments from roles for their organization only';

