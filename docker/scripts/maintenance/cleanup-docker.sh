#!/bin/bash

# Docker Cleanup Script for Nazim Production
# PRODUCTION-SAFE: Protects database and application storage volumes
# Only removes: stopped containers, unused images, build cache, logs
# NEVER removes: database volumes, application storage, SSL certificates

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Protected volumes - NEVER remove these (production-critical)
PROTECTED_VOLUMES=(
    "nazim_pg_data"           # Database data - CRITICAL!
    "nazim_backend_storage"    # Application storage (reports, uploads) - CRITICAL!
    "nazim_redis_data"         # Redis data
    "nazim_letsencrypt"        # SSL certificates - CRITICAL!
    "nazim_certbot_www"        # Certbot webroot
)

echo "=========================================="
echo "Nazim Production-Safe Docker Cleanup"
echo "=========================================="
echo ""
echo -e "${BLUE}Protected Volumes (will NOT be touched):${NC}"
for vol in "${PROTECTED_VOLUMES[@]}"; do
    echo "  ✓ $vol"
done
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}Warning: Some operations may require sudo privileges${NC}"
    echo ""
fi

# Show current disk usage
echo "Current Docker disk usage:"
docker system df
echo ""

# Ask for confirmation
read -p "Proceed with production-safe cleanup? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "Starting production-safe cleanup..."
echo ""

# 1. Remove stopped containers
echo "1. Removing stopped containers..."
stopped_count=$(docker ps -a -f "status=exited" -q | wc -l)
if [ "$stopped_count" -gt 0 ]; then
    docker container prune -f
    echo -e "${GREEN}✓ Removed stopped containers${NC}"
else
    echo "  No stopped containers to remove"
fi
echo ""

# 2. Remove dangling images (untagged)
echo "2. Removing dangling images..."
dangling_count=$(docker images -f "dangling=true" -q | wc -l)
if [ "$dangling_count" -gt 0 ]; then
    docker image prune -f
    echo -e "${GREEN}✓ Removed dangling images${NC}"
else
    echo "  No dangling images to remove"
fi
echo ""

# 3. Remove unused images (not used by any container)
echo "3. Removing unused images..."
read -p "  Remove ALL unused images (not just dangling)? This may remove old image versions. (yes/no): " remove_all
if [ "$remove_all" = "yes" ]; then
    docker image prune -a -f
    echo -e "${GREEN}✓ Removed unused images${NC}"
else
    echo "  Skipped (only dangling images removed)"
fi
echo ""

# 4. Remove build cache
echo "4. Removing build cache..."
echo "  This may slow down future builds but frees significant space"
read -p "  Remove build cache? (yes/no): " remove_cache
if [ "$remove_cache" = "yes" ]; then
    docker builder prune -a -f
    echo -e "${GREEN}✓ Removed build cache${NC}"
else
    echo "  Skipped (build cache preserved)"
fi
echo ""

# 5. Remove unused networks
echo "5. Removing unused networks..."
docker network prune -f
echo -e "${GREEN}✓ Removed unused networks${NC}"
echo ""

# 6. Clean up container logs (safe - only truncates large logs)
echo "6. Container log cleanup..."
echo "  Will truncate logs larger than 100MB (keeps last 100MB)"
read -p "  Truncate large container logs? (yes/no): " truncate_logs
if [ "$truncate_logs" = "yes" ]; then
    truncated_count=0
    for container in $(docker ps --format "{{.Names}}"); do
        log_path=$(docker inspect --format='{{.LogPath}}' "$container" 2>/dev/null || echo "")
        if [ -n "$log_path" ] && [ -f "$log_path" ]; then
            log_size=$(stat -f%z "$log_path" 2>/dev/null || stat -c%s "$log_path" 2>/dev/null || echo "0")
            if [ "$log_size" -gt 104857600 ]; then  # 100MB
                sudo truncate -s 104857600 "$log_path"  # Keep last 100MB
                echo "  ✓ Truncated logs for $container (was $(numfmt --to=iec-i --suffix=B $log_size 2>/dev/null || echo "${log_size}B"))"
                truncated_count=$((truncated_count + 1))
            fi
        fi
    done
    if [ "$truncated_count" -eq 0 ]; then
        echo "  No large logs found"
    else
        echo -e "${GREEN}✓ Log cleanup completed (truncated $truncated_count containers)${NC}"
    fi
else
    echo "  Skipped (logs preserved)"
fi
echo ""

# 7. Remove ONLY truly unused volumes (excluding protected ones)
echo "7. Removing unused volumes (excluding protected volumes)..."
echo -e "${YELLOW}  Checking for unused volumes (will skip protected volumes)...${NC}"
unused_volumes=$(docker volume ls -q -f "dangling=true" 2>/dev/null || echo "")
if [ -n "$unused_volumes" ]; then
    # Filter out protected volumes
    safe_to_remove=""
    for vol in $unused_volumes; do
        is_protected=false
        for protected in "${PROTECTED_VOLUMES[@]}"; do
            if [ "$vol" = "$protected" ]; then
                is_protected=true
                break
            fi
        done
        if [ "$is_protected" = false ]; then
            safe_to_remove="$safe_to_remove $vol"
        else
            echo "  ⚠ Skipping protected volume: $vol"
        fi
    done
    
    if [ -n "$safe_to_remove" ]; then
        echo "  Found unused volumes (not protected):"
        for vol in $safe_to_remove; do
            echo "    - $vol"
        done
        read -p "  Remove these unused volumes? (yes/no): " remove_volumes
        if [ "$remove_volumes" = "yes" ]; then
            for vol in $safe_to_remove; do
                docker volume rm "$vol" 2>/dev/null && echo "  ✓ Removed $vol" || echo "  ✗ Failed to remove $vol (may be in use)"
            done
        else
            echo "  Skipped (volumes preserved)"
        fi
    else
        echo "  No safe-to-remove unused volumes found"
    fi
else
    echo "  No unused volumes found"
fi
echo ""

# Verify protected volumes are still intact
echo "8. Verifying protected volumes..."
all_protected=true
for vol in "${PROTECTED_VOLUMES[@]}"; do
    if docker volume ls -q | grep -q "^${vol}$"; then
        echo -e "  ${GREEN}✓${NC} $vol (protected and intact)"
    else
        echo -e "  ${RED}✗${NC} $vol (NOT FOUND - THIS IS A PROBLEM!)"
        all_protected=false
    fi
done
echo ""

if [ "$all_protected" = false ]; then
    echo -e "${RED}WARNING: Some protected volumes are missing!${NC}"
    echo "This should not happen. Please check your setup immediately."
    echo ""
fi

# Show final disk usage
echo "=========================================="
echo "Production-Safe Cleanup Complete!"
echo "=========================================="
echo ""
echo "Final Docker disk usage:"
docker system df
echo ""
echo -e "${GREEN}✓ Database and application storage volumes are protected${NC}"
echo -e "${GREEN}✓ Only junk files (images, cache, logs) were cleaned${NC}"
echo ""

