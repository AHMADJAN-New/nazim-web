-- Create profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'student',
    full_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Super admin has organization_id = NULL
    -- Regular users should have an organization_id (but can be NULL temporarily during signup)
    -- The application should enforce organization assignment before allowing access
    CONSTRAINT check_organization_required CHECK (
        (role = 'super_admin' AND organization_id IS NULL) OR
        (role != 'super_admin')
    )
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can read their own profile
CREATE POLICY "Users can read their own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Create policy: Users can read profiles in their organization
CREATE POLICY "Users can read profiles in their organization"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        organization_id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        ) IS NULL  -- Super admin can read all
    );

-- Create policy: Users can update their own profile (limited fields)
-- Note: Role and organization_id changes are prevented at the application level
-- RLS policy only ensures users can update their own profile
CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Create policy: Admins can update profiles in their organization
CREATE POLICY "Admins can update profiles in their organization"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        (
            SELECT role 
            FROM public.profiles 
            WHERE id = auth.uid()
        ) IN ('admin', 'super_admin')
        AND (
            organization_id = (
                SELECT organization_id 
                FROM public.profiles 
                WHERE id = auth.uid()
            )
            OR (
                SELECT organization_id 
                FROM public.profiles 
                WHERE id = auth.uid()
            ) IS NULL  -- Super admin
        )
    )
    WITH CHECK (
        (
            SELECT role 
            FROM public.profiles 
            WHERE id = auth.uid()
        ) IN ('admin', 'super_admin')
    );

-- Create policy: Service role has full access
CREATE POLICY "Service role full access to profiles"
    ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role VARCHAR;
    user_org_id UUID;
BEGIN
    -- Get role from metadata, default to 'student'
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    
    -- Get organization_id from metadata if provided
    user_org_id := NULL;
    IF NEW.raw_user_meta_data->>'organization_id' IS NOT NULL THEN
        user_org_id := (NEW.raw_user_meta_data->>'organization_id')::UUID;
    END IF;
    
    -- If role is super_admin, ensure organization_id is NULL
    IF user_role = 'super_admin' THEN
        user_org_id := NULL;
    END IF;
    
    -- Create profile (organization_id can be NULL temporarily for non-super-admin users)
    -- Admin must assign organization before user can access the application
    INSERT INTO public.profiles (id, email, full_name, role, organization_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        user_role,
        user_org_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call function on new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Add comment to table
COMMENT ON TABLE public.profiles IS 'User profiles with organization and role information';

-- Now that profiles table exists, add organization-specific RLS policies
-- Drop existing policy if it exists (from organizations migration)
DROP POLICY IF EXISTS "Authenticated users can read their organization" ON public.organizations;

-- Create policy: Authenticated users can read their organization
CREATE POLICY "Authenticated users can read their organization"
    ON public.organizations
    FOR SELECT
    TO authenticated
    USING (
        id = (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
        OR (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        ) IS NULL  -- Super admin (organization_id IS NULL)
    );

