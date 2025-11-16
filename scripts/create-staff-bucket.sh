#!/bin/bash

# Script to create staff-files storage bucket via Supabase Storage API
# Usage: ./create-staff-bucket.sh

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check for required environment variables
if [ -z "$VITE_SUPABASE_URL" ]; then
    echo "Error: VITE_SUPABASE_URL not set"
    exit 1
fi

if [ -z "$VITE_SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "Error: VITE_SUPABASE_SERVICE_ROLE_KEY not set"
    echo "Note: This script requires the SERVICE_ROLE_KEY (not anon key)"
    exit 1
fi

PROJECT_URL="$VITE_SUPABASE_URL"
SERVICE_ROLE_KEY="$VITE_SUPABASE_SERVICE_ROLE_KEY"

echo "Creating staff-files storage bucket..."

# Create the bucket
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${PROJECT_URL}/storage/v1/bucket" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
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
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

case "$HTTP_CODE" in
  201)
    echo "✅ Bucket created successfully!"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    ;;
  409)
    echo "ℹ️  Bucket already exists (this is OK)"
    ;;
  401|403)
    echo "❌ Error: Unauthorized - check your SERVICE_ROLE_KEY"
    exit 1
    ;;
  *)
    echo "❌ Error: HTTP $HTTP_CODE"
    echo "$BODY"
    exit 1
    ;;
esac

echo ""
echo "Next step: Run the migration 20250127130008_create_staff_storage_bucket.sql"
echo "to create the storage policies (RLS) for the bucket."

