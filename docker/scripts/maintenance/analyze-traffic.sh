#!/bin/bash

# Traffic Analysis Script
# Analyzes Nginx access logs and Laravel logs to identify bandwidth consumption

set -e

HOURS=${1:-1}  # Default to last 1 hour

echo "=========================================="
echo "Traffic Analysis (Last $HOURS hour(s))"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "1. Nginx Access Log Analysis"
echo "----------------------------------------"
NGINX_LOGS=$(docker logs nazim_prod_nginx --since ${HOURS}h 2>&1 | grep -E "GET|POST" | grep "/api/" || echo "")
if [ -n "$NGINX_LOGS" ]; then
    echo "Total API requests: $(echo "$NGINX_LOGS" | wc -l)"
    echo ""
    echo "Top 10 endpoints by request count:"
    echo "$NGINX_LOGS" | awk '{print $7}' | sort | uniq -c | sort -rn | head -10
    echo ""
    echo "Requests by HTTP method:"
    echo "$NGINX_LOGS" | awk '{print $6}' | sort | uniq -c | sort -rn
else
    echo -e "${YELLOW}No API access logs found. Enable logging first:${NC}"
    echo "  bash docker/scripts/maintenance/enable-traffic-logging.sh"
fi
echo ""

echo "2. Laravel Download Activity"
echo "----------------------------------------"
DOWNLOAD_COUNT=$(docker exec nazim_prod_php grep -c "File download tracked" /var/www/backend/storage/logs/laravel.log 2>/dev/null || echo "0")
DOWNLOAD_COUNT_OLD=$(docker exec nazim_prod_php grep -c "Serving report file\|Download request\|File download" /var/www/backend/storage/logs/laravel.log 2>/dev/null || echo "0")
TOTAL_DOWNLOADS=$((DOWNLOAD_COUNT + DOWNLOAD_COUNT_OLD))
echo "Total downloads (all time): $TOTAL_DOWNLOADS"
echo ""

# Recent downloads (using new middleware)
RECENT_DOWNLOADS=$(docker exec nazim_prod_php grep "File download tracked" /var/www/backend/storage/logs/laravel.log 2>/dev/null | tail -20 || echo "")
if [ -n "$RECENT_DOWNLOADS" ]; then
    echo "Recent download activity (with sizes):"
    echo "$RECENT_DOWNLOADS" | tail -10
    echo ""
    echo "Total size downloaded (recent):"
    TOTAL_SIZE=$(echo "$RECENT_DOWNLOADS" | grep -oE '"size_mb":"[0-9.]+"' | grep -oE '[0-9.]+' | awk '{sum+=$1} END {printf "%.2f MB\n", sum}')
    echo "  $TOTAL_SIZE"
else
    echo "No download activity found (downloads will be tracked going forward)"
fi
echo ""

echo "3. Report Generation & Downloads"
echo "----------------------------------------"
REPORT_GENERATIONS=$(docker exec nazim_prod_php grep -c "Report generation started\|generateReport" /var/www/backend/storage/logs/laravel.log 2>/dev/null || echo "0")
REPORT_DOWNLOADS=$(docker exec nazim_prod_php grep -c "File download tracked.*reports" /var/www/backend/storage/logs/laravel.log 2>/dev/null || echo "0")
REPORT_DOWNLOADS_OLD=$(docker exec nazim_prod_php grep -c "Serving report file" /var/www/backend/storage/logs/laravel.log 2>/dev/null || echo "0")
TOTAL_REPORT_DOWNLOADS=$((REPORT_DOWNLOADS + REPORT_DOWNLOADS_OLD))
echo "Total reports generated: $REPORT_GENERATIONS"
echo "Total reports downloaded: $TOTAL_REPORT_DOWNLOADS"
echo ""

# Show report download sizes if available
REPORT_DOWNLOADS_WITH_SIZE=$(docker exec nazim_prod_php grep "File download tracked.*reports" /var/www/backend/storage/logs/laravel.log 2>/dev/null | tail -10 || echo "")
if [ -n "$REPORT_DOWNLOADS_WITH_SIZE" ]; then
    echo "Recent report downloads:"
    echo "$REPORT_DOWNLOADS_WITH_SIZE" | tail -5
fi
echo ""

echo "4. Large File Operations"
echo "----------------------------------------"
LARGE_OPS=$(docker exec nazim_prod_php grep -iE "file.*[0-9]+.*MB|download.*[0-9]+.*MB|size.*[0-9]+" /var/www/backend/storage/logs/laravel.log 2>/dev/null | tail -20 || echo "")
if [ -n "$LARGE_OPS" ]; then
    echo "Recent large file operations:"
    echo "$LARGE_OPS" | tail -10
else
    echo "No large file operations found in logs"
fi
echo ""

echo "5. API Endpoint Summary"
echo "----------------------------------------"
API_ENDPOINTS=$(docker exec nazim_prod_php grep -oE "(/api/[^ ]+)" /var/www/backend/storage/logs/laravel.log 2>/dev/null | tail -100 | sort | uniq -c | sort -rn | head -15 || echo "")
if [ -n "$API_ENDPOINTS" ]; then
    echo "Most accessed API endpoints:"
    echo "$API_ENDPOINTS"
else
    echo "No API endpoint patterns found"
fi
echo ""

echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "To get more detailed analysis:"
echo "1. Enable Nginx access logging: bash docker/scripts/maintenance/enable-traffic-logging.sh"
echo "2. Check system network stats: vnstat -h"
echo "3. Monitor real-time: docker logs -f nazim_prod_nginx | grep '/api/'"
echo ""

