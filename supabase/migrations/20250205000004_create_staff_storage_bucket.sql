-- ============================================================================
-- Staff Files Storage Bucket
-- ============================================================================
-- This migration creates the staff-files storage bucket and RLS policies
-- for organization-scoped file access (pictures and documents).
-- ============================================================================

-- Create storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'staff-files',
    'staff-files',
    false, -- Private bucket
    10485760, -- 10 MB file size limit
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- Note: RLS is already enabled on storage.objects by Supabase

-- ============================================================================
-- Storage RLS Policies for staff-files bucket
-- ============================================================================

-- Service role has full access
CREATE POLICY "Service role full access to staff-files"
    ON storage.objects FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Users can read files from their organization
-- Path format: {organization_id}/{school_id}/{staff_id}/...
CREATE POLICY "Users can read their org staff-files"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'staff-files'
        AND (
            -- Extract organization_id from path (first segment)
            (storage.foldername(name))[1] = (
                SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
            )
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    );

-- Users can upload files to their organization's folder
CREATE POLICY "Users can upload to their org staff-files"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'staff-files'
        AND (
            -- Extract organization_id from path (first segment)
            (storage.foldername(name))[1] = (
                SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
            )
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    );

-- Users can update files in their organization's folder
CREATE POLICY "Users can update their org staff-files"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
        bucket_id = 'staff-files'
        AND (
            (storage.foldername(name))[1] = (
                SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
            )
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    )
    WITH CHECK (
        bucket_id = 'staff-files'
        AND (
            (storage.foldername(name))[1] = (
                SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
            )
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    );

-- Users can delete files from their organization's folder
CREATE POLICY "Users can delete their org staff-files"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'staff-files'
        AND (
            (storage.foldername(name))[1] = (
                SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
            )
            OR (
                (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
                AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            )
        )
    );

