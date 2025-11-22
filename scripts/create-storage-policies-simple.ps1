$PROJECT_URL = "https://obmzfcbszojzhaazafat.supabase.co"
$SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ibXpmY2Jzem9qemhhYXphZmF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIxODc2NywiZXhwIjoyMDc4Nzk0NzY3fQ.AOP6MvSchNoEiz3GZUxRJODGiNCuBH8hYIoTLg2mb6w"

$headers = @{
    "apikey" = $SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

Write-Host "Creating storage policies..." -ForegroundColor Cyan

$policies = @(
    @{
        name = "Upload"
        sql = 'CREATE POLICY IF NOT EXISTS "Users can upload staff files in their organization" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''staff-files'' AND ((storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()) OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL))'
    },
    @{
        name = "Read"
        sql = 'CREATE POLICY IF NOT EXISTS "Users can read staff files in their organization" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''staff-files'' AND ((storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()) OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL))'
    },
    @{
        name = "Update"
        sql = 'CREATE POLICY IF NOT EXISTS "Users can update staff files in their organization" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = ''staff-files'' AND ((storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()) OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL))'
    },
    @{
        name = "Delete"
        sql = 'CREATE POLICY IF NOT EXISTS "Users can delete staff files in their organization" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''staff-files'' AND ((storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()) OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL))'
    },
    @{
        name = "Service Role"
        sql = 'CREATE POLICY IF NOT EXISTS "Service role full access to staff files" ON storage.objects FOR ALL TO service_role USING (bucket_id = ''staff-files'') WITH CHECK (bucket_id = ''staff-files'')'
    }
)

foreach ($policy in $policies) {
    Write-Host "Creating $($policy.name) policy..." -ForegroundColor Yellow
    $body = @{ query = $policy.sql } | ConvertTo-Json -Compress
    
    try {
        $response = Invoke-RestMethod -Uri "$PROJECT_URL/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body
        Write-Host "  Success" -ForegroundColor Green
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  Failed: HTTP $statusCode" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "  $($_.ErrorDetails.Message)" -ForegroundColor Gray
        }
    }
}

Write-Host "Complete" -ForegroundColor Cyan

