# Create storage policies for staff-files bucket using PowerShell/curl
# Note: These policies must be created via SQL execution

$PROJECT_URL = "https://obmzfcbszojzhaazafat.supabase.co"
$SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ibXpmY2Jzem9qemhhYXphZmF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIxODc2NywiZXhwIjoyMDc4Nzk0NzY3fQ.AOP6MvSchNoEiz3GZUxRJODGiNCuBH8hYIoTLg2mb6w"

$headers = @{
    "apikey" = $SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

Write-Host "Creating storage policies for staff-files bucket..." -ForegroundColor Cyan

# Policy 1: Upload
Write-Host "Creating upload policy..." -ForegroundColor Yellow
$sql1 = 'CREATE POLICY IF NOT EXISTS "Users can upload staff files in their organization" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''staff-files'' AND ((storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()) OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL))'
$body1 = @{ query = $sql1 } | ConvertTo-Json -Compress

try {
    $response1 = Invoke-RestMethod -Uri "$PROJECT_URL/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body1
    Write-Host "  ✓ Upload policy created" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Upload policy failed: $($_.Exception.Message)" -ForegroundColor Yellow
    if ($_.ErrorDetails.Message) { Write-Host "    Details: $($_.ErrorDetails.Message)" -ForegroundColor Gray }
}

# Policy 2: Read
Write-Host "Creating read policy..." -ForegroundColor Yellow
$sql2 = 'CREATE POLICY IF NOT EXISTS "Users can read staff files in their organization" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''staff-files'' AND ((storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()) OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL))'
$body2 = @{ query = $sql2 } | ConvertTo-Json -Compress

try {
    $response2 = Invoke-RestMethod -Uri "$PROJECT_URL/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body2
    Write-Host "  ✓ Read policy created" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Read policy failed: $($_.Exception.Message)" -ForegroundColor Yellow
    if ($_.ErrorDetails.Message) { Write-Host "    Details: $($_.ErrorDetails.Message)" -ForegroundColor Gray }
}

# Policy 3: Update
Write-Host "Creating update policy..." -ForegroundColor Yellow
$sql3 = 'CREATE POLICY IF NOT EXISTS "Users can update staff files in their organization" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = ''staff-files'' AND ((storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()) OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL))'
$body3 = @{ query = $sql3 } | ConvertTo-Json -Compress

try {
    $response3 = Invoke-RestMethod -Uri "$PROJECT_URL/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body3
    Write-Host "  ✓ Update policy created" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Update policy failed: $($_.Exception.Message)" -ForegroundColor Yellow
    if ($_.ErrorDetails.Message) { Write-Host "    Details: $($_.ErrorDetails.Message)" -ForegroundColor Gray }
}

# Policy 4: Delete
Write-Host "Creating delete policy..." -ForegroundColor Yellow
$sql4 = 'CREATE POLICY IF NOT EXISTS "Users can delete staff files in their organization" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''staff-files'' AND ((storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()) OR (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL))'
$body4 = @{ query = $sql4 } | ConvertTo-Json -Compress

try {
    $response4 = Invoke-RestMethod -Uri "$PROJECT_URL/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body4
    Write-Host "  ✓ Delete policy created" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Delete policy failed: $($_.Exception.Message)" -ForegroundColor Yellow
    if ($_.ErrorDetails.Message) { Write-Host "    Details: $($_.ErrorDetails.Message)" -ForegroundColor Gray }
}

# Policy 5: Service role
Write-Host "Creating service role policy..." -ForegroundColor Yellow
$sql5 = 'CREATE POLICY IF NOT EXISTS "Service role full access to staff files" ON storage.objects FOR ALL TO service_role USING (bucket_id = ''staff-files'') WITH CHECK (bucket_id = ''staff-files'')'
$body5 = @{ query = $sql5 } | ConvertTo-Json -Compress

try {
    $response5 = Invoke-RestMethod -Uri "$PROJECT_URL/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body5
    Write-Host "  ✓ Service role policy created" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Service role policy failed: $($_.Exception.Message)" -ForegroundColor Yellow
    if ($_.ErrorDetails.Message) { Write-Host "    Details: $($_.ErrorDetails.Message)" -ForegroundColor Gray }
}

Write-Host ""
Write-Host "Done! If any policies failed, create them via Supabase Dashboard SQL Editor." -ForegroundColor Cyan
