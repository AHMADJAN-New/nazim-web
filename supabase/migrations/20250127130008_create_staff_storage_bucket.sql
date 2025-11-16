-- Create storage bucket for staff files (pictures, documents, etc.)
-- This bucket will store staff-related files with organization isolation
--
-- NOTE: Storage buckets should be created via Supabase Storage API, not SQL.
-- Run the following command from a secure server environment:
--
-- curl -X POST "<PROJECT_URL>/storage/v1/bucket" \
--   -H "apikey: <SERVICE_ROLE_KEY>" \
--   -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
--   -H "Content-Type: application/json" \
--   -d '{
--     "id": "staff-files",
--     "name": "staff-files",
--     "public": false,
--     "file_size_limit": 10485760,
--     "allowed_mime_types": [
--       "image/jpeg",
--       "image/png",
--       "image/gif",
--       "image/webp",
--       "application/pdf",
--       "application/msword",
--       "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
--       "application/vnd.ms-excel",
--       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
--     ]
--   }'
--
-- Alternatively, create the bucket via Supabase Dashboard: Storage > New Bucket
--
-- This migration only creates the storage policies (RLS) for the bucket.
-- The bucket itself must exist before running this migration.

-- Enable RLS on the bucket
-- Note: Storage RLS is handled differently - we'll use storage policies

-- Create policy: Users can upload files to their organization's staff folder
CREATE POLICY "Users can upload staff files in their organization"
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

-- Create policy: Users can read files from their organization's staff folder
CREATE POLICY "Users can read staff files in their organization"
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

-- Create policy: Users can update files in their organization's staff folder
CREATE POLICY "Users can update staff files in their organization"
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

-- Create policy: Users can delete files from their organization's staff folder
CREATE POLICY "Users can delete staff files in their organization"
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

-- Create policy: Service role has full access
CREATE POLICY "Service role full access to staff files"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'staff-files')
    WITH CHECK (bucket_id = 'staff-files');

-- Add comment
COMMENT ON TABLE storage.buckets IS 'Storage bucket for staff files (pictures, documents) with organization isolation';

