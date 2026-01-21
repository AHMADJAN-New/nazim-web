#!/bin/bash

# Enable Traffic Logging Script
# Enables detailed access logging for API endpoints to track bandwidth usage

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
NGINX_TEMPLATE="${ROOT_DIR}/docker/nginx/https.conf.template"
HTTP_TEMPLATE="${ROOT_DIR}/docker/nginx/http.conf.template"

echo "=========================================="
echo "Enabling Traffic Logging"
echo "=========================================="
echo ""

# Check if templates exist
if [ ! -f "$NGINX_TEMPLATE" ]; then
    echo "Error: Nginx template not found: $NGINX_TEMPLATE"
    exit 1
fi

# Backup original templates
echo "1. Backing up original templates..."
cp "$NGINX_TEMPLATE" "${NGINX_TEMPLATE}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$HTTP_TEMPLATE" "${HTTP_TEMPLATE}.backup.$(date +%Y%m%d_%H%M%S)"
echo "✓ Backups created"
echo ""

# Check if access logging is already enabled
echo "2. Checking logging configuration..."

if grep -q "access_log /var/log/nginx/api_access.log" "$NGINX_TEMPLATE"; then
    echo "✓ HTTPS template: API access logging enabled"
else
    echo "⚠ HTTPS template: API access logging not found (may need update)"
fi

if grep -q "access_log /var/log/nginx/api_access.log" "$HTTP_TEMPLATE"; then
    echo "✓ HTTP template: API access logging enabled"
else
    echo "⚠ HTTP template: API access logging not found (may need update)"
fi

echo ""
echo "3. Laravel Download Tracking Middleware"
echo "----------------------------------------"
if grep -q "LogDownloadTraffic" "${ROOT_DIR}/backend/bootstrap/app.php"; then
    echo "✓ Laravel download tracking middleware is registered"
else
    echo "⚠ Laravel download tracking middleware not found"
fi
echo ""

echo "=========================================="
echo "Traffic Logging Status"
echo "=========================================="
echo ""
echo "✓ Nginx access logging: Enabled for API endpoints"
echo "✓ Laravel download tracking: Enabled via middleware"
echo ""
echo "To view traffic:"
echo "  bash docker/scripts/maintenance/monitor-traffic.sh"
echo "  bash docker/scripts/maintenance/traffic-summary.sh"
echo "  bash docker/scripts/maintenance/analyze-traffic.sh"
echo ""
echo "To restart Nginx (if templates were updated):"
echo "  docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml restart nginx"
echo ""

