#!/bin/bash

# Traffic Monitoring Script for Nazim Production
# Analyzes traffic patterns and identifies bandwidth consumption

set -e

echo "=========================================="
echo "Nazim Traffic Monitoring"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if containers are running
if ! docker ps | grep -q nazim_prod_nginx; then
    echo -e "${RED}Error: Nginx container is not running${NC}"
    exit 1
fi

if ! docker ps | grep -q nazim_prod_php; then
    echo -e "${RED}Error: PHP container is not running${NC}"
    exit 1
fi

echo "1. System Network Statistics (Last Hour)"
echo "----------------------------------------"
# Get network stats from system
if command -v vnstat >/dev/null 2>&1; then
    echo "Hourly network usage:"
    vnstat -h | tail -5
else
    echo "vnstat not installed. Install with: sudo apt install vnstat"
fi
echo ""

echo "2. Docker Container Network Stats"
echo "----------------------------------------"
docker stats --no-stream --format "table {{.Container}}\t{{.NetIO}}" | grep nazim_prod
echo ""

echo "3. Nginx Access Log Analysis (Last Hour)"
echo "----------------------------------------"
# Check if Nginx has access logs
NGINX_LOGS=$(docker logs nazim_prod_nginx --since 1h 2>&1 | grep -E "GET|POST" | tail -100 || echo "")
if [ -n "$NGINX_LOGS" ]; then
    echo "Top 20 endpoints by request count:"
    echo "$NGINX_LOGS" | awk '{print $7}' | sort | uniq -c | sort -rn | head -20
    echo ""
    echo "Top 20 endpoints by response size (if available):"
    echo "$NGINX_LOGS" | awk '{print $7, $10}' | sort -k2 -rn | head -20
else
    echo "No access logs found in Nginx container logs"
    echo "Note: Nginx access logs may be disabled for static files"
fi
echo ""

echo "4. Laravel Download Tracking (Last Hour)"
echo "----------------------------------------"
# Check Laravel logs for download activity
DOWNLOAD_LOGS=$(docker exec nazim_prod_php grep -i "download\|Serving report\|Download request\|File download" /var/www/backend/storage/logs/laravel.log 2>/dev/null | tail -50 || echo "")
if [ -n "$DOWNLOAD_LOGS" ]; then
    echo "Recent download activity:"
    echo "$DOWNLOAD_LOGS" | tail -20
    echo ""
    echo "Download count by endpoint:"
    echo "$DOWNLOAD_LOGS" | grep -oE "(/api/[^ ]+)" | sort | uniq -c | sort -rn | head -10
else
    echo "No download activity found in Laravel logs"
fi
echo ""

echo "5. Report Download Analysis"
echo "----------------------------------------"
REPORT_DOWNLOADS=$(docker exec nazim_prod_php grep -c "File download tracked.*reports" /var/www/backend/storage/logs/laravel.log 2>/dev/null || echo "0")
REPORT_DOWNLOADS_OLD=$(docker exec nazim_prod_php grep -c "Serving report file\|Download request.*report" /var/www/backend/storage/logs/laravel.log 2>/dev/null || echo "0")
TOTAL_REPORTS=$((REPORT_DOWNLOADS + REPORT_DOWNLOADS_OLD))
echo "Total report downloads (all time): $TOTAL_REPORTS"
echo ""

# Show recent report downloads with sizes
RECENT_REPORTS=$(docker exec nazim_prod_php grep "File download tracked.*reports" /var/www/backend/storage/logs/laravel.log 2>/dev/null | tail -10 || echo "")
if [ -n "$RECENT_REPORTS" ]; then
    echo "Recent report downloads:"
    echo "$RECENT_REPORTS" | tail -5
fi
echo ""

echo "6. Large File Downloads (Last Hour)"
echo "----------------------------------------"
# Check for large file operations
LARGE_FILES=$(docker exec nazim_prod_php grep -i "file.*download\|download.*file" /var/www/backend/storage/logs/laravel.log 2>/dev/null | tail -20 || echo "")
if [ -n "$LARGE_FILES" ]; then
    echo "Recent large file operations:"
    echo "$LARGE_FILES"
else
    echo "No large file operations found"
fi
echo ""

echo "7. API Endpoint Usage (Last Hour)"
echo "----------------------------------------"
# Analyze API endpoint usage from Laravel logs
API_REQUESTS=$(docker exec nazim_prod_php grep -E "GET|POST|PUT|DELETE" /var/www/backend/storage/logs/laravel.log 2>/dev/null | grep -oE "(/api/[^ ]+)" | tail -100 | sort | uniq -c | sort -rn | head -20 || echo "")
if [ -n "$API_REQUESTS" ]; then
    echo "Top API endpoints by request count:"
    echo "$API_REQUESTS"
else
    echo "No API request patterns found"
fi
echo ""

echo "8. Network Interface Statistics"
echo "----------------------------------------"
if [ -f /proc/net/dev ]; then
    echo "Network interface stats:"
    cat /proc/net/dev | grep -E "eth0|ens|enp" | awk '{printf "Interface: %s | RX: %s bytes | TX: %s bytes\n", $1, $2, $10}'
else
    echo "Cannot read /proc/net/dev"
fi
echo ""

echo "=========================================="
echo "Recommendations"
echo "=========================================="
echo ""
echo "To get more detailed traffic analysis:"
echo ""
echo "1. Enable Nginx access logging for API endpoints"
echo "2. Add download size tracking in Laravel middleware"
echo "3. Monitor specific endpoints: /api/reports/*/download"
echo "4. Check if reports are being auto-downloaded or cached"
echo ""
echo "To enable detailed logging, run:"
echo "  bash docker/scripts/maintenance/enable-traffic-logging.sh"
echo ""

