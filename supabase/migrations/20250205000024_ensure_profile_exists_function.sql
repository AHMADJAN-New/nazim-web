-- ============================================================================
-- Ensure User Profile Exists Function
-- ============================================================================
-- Creates a function that synchronously ensures a user profile exists.
-- If profile is missing, creates it from auth.users.raw_user_meta_data.
-- This fixes race conditions where RLS policies check for profiles that don't exist yet.
-- ============================================================================

-- Function to ensure user profile exists, creating it if missing
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
STABLE
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
            p.full_name::TEXT,
            p.email::TEXT,
            p.phone::TEXT,
            p.avatar_url::TEXT,
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

    -- For super_admin, assign to first organization if not set
    IF user_role = 'super_admin' AND user_org_id IS NULL THEN
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
        p.full_name::TEXT,
        p.email::TEXT,
        COALESCE(p.phone, '')::TEXT,
        COALESCE(p.avatar_url, '')::TEXT,
        p.is_active,
        p.default_school_id
    FROM public.profiles p
    WHERE p.id = current_uid
      AND p.deleted_at IS NULL;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_user_profile_exists() TO authenticated;

-- Update get_user_profile to ensure profile exists first
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
        p.full_name::TEXT,
        p.email::TEXT,
        COALESCE(p.phone, '')::TEXT,
        COALESCE(p.avatar_url, '')::TEXT,
        p.is_active,
        p.default_school_id
    FROM public.profiles p
    WHERE p.id = user_id
      AND p.deleted_at IS NULL;
END;
$$;

