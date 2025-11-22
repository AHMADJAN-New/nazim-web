# Create staff-files bucket with service role key
$PROJECT_URL = "https://obmzfcbszojzhaazafat.supabase.co"
$SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ibXpmY2Jzem9qemhhYXphZmF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIxODc2NywiZXhwIjoyMDc4Nzk0NzY3fQ.AOP6MvSchNoEiz3GZUxRJODGiNCuBH8hYIoTLg2mb6w"

$headers = @{
    "apikey" = $SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

$body = @{
    id = "staff-files"
    name = "staff-files"
    public = $false
    file_size_limit = 10485760
    allowed_mime_types = @(
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
} | ConvertTo-Json -Depth 10

Write-Host "Creating staff-files bucket..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "$PROJECT_URL/storage/v1/bucket" -Method POST -Headers $headers -Body $body
    Write-Host "Success: HTTP $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 409) {
        Write-Host "Bucket already exists (409) - This is OK!" -ForegroundColor Yellow
    }
    else {
        Write-Host "Error: HTTP $statusCode" -ForegroundColor Red
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}
