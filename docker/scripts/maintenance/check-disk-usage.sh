#!/bin/bash

# Disk Usage Diagnostic Script for Nazim Production
# This script helps identify what's consuming disk space on your server

set -e

echo "=========================================="
echo "Nazim Disk Usage Diagnostic"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Function to format bytes to human readable
format_size() {
    local bytes=$1
    if [ $bytes -ge 1073741824 ]; then
        echo "$(echo "scale=2; $bytes/1073741824" | bc)GB"
    elif [ $bytes -ge 1048576 ]; then
        echo "$(echo "scale=2; $bytes/1048576" | bc)MB"
    elif [ $bytes -ge 1024 ]; then
        echo "$(echo "scale=2; $bytes/1024" | bc)KB"
    else
        echo "${bytes}B"
    fi
}

echo "1. Overall Disk Usage"
echo "-------------------"
df -h | grep -E '^/dev/'
echo ""

echo "2. Docker System Disk Usage"
echo "-------------------"
docker system df -v
echo ""

echo "3. Docker Images (sorted by size)"
echo "-------------------"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | head -20
echo ""

echo "4. Docker Containers (all, including stopped)"
echo "-------------------"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
echo ""

echo "5. Docker Volumes Size"
echo "-------------------"
echo "Checking named volumes..."
for volume in $(docker volume ls -q | grep nazim); do
    size=$(docker system df -v | grep "$volume" | awk '{print $3}' || echo "0")
    echo "  - $volume: $size"
done
echo ""

echo "6. Detailed Volume Inspection"
echo "-------------------"
echo "PostgreSQL data volume (nazim_pg_data):"
docker run --rm -v nazim_pg_data:/data alpine sh -c "du -sh /data 2>/dev/null || echo 'Volume not accessible'"
echo ""

echo "Backend storage volume (nazim_backend_storage):"
docker run --rm -v nazim_backend_storage:/data alpine sh -c "du -sh /data 2>/dev/null || echo 'Volume not accessible'"
echo ""

echo "Redis data volume (nazim_redis_data):"
docker run --rm -v nazim_redis_data:/data alpine sh -c "du -sh /data 2>/dev/null || echo 'Volume not accessible'"
echo ""

echo "Let's Encrypt volume (nazim_letsencrypt):"
docker run --rm -v nazim_letsencrypt:/data alpine sh -c "du -sh /data 2>/dev/null || echo 'Volume not accessible'"
echo ""

echo "7. Docker Build Cache"
echo "-------------------"
docker builder du 2>/dev/null || echo "Build cache info not available"
echo ""

echo "8. Large Files in Application Storage"
echo "-------------------"
if docker exec nazim_prod_php test -d /var/www/backend/storage 2>/dev/null; then
    echo "Top 20 largest files/directories in storage:"
    docker exec nazim_prod_php find /var/www/backend/storage -type f -exec du -h {} + 2>/dev/null | sort -rh | head -20 || echo "Could not access storage"
else
    echo "Storage directory not accessible"
fi
echo ""

echo "9. Log Files Size"
echo "-------------------"
echo "Docker container logs:"
docker ps --format "{{.Names}}" | while read container; do
    log_size=$(docker inspect --format='{{.LogPath}}' "$container" 2>/dev/null | xargs -I {} sh -c 'test -f {} && du -h {} || echo "0"' 2>/dev/null || echo "0")
    if [ "$log_size" != "0" ]; then
        echo "  - $container: $log_size"
    fi
done
echo ""

echo "10. Unused Docker Resources"
echo "-------------------"
echo "Dangling images (untagged):"
docker images -f "dangling=true" -q | wc -l | xargs echo "  Count:"
echo ""

echo "Stopped containers:"
docker ps -a -f "status=exited" -q | wc -l | xargs echo "  Count:"
echo ""

echo "Unused volumes:"
docker volume ls -f "dangling=true" -q | wc -l | xargs echo "  Count:"
echo ""

echo "=========================================="
echo "Summary & Recommendations"
echo "=========================================="
echo ""
echo "To free up space, you can run:"
echo ""
echo "  # Remove unused containers, networks, images (dangling), and build cache:"
echo "  ${YELLOW}docker system prune -a${NC}"
echo ""
echo "  # Remove only stopped containers:"
echo "  ${YELLOW}docker container prune${NC}"
echo ""
echo "  # Remove unused images:"
echo "  ${YELLOW}docker image prune -a${NC}"
echo ""
echo "  # Remove unused volumes (BE CAREFUL - this removes volumes not used by any container):"
echo "  ${YELLOW}docker volume prune${NC}"
echo ""
echo "  # Remove build cache:"
echo "  ${YELLOW}docker builder prune -a${NC}"
echo ""
echo "  # Clean up old logs (keeps last 100MB per container):"
echo "  ${YELLOW}docker exec nazim_prod_php truncate -s 0 /var/lib/docker/containers/*/*-json.log${NC}"
echo ""
echo "  # Or configure log rotation in docker-compose.prod.yml:"
echo "  ${YELLOW}# Add to each service:${NC}"
echo "  ${YELLOW}logging:${NC}"
echo "  ${YELLOW}  driver: \"json-file\"${NC}"
echo "  ${YELLOW}  options:${NC}"
echo "  ${YELLOW}    max-size: \"10m\"${NC}"
echo "  ${YELLOW}    max-file: \"3\"${NC}"
echo ""


