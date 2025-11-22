# Create storage policies for staff-files bucket using Supabase REST API
# This script executes SQL via the Supabase PostgREST API

$PROJECT_URL = "https://obmzfcbszojzhaazafat.supabase.co"
$SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ibXpmY2Jzem9qemhhYXphZmF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIxODc2NywiZXhwIjoyMDc4Nzk0NzY3fQ.AOP6MvSchNoEiz3GZUxRJODGiNCuBH8hYIoTLg2mb6w"

$headers = @{
    "apikey" = $SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=minimal"
}

Write-Host "Creating storage policies for staff-files bucket..." -ForegroundColor Cyan

# SQL statements to create policies
$policies = @(
    @{
        name = "Users can upload staff files in their organization"
        sql = "CREATE POLICY IF NOT EXISTS `"Users can upload staff files in their organization`" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'staff-files' AND ((storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()) OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL))"
    },
    @{
        name = "Users can read staff files in their organization"
        sql = "CREATE POLICY IF NOT EXISTS `"Users can read staff files in their organization`" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'staff-files' AND ((storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()) OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL))"
    },
    @{
        name = "Users can update staff files in their organization"
        sql = "CREATE POLICY IF NOT EXISTS `"Users can update staff files in their organization`" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'staff-files' AND ((storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()) OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL))"
    },
    @{
        name = "Users can delete staff files in their organization"
        sql = "CREATE POLICY IF NOT EXISTS `"Users can delete staff files in their organization`" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'staff-files' AND ((storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()) OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL))"
    },
    @{
        name = "Service role full access to staff files"
        sql = "CREATE POLICY IF NOT EXISTS `"Service role full access to staff files`" ON storage.objects FOR ALL TO service_role USING (bucket_id = 'staff-files') WITH CHECK (bucket_id = 'staff-files')"
    }
)

# Execute each policy creation via SQL endpoint
foreach ($policy in $policies) {
    Write-Host "Creating policy: $($policy.name)..." -ForegroundColor Yellow
    
    $body = @{
        query = $policy.sql
    } | ConvertTo-Json

    try {
        # Use Supabase's SQL execution endpoint (if available)
        # Note: This might need to be done via Dashboard SQL Editor if API doesn't support it
        $response = Invoke-RestMethod -Uri "$PROJECT_URL/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body -ErrorAction Stop
        Write-Host "  ✓ Policy created successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "  ⚠ Note: Direct SQL execution via API may not be available" -ForegroundColor Yellow
        Write-Host "  SQL to execute manually:" -ForegroundColor Cyan
        Write-Host "  $($policy.sql)" -ForegroundColor Gray
    }
}

Write-Host "`nNote: If API execution failed, run the SQL statements above in Supabase Dashboard SQL Editor" -ForegroundColor Yellow

