#!/bin/bash

# Create storage policies for staff-files bucket using curl
# Note: These policies must be created via SQL execution

PROJECT_URL="https://obmzfcbszojzhaazafat.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ibXpmY2Jzem9qemhhYXphZmF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIxODc2NywiZXhwIjoyMDc4Nzk0NzY3fQ.AOP6MvSchNoEiz3GZUxRJODGiNCuBH8hYIoTLg2mb6w"

echo "Creating storage policies for staff-files bucket..."

# Policy 1: Upload
echo "Creating upload policy..."
curl -X POST "${PROJECT_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "CREATE POLICY IF NOT EXISTS \"Users can upload staff files in their organization\" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = '\''staff-files'\'' AND ((storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()) OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL))"
  }'

# Policy 2: Read
echo "Creating read policy..."
curl -X POST "${PROJECT_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "CREATE POLICY IF NOT EXISTS \"Users can read staff files in their organization\" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = '\''staff-files'\'' AND ((storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()) OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL))"
  }'

# Policy 3: Update
echo "Creating update policy..."
curl -X POST "${PROJECT_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "CREATE POLICY IF NOT EXISTS \"Users can update staff files in their organization\" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = '\''staff-files'\'' AND ((storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()) OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL))"
  }'

# Policy 4: Delete
echo "Creating delete policy..."
curl -X POST "${PROJECT_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "CREATE POLICY IF NOT EXISTS \"Users can delete staff files in their organization\" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = '\''staff-files'\'' AND ((storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()) OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL))"
  }'

# Policy 5: Service role
echo "Creating service role policy..."
curl -X POST "${PROJECT_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "CREATE POLICY IF NOT EXISTS \"Service role full access to staff files\" ON storage.objects FOR ALL TO service_role USING (bucket_id = '\''staff-files'\'') WITH CHECK (bucket_id = '\''staff-files'\'')"
  }'

echo "Done!"

