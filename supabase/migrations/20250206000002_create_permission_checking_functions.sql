-- ============================================================================
-- Permission Checking Functions
-- ============================================================================
-- Functions to check user permissions for RLS policies.
-- Checks user_permissions first (per-user overrides), then falls back to
-- role_permissions (role-based permissions).
-- ============================================================================

-- ============================================================================
-- has_permission_for_resource: Check if user has permission for a resource/action
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_permission_for_resource(
    resource_name TEXT,
    action_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    current_uid UUID := (SELECT auth.uid());
    user_role TEXT;
    user_org_id UUID;
    has_perm BOOLEAN := FALSE;
BEGIN
    -- If no user, deny access
    IF current_uid IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Get user's role and organization
    SELECT role, organization_id INTO user_role, user_org_id
    FROM public.profiles
    WHERE id = current_uid
      AND deleted_at IS NULL;

    -- If no profile, deny access
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Super admin always has access
    IF user_role = 'super_admin' THEN
        RETURN TRUE;
    END IF;

    -- First, check user_permissions (per-user overrides take precedence)
    SELECT EXISTS(
        SELECT 1
        FROM public.user_permissions up
        INNER JOIN public.permissions p ON up.permission_id = p.id
        WHERE up.user_id = current_uid
          AND up.deleted_at IS NULL
          AND p.resource = resource_name
          AND p.action = action_name
          AND (
              -- Global permission (both user_permission and permission are global)
              (up.organization_id IS NULL AND p.organization_id IS NULL)
              OR
              -- Organization-specific permission matches user's org
              (up.organization_id = user_org_id AND p.organization_id = user_org_id)
          )
    ) INTO has_perm;

    -- If user has explicit permission, return true
    IF has_perm THEN
        RETURN TRUE;
    END IF;

    -- Fall back to role_permissions (role-based permissions)
    SELECT EXISTS(
        SELECT 1
        FROM public.role_permissions rp
        INNER JOIN public.permissions p ON rp.permission_id = p.id
        WHERE rp.role = user_role
          AND p.resource = resource_name
          AND p.action = action_name
          AND (
              -- Global permission (organization_id IS NULL)
              (rp.organization_id IS NULL AND p.organization_id IS NULL)
              OR
              -- Organization-specific permission matches user's org
              (rp.organization_id = user_org_id AND p.organization_id = user_org_id)
          )
    ) INTO has_perm;

    RETURN has_perm;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.has_permission_for_resource(TEXT, TEXT) TO authenticated;

-- ============================================================================
-- Helper Functions for Role-Specific Scoping
-- ============================================================================

-- Check if teacher teaches a specific student
CREATE OR REPLACE FUNCTION public.is_teacher_of_student(student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    current_uid UUID := (SELECT auth.uid());
    user_role TEXT;
BEGIN
    IF current_uid IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = current_uid
      AND deleted_at IS NULL;

    -- Only teachers can be teachers of students
    IF user_role != 'teacher' THEN
        RETURN FALSE;
    END IF;

    -- Check if student is in any class taught by this teacher
    -- This requires a class_students or similar table
    -- For now, return false (to be implemented when class_students table exists)
    RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_teacher_of_student(UUID) TO authenticated;

-- Check if user is parent of a specific student
CREATE OR REPLACE FUNCTION public.is_parent_of_student(student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    current_uid UUID := (SELECT auth.uid());
    user_role TEXT;
BEGIN
    IF current_uid IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = current_uid
      AND deleted_at IS NULL;

    -- Only parents can be parents of students
    IF user_role != 'parent' THEN
        RETURN FALSE;
    END IF;

    -- Check if student has this user as parent
    -- This requires a students.parent_id or parent_students table
    -- For now, return false (to be implemented when parent relationship exists)
    RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_parent_of_student(UUID) TO authenticated;

-- Check if record belongs to current user
CREATE OR REPLACE FUNCTION public.is_own_record(record_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    current_uid UUID := (SELECT auth.uid());
BEGIN
    IF current_uid IS NULL OR record_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN current_uid = record_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_own_record(UUID) TO authenticated;

COMMENT ON FUNCTION public.has_permission_for_resource(TEXT, TEXT) IS 'Checks if current user has permission for a resource/action. Checks user_permissions first (per-user overrides), then role_permissions (role-based).';
COMMENT ON FUNCTION public.is_teacher_of_student(UUID) IS 'Checks if current user (teacher) teaches the specified student.';
COMMENT ON FUNCTION public.is_parent_of_student(UUID) IS 'Checks if current user (parent) is parent of the specified student.';
COMMENT ON FUNCTION public.is_own_record(UUID) IS 'Checks if record belongs to current user.';

