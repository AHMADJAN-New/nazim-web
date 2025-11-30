-- Storage Policies for staff-files bucket
-- Copy and paste this entire file into Supabase Dashboard > SQL Editor
-- Make sure you're using the service role key or have proper permissions

-- Policy 1: Users can upload files to their organization's staff folder
CREATE POLICY IF NOT EXISTS "Users can upload staff files in their organization"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'staff-files'
        AND (
            -- Check if the path starts with the user's organization_id
            (storage.foldername(name))[1] = (
                SELECT organization_id::text
                FROM public.profiles
                WHERE id = auth.uid()
            )
            OR (
                SELECT organization_id
                FROM public.profiles
                WHERE id = auth.uid()
            ) IS NULL  -- Super admin
        )
    );

-- Policy 2: Users can read files from their organization's staff folder
CREATE POLICY IF NOT EXISTS "Users can read staff files in their organization"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'staff-files'
        AND (
            (storage.foldername(name))[1] = (
                SELECT organization_id::text
                FROM public.profiles
                WHERE id = auth.uid()
            )
            OR (
                SELECT organization_id
                FROM public.profiles
                WHERE id = auth.uid()
            ) IS NULL  -- Super admin
        )
    );

-- Policy 3: Users can update files in their organization's staff folder
CREATE POLICY IF NOT EXISTS "Users can update staff files in their organization"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'staff-files'
        AND (
            (storage.foldername(name))[1] = (
                SELECT organization_id::text
                FROM public.profiles
                WHERE id = auth.uid()
            )
            OR (
                SELECT organization_id
                FROM public.profiles
                WHERE id = auth.uid()
            ) IS NULL  -- Super admin
        )
    );

-- Policy 4: Users can delete files from their organization's staff folder
CREATE POLICY IF NOT EXISTS "Users can delete staff files in their organization"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'staff-files'
        AND (
            (storage.foldername(name))[1] = (
                SELECT organization_id::text
                FROM public.profiles
                WHERE id = auth.uid()
            )
            OR (
                SELECT organization_id
                FROM public.profiles
                WHERE id = auth.uid()
            ) IS NULL  -- Super admin
        )
    );

-- Policy 5: Service role has full access
CREATE POLICY IF NOT EXISTS "Service role full access to staff files"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'staff-files')
    WITH CHECK (bucket_id = 'staff-files');

