-- Add default_school_id to profiles table
-- This allows users to have a default school assigned to them
-- When they create buildings/rooms/etc, this school_id will be used automatically

-- Add default_school_id column
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS default_school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_default_school_id ON public.profiles(default_school_id);

-- Add comment
COMMENT ON COLUMN public.profiles.default_school_id IS 'Default school assigned to the user. Used when creating buildings/rooms/etc if school_id is not specified.';

-- Update the handle_new_user function to accept default_school_id from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role VARCHAR;
    user_org_id UUID;
    user_school_id UUID;
BEGIN
    -- Get role from metadata, default to 'student'
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    
    -- Get organization_id from metadata if provided
    user_org_id := NULL;
    IF NEW.raw_user_meta_data->>'organization_id' IS NOT NULL THEN
        user_org_id := (NEW.raw_user_meta_data->>'organization_id')::UUID;
    END IF;
    
    -- Get default_school_id from metadata if provided
    user_school_id := NULL;
    IF NEW.raw_user_meta_data->>'default_school_id' IS NOT NULL THEN
        user_school_id := (NEW.raw_user_meta_data->>'default_school_id')::UUID;
    END IF;
    
    -- If role is super_admin, ensure organization_id is NULL
    IF user_role = 'super_admin' THEN
        user_org_id := NULL;
        user_school_id := NULL; -- Super admins don't have default school
    END IF;
    
    -- Create profile (organization_id can be NULL temporarily for non-super-admin users)
    -- Admin must assign organization before user can access the application
    INSERT INTO public.profiles (id, email, full_name, role, organization_id, default_school_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        user_role,
        user_org_id,
        user_school_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile for new user with organization_id and default_school_id from metadata';

