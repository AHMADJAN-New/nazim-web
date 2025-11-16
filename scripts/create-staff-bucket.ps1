# PowerShell script to create staff-files storage bucket via Supabase Storage API
# Usage: .\create-staff-bucket.ps1

# Load environment variables from .env file
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Check for required environment variables
if (-not $env:VITE_SUPABASE_URL) {
    Write-Host "Error: VITE_SUPABASE_URL not set" -ForegroundColor Red
    exit 1
}

if (-not $env:VITE_SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "Error: VITE_SUPABASE_SERVICE_ROLE_KEY not set" -ForegroundColor Red
    Write-Host "Note: This script requires the SERVICE_ROLE_KEY (not anon key)" -ForegroundColor Yellow
    exit 1
}

$PROJECT_URL = $env:VITE_SUPABASE_URL
$SERVICE_ROLE_KEY = $env:VITE_SUPABASE_SERVICE_ROLE_KEY

Write-Host "Creating staff-files storage bucket..." -ForegroundColor Cyan

# Prepare the request body
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
} | ConvertTo-Json

# Create the bucket
try {
    $headers = @{
        "apikey" = $SERVICE_ROLE_KEY
        "Authorization" = "Bearer $SERVICE_ROLE_KEY"
        "Content-Type" = "application/json"
    }

    $response = Invoke-WebRequest -Uri "$PROJECT_URL/storage/v1/bucket" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop

    Write-Host "✅ Bucket created successfully!" -ForegroundColor Green
    Write-Host ($response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10)
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    switch ($statusCode) {
        409 {
            Write-Host "ℹ️  Bucket already exists (this is OK)" -ForegroundColor Yellow
        }
        401 {
            Write-Host "❌ Error: Unauthorized - check your SERVICE_ROLE_KEY" -ForegroundColor Red
            exit 1
        }
        403 {
            Write-Host "❌ Error: Forbidden - check your SERVICE_ROLE_KEY" -ForegroundColor Red
            exit 1
        }
        default {
            Write-Host "❌ Error: HTTP $statusCode" -ForegroundColor Red
            Write-Host $_.Exception.Message
            exit 1
        }
    }
}

Write-Host ""
Write-Host "Next step: Run the migration 20250127130008_create_staff_storage_bucket.sql" -ForegroundColor Cyan
Write-Host "to create the storage policies (RLS) for the bucket." -ForegroundColor Cyan

