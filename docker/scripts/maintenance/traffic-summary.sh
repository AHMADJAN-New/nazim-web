#!/bin/bash

# Quick Traffic Summary Script
# Shows bandwidth consumption summary

set -e

HOURS=${1:-1}

echo "=========================================="
echo "Traffic Summary (Last $HOURS hour(s))"
echo "=========================================="
echo ""

# Get download logs from Laravel
DOWNLOAD_LOGS=$(docker exec nazim_prod_php grep "File download tracked" /var/www/backend/storage/logs/laravel.log 2>/dev/null | tail -1000 || echo "")

if [ -z "$DOWNLOAD_LOGS" ]; then
    echo "No download tracking data found."
    echo "Downloads will be tracked automatically going forward."
    exit 0
fi

echo "1. Total Downloads"
echo "----------------------------------------"
TOTAL_DOWNLOADS=$(echo "$DOWNLOAD_LOGS" | wc -l)
echo "Total tracked downloads: $TOTAL_DOWNLOADS"
echo ""

echo "2. Total Bandwidth Consumed"
echo "----------------------------------------"
# Extract size_mb values and sum them
TOTAL_MB=$(echo "$DOWNLOAD_LOGS" | grep -oE '"size_mb":"[0-9.]+"' | grep -oE '[0-9.]+' | awk '{sum+=$1} END {printf "%.2f", sum}')
if [ -n "$TOTAL_MB" ] && [ "$TOTAL_MB" != "0" ]; then
    TOTAL_GB=$(echo "$TOTAL_MB" | awk '{printf "%.2f", $1/1024}')
    echo "Total downloaded: ${TOTAL_MB} MB (${TOTAL_GB} GB)"
else
    echo "Total downloaded: Unable to calculate (check logs)"
fi
echo ""

echo "3. Top 10 Endpoints by Download Count"
echo "----------------------------------------"
echo "$DOWNLOAD_LOGS" | grep -oE '"endpoint":"[^"]+"' | sort | uniq -c | sort -rn | head -10 | awk '{printf "  %3d downloads: %s\n", $1, $2}'
echo ""

echo "4. Top 10 Endpoints by Total Size"
echo "----------------------------------------"
# Group by endpoint and sum sizes
echo "$DOWNLOAD_LOGS" | grep -oE '"endpoint":"[^"]+".*"size_mb":"[0-9.]+"' | \
    sed 's/"endpoint":"\([^"]*\)".*"size_mb":"\([0-9.]*\)"/\1 \2/' | \
    awk '{sum[$1]+=$2; count[$1]++} END {for (i in sum) printf "%.2f MB (%d downloads): %s\n", sum[i], count[i], i}' | \
    sort -rn | head -10
echo ""

echo "5. Downloads by User"
echo "----------------------------------------"
echo "$DOWNLOAD_LOGS" | grep -oE '"user_email":"[^"]+"' | sort | uniq -c | sort -rn | head -10 | awk '{printf "  %3d downloads: %s\n", $1, $2}'
echo ""

echo "6. File Types Downloaded"
echo "----------------------------------------"
echo "$DOWNLOAD_LOGS" | grep -oE '"content_type":"[^"]+"' | sort | uniq -c | sort -rn | head -10 | awk '{printf "  %3d files: %s\n", $1, $2}'
echo ""

echo "=========================================="
echo "For detailed analysis, run:"
echo "  bash docker/scripts/maintenance/analyze-traffic.sh"
echo ""

