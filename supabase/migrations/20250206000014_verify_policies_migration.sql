-- ============================================================================
-- Verify Policies Migration - Diagnostic Script
-- ============================================================================
-- This migration creates a function to verify that all RLS policies have been
-- migrated to use permission-based checks (has_permission_for_resource).
-- Run this to check for any tables that still use role-based checks.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.verify_policies_migration()
RETURNS TABLE (
    table_name TEXT,
    policy_name TEXT,
    policy_definition TEXT,
    uses_permission_check BOOLEAN,
    uses_role_check BOOLEAN,
    needs_update BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname || '.' || tablename AS table_name,
        policyname AS policy_name,
        pg_get_expr(polqual, polrelid) AS policy_definition,
        CASE 
            WHEN pg_get_expr(polqual, polrelid) LIKE '%has_permission_for_resource%' THEN TRUE
            ELSE FALSE
        END AS uses_permission_check,
        CASE 
            WHEN pg_get_expr(polqual, polrelid) LIKE '%get_current_user_role%' 
                 OR pg_get_expr(polqual, polrelid) LIKE '%role%' 
                 OR pg_get_expr(polqual, polrelid) LIKE '%super_admin%'
                 OR pg_get_expr(polqual, polrelid) LIKE '%admin%'
            THEN TRUE
            ELSE FALSE
        END AS uses_role_check,
        CASE 
            -- System tables that should keep role checks
            WHEN tablename IN ('organizations', 'permissions', 'role_permissions', 'user_permissions', 'super_admin_organizations') THEN FALSE
            -- Tables that use permission checks are good
            WHEN pg_get_expr(polqual, polrelid) LIKE '%has_permission_for_resource%' THEN FALSE
            -- Tables that still use role checks need updating
            WHEN pg_get_expr(polqual, polrelid) LIKE '%get_current_user_role%' 
                 OR pg_get_expr(polqual, polrelid) LIKE '%super_admin%'
                 OR (pg_get_expr(polqual, polrelid) LIKE '%admin%' AND tablename != 'organizations')
            THEN TRUE
            ELSE FALSE
        END AS needs_update
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename NOT IN ('_prisma_migrations', 'schema_migrations')
    ORDER BY tablename, policyname;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_policies_migration() TO authenticated;

COMMENT ON FUNCTION public.verify_policies_migration() IS 'Diagnostic function to verify RLS policies have been migrated to use permission-based checks. Returns tables that still use role-based checks and need updating.';

-- ============================================================================
-- Example Usage:
-- ============================================================================
-- SELECT * FROM public.verify_policies_migration() 
-- WHERE needs_update = TRUE;
-- ============================================================================

