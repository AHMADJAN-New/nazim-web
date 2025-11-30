-- ============================================================================
-- Fix All Permission and RLS Policy Issues
-- ============================================================================
-- This migration:
-- 1. Fixes ensure_user_profile_exists() function (STABLE -> VOLATILE for INSERT)
-- 2. Fixes type casting issues in profile functions
-- 3. Fixes incomplete school_branding UPDATE policy
-- 4. Ensures all permissions are assigned to admin role for all organizations
-- 5. Calls assign_default_role_permissions for all existing organizations
-- ============================================================================

-- ============================================================================
-- 1. Fix ensure_user_profile_exists() function
-- ============================================================================
-- The function was marked STABLE but does INSERT, which is invalid.
-- Also fixing type casting to be consistent.
CREATE OR REPLACE FUNCTION public.ensure_user_profile_exists()
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    role TEXT,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN,
    default_school_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
-- Changed from STABLE to VOLATILE because function does INSERT
AS $$
DECLARE
    current_uid UUID := auth.uid();
    user_record RECORD;
    user_role VARCHAR;
    user_org_id UUID := NULL;
    user_school_id UUID := NULL;
    profile_exists BOOLEAN;
BEGIN
    -- If no user ID, return empty
    IF current_uid IS NULL THEN
        RETURN;
    END IF;

    -- Check if profile already exists
    SELECT EXISTS(
        SELECT 1 FROM public.profiles p
        WHERE p.id = current_uid AND p.deleted_at IS NULL
    ) INTO profile_exists;

    -- If profile exists, return it
    IF profile_exists THEN
        RETURN QUERY
        SELECT 
            p.id,
            p.organization_id,
            p.role::TEXT,
            COALESCE(p.full_name, '')::TEXT,
            COALESCE(p.email, '')::TEXT,
            COALESCE(p.phone, '')::TEXT,
            COALESCE(p.avatar_url, '')::TEXT,
            p.is_active,
            p.default_school_id
        FROM public.profiles p
        WHERE p.id = current_uid
          AND p.deleted_at IS NULL;
        RETURN;
    END IF;

    -- Profile doesn't exist - create it from auth.users
    SELECT * INTO user_record
    FROM auth.users u
    WHERE u.id = current_uid;

    -- If user doesn't exist in auth.users, return empty
    IF user_record IS NULL THEN
        RETURN;
    END IF;

    -- Extract role from user_metadata, default to 'student'
    user_role := COALESCE(user_record.raw_user_meta_data->>'role', 'student');

    -- Extract organization_id from user_metadata
    IF user_record.raw_user_meta_data ? 'organization_id' THEN
        user_org_id := (user_record.raw_user_meta_data->>'organization_id')::UUID;
    END IF;

    -- Extract default_school_id from user_metadata
    IF user_record.raw_user_meta_data ? 'default_school_id' THEN
        user_school_id := (user_record.raw_user_meta_data->>'default_school_id')::UUID;
    END IF;

    -- For any role, assign to first organization if not set
    IF user_org_id IS NULL THEN
        SELECT o.id INTO user_org_id 
        FROM public.organizations o
        WHERE o.deleted_at IS NULL
        ORDER BY o.created_at ASC 
        LIMIT 1;
    END IF;

    -- Create profile
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        organization_id,
        default_school_id
    )
    VALUES (
        current_uid,
        user_record.email,
        COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.email),
        user_role,
        user_org_id,
        user_school_id
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        organization_id = EXCLUDED.organization_id,
        default_school_id = EXCLUDED.default_school_id,
        deleted_at = NULL;

    -- Return the created/updated profile
    RETURN QUERY
    SELECT 
        p.id,
        p.organization_id,
        p.role::TEXT,
        COALESCE(p.full_name, '')::TEXT,
        COALESCE(p.email, '')::TEXT,
        COALESCE(p.phone, '')::TEXT,
        COALESCE(p.avatar_url, '')::TEXT,
        p.is_active,
        p.default_school_id
    FROM public.profiles p
    WHERE p.id = current_uid
      AND p.deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_profile_exists() TO authenticated;

-- ============================================================================
-- 2. Fix get_user_profile() function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id UUID)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    role TEXT,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN,
    default_school_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    -- First, ensure profile exists (if calling for current user)
    IF user_id = auth.uid() THEN
        PERFORM public.ensure_user_profile_exists();
    END IF;

    -- Then return the profile
    RETURN QUERY
    SELECT 
        p.id,
        p.organization_id,
        p.role::TEXT,
        COALESCE(p.full_name, '')::TEXT,
        COALESCE(p.email, '')::TEXT,
        COALESCE(p.phone, '')::TEXT,
        COALESCE(p.avatar_url, '')::TEXT,
        p.is_active,
        p.default_school_id
    FROM public.profiles p
    WHERE p.id = user_id
      AND p.deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID) TO authenticated;

-- ============================================================================
-- 3. Fix school_branding UPDATE policy (incomplete WITH CHECK)
-- ============================================================================
DROP POLICY IF EXISTS "Users can update branding" ON public.school_branding;

CREATE POLICY "Users can update branding" ON public.school_branding
    FOR UPDATE TO authenticated
USING (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    )
    AND public.has_permission_for_resource('branding', 'update')
)
WITH CHECK (
    deleted_at IS NULL
    AND (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_role() = 'super_admin'
    )
    AND public.has_permission_for_resource('branding', 'update')
);

-- ============================================================================
-- 4. Assign all permissions to admin role for all organizations
-- ============================================================================
-- This ensures admin users have all the permissions they need

DO $$
DECLARE
    org_id UUID;
    perm_record RECORD;
BEGIN
    -- For each organization
    FOR org_id IN SELECT id FROM public.organizations WHERE deleted_at IS NULL LOOP
        -- Assign all global permissions to admin role for this organization
        FOR perm_record IN 
            SELECT id, name, resource FROM public.permissions 
            WHERE organization_id IS NULL
        LOOP
            INSERT INTO public.role_permissions (role, permission_id, organization_id)
            VALUES ('admin', perm_record.id, org_id)
            ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
        END LOOP;
        
        -- Also assign to super_admin role (both NULL and org-scoped)
        FOR perm_record IN 
            SELECT id FROM public.permissions 
            WHERE organization_id IS NULL
        LOOP
            -- Global super_admin permissions (organization_id = NULL)
            INSERT INTO public.role_permissions (role, permission_id, organization_id)
            VALUES ('super_admin', perm_record.id, NULL)
            ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
            
            -- Org-scoped super_admin permissions
            INSERT INTO public.role_permissions (role, permission_id, organization_id)
            VALUES ('super_admin', perm_record.id, org_id)
            ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$;

-- ============================================================================
-- 5. Update assign_default_role_permissions to be more comprehensive
-- ============================================================================
CREATE OR REPLACE FUNCTION public.assign_default_role_permissions(target_org UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    perm_record RECORD;
BEGIN
    -- Super admin: ALL global permissions
    FOR perm_record IN SELECT id FROM public.permissions WHERE organization_id IS NULL LOOP
        -- Global access
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        VALUES ('super_admin', perm_record.id, NULL)
        ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
        
        -- Org-scoped access
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        VALUES ('super_admin', perm_record.id, target_org)
        ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
    END LOOP;

    -- Admin: ALL global permissions for their organization
    FOR perm_record IN SELECT id FROM public.permissions WHERE organization_id IS NULL LOOP
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        VALUES ('admin', perm_record.id, target_org)
        ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
    END LOOP;

    -- Teacher: read-only access to academic data
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'teacher', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'students.read',
        'classes.read',
        'subjects.read',
        'academic_years.read',
        'class_subjects.read',
        'class_academic_years.read',
        'teacher_subject_assignments.read',
        'schedule_slots.read',
        'timetables.read',
        'residency_types.read',
        'profiles.read',
        'rooms.read',
        'buildings.read',
        'branding.read',
        'attendance.read',
        'attendance.create',
        'attendance.update'
      )
    ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

    -- Staff: basic read access (specific permissions per user via user_permissions)
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'staff', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'students.read',
        'classes.read',
        'academic_years.read',
        'profiles.read',
        'rooms.read',
        'buildings.read',
        'branding.read'
      )
    ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

    -- Student: very limited access (only their own data)
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'student', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'profiles.read',
        'branding.read'
      )
    ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

    -- Parent: limited access to child's data
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'parent', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'students.read',
        'profiles.read',
        'branding.read',
        'attendance.read'
      )
    ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.assign_default_role_permissions(UUID) IS 
'Assigns comprehensive default permissions to roles for an organization. Admin gets all permissions. Staff get basic read access (use user_permissions for specific staff roles). Teacher, student, parent get role-appropriate access.';

-- ============================================================================
-- 6. Call assign_default_role_permissions for all existing organizations
-- ============================================================================
DO $$
DECLARE
    org_id UUID;
BEGIN
    FOR org_id IN SELECT id FROM public.organizations WHERE deleted_at IS NULL LOOP
        PERFORM public.assign_default_role_permissions(org_id);
    END LOOP;
END;
$$;

-- ============================================================================
-- 7. Verify that admin role has branding permissions for all orgs
-- ============================================================================
DO $$
DECLARE
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_count
    FROM public.organizations o
    CROSS JOIN public.permissions p
    WHERE p.resource = 'branding' AND p.organization_id IS NULL
      AND o.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM public.role_permissions rp
          WHERE rp.role = 'admin'
            AND rp.permission_id = p.id
            AND rp.organization_id = o.id
      );
    
    IF missing_count > 0 THEN
        RAISE NOTICE 'Warning: % missing branding permissions for admin role', missing_count;
    ELSE
        RAISE NOTICE 'All branding permissions correctly assigned to admin role';
    END IF;
END;
$$;

