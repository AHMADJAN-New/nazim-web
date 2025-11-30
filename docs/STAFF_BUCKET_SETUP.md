# Staff Files Storage Bucket Setup

This guide explains how to create the `staff-files` storage bucket for the staff management system.

## Overview

The staff management system requires a storage bucket to store:
- Staff profile pictures
- Staff documents (CVs, certificates, contracts, etc.)

The bucket is **private** and uses Row-Level Security (RLS) policies for organization-based access control.

## Prerequisites

- Supabase project with Storage enabled
- Service Role Key (not the anon key)
- Environment variables configured

## Method 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the sidebar
3. Click **New Bucket**
4. Configure the bucket:
   - **Name**: `staff-files`
   - **Public**: `No` (Private bucket)
   - **File size limit**: `10485760` (10 MB)
   - **Allowed MIME types**: 
     - `image/jpeg`
     - `image/png`
     - `image/gif`
     - `image/webp`
     - `application/pdf`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `application/vnd.ms-excel`
     - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
5. Click **Create bucket**

## Method 2: Using Storage API (Script)

### Bash (Linux/Mac)

```bash
cd scripts
chmod +x create-staff-bucket.sh
./create-staff-bucket.sh
```

### PowerShell (Windows)

```powershell
cd scripts
.\create-staff-bucket.ps1
```

### Manual cURL Command

```bash
curl -X POST "<PROJECT_URL>/storage/v1/bucket" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "staff-files",
    "name": "staff-files",
    "public": false,
    "file_size_limit": 10485760,
    "allowed_mime_types": [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ]
  }'
```

**Replace:**
- `<PROJECT_URL>` with your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- `<SERVICE_ROLE_KEY>` with your Supabase Service Role Key

**Expected Responses:**
- `201 Created` — Bucket created successfully
- `409 Conflict` — Bucket already exists (this is OK)
- `401/403` — Invalid or unauthorized service key

## Method 3: Using SQL (Alternative)

**Note:** This method may not work in all Supabase setups. Use Method 1 or 2 if possible.

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'staff-files',
    'staff-files',
    false,
    10485760,
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
```

## After Creating the Bucket

1. **Run the migration** `20250127130008_create_staff_storage_bucket.sql` to create the RLS policies
2. **Verify the bucket** exists in your Supabase Dashboard under Storage
3. **Test file upload** using the `useUploadStaffPicture` or `useUploadStaffDocument` hooks

## Storage Path Structure

Files are stored with the following path structure:
```
{organization_id}/{staff_id}/{file_type}/{filename}
```

Example:
```
550e8400-e29b-41d4-a716-446655440000/123e4567-e89b-12d3-a456-426614174000/picture/profile.jpg
550e8400-e29b-41d4-a716-446655440000/123e4567-e89b-12d3-a456-426614174000/documents/cv.pdf
```

## Security

- **Private bucket**: Files are not publicly accessible
- **RLS policies**: Users can only access files from their organization
- **Super admin access**: Super admins can access files from all organizations
- **Organization isolation**: Files are automatically isolated by organization_id

## Troubleshooting

### Bucket Already Exists (409)
This is normal if the bucket was already created. You can proceed to run the migration.

### Unauthorized (401/403)
- Verify you're using the **Service Role Key**, not the anon key
- Check that the key is correct in your environment variables
- Ensure the key has not been rotated

### Migration Fails
- Ensure the bucket exists before running the migration
- Check that RLS is enabled on the `storage.objects` table
- Verify the bucket name matches exactly: `staff-files`

## Related Files

- Migration: `supabase/migrations/20250127130008_create_staff_storage_bucket.sql`
- Hooks: `src/hooks/useStaff.tsx` (upload functions)
- Scripts: `scripts/create-staff-bucket.sh` and `scripts/create-staff-bucket.ps1`

