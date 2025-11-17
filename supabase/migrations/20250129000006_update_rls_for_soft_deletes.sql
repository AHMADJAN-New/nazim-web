-- Update RLS policies to exclude soft-deleted records
-- This ensures that soft-deleted records are not visible in queries

-- Organizations policies
DROP POLICY IF EXISTS "Authenticated users can read their organization" ON public.organizations;
CREATE POLICY "Authenticated users can read their organization"
    ON public.organizations
    FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND (
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
        )
    );

-- Profiles policies
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can read profiles in their organization" ON public.profiles;
CREATE POLICY "Users can read profiles in their organization"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
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
            ) IS NULL  -- Super admin can read all
        )
    );

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        deleted_at IS NULL
        AND id = auth.uid()
    )
    WITH CHECK (
        deleted_at IS NULL
        AND id = auth.uid()
    );

DROP POLICY IF EXISTS "Admins can update profiles in their organization" ON public.profiles;
CREATE POLICY "Admins can update profiles in their organization"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        deleted_at IS NULL
        AND (
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
    )
    WITH CHECK (
        deleted_at IS NULL
        AND (
            (
                SELECT role 
                FROM public.profiles 
                WHERE id = auth.uid()
            ) IN ('admin', 'super_admin')
        )
    );

-- Buildings policies (update existing ones)
-- Note: We'll update the main SELECT policy to exclude deleted_at
-- The existing policies should be updated to include deleted_at IS NULL

-- Rooms policies (update existing ones)
-- Note: Similar to buildings, update existing policies

-- Staff policies (update existing ones)
-- Note: Similar to buildings, update existing policies

