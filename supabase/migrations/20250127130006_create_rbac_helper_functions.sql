-- Create helper functions for RBAC and organization isolation

-- Function: Get user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT organization_id 
        FROM public.profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM public.profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT organization_id IS NULL
        FROM public.profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(permission_name VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    user_role VARCHAR;
BEGIN
    -- Get user's role
    SELECT role INTO user_role
    FROM public.profiles 
    WHERE id = auth.uid();
    
    -- Super admin has all permissions
    IF user_role = 'super_admin' THEN
        RETURN true;
    END IF;
    
    -- Check if role has the permission
    RETURN EXISTS (
        SELECT 1
        FROM public.role_permissions rp
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE rp.role = user_role
        AND p.name = permission_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user can access an organization
CREATE OR REPLACE FUNCTION can_access_organization(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Super admin can access all organizations
    IF is_super_admin() THEN
        RETURN true;
    END IF;
    
    -- Regular users can only access their own organization
    RETURN (
        SELECT organization_id = org_id
        FROM public.profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_permission(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_organization(UUID) TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_user_organization_id() IS 'Returns the current user''s organization_id from their profile';
COMMENT ON FUNCTION get_user_role() IS 'Returns the current user''s role from their profile';
COMMENT ON FUNCTION is_super_admin() IS 'Returns true if the current user is a super admin (organization_id IS NULL)';
COMMENT ON FUNCTION user_has_permission(VARCHAR) IS 'Returns true if the current user has the specified permission';
COMMENT ON FUNCTION can_access_organization(UUID) IS 'Returns true if the current user can access the specified organization';

