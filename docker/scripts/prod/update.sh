#!/usr/bin/env bash
set -euo pipefail

# Update Script for Nazim Production
# This script updates the application and monitoring stack, cleaning up old containers

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
MONITORING_COMPOSE_FILE="${ROOT_DIR}/docker-compose.monitoring.yml"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Nazim Production Update${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [[ ! -f "${COMPOSE_ENV}" ]]; then
  echo -e "${RED}ERROR: ${COMPOSE_ENV} not found${NC}"
  echo -e "${YELLOW}Run setup.sh first: bash docker/scripts/prod/setup.sh${NC}"
  exit 1
fi

compose() {
  docker compose --env-file "${COMPOSE_ENV}" -f "${COMPOSE_FILE}" "$@"
}

compose_monitoring() {
  docker compose -f "${MONITORING_COMPOSE_FILE}" "$@"
}

# Step 1: Clean up old containers and networks
echo -e "${GREEN}[1/6] Cleaning up old containers and networks...${NC}"

# Stop containers first (this may remove network if it was created by compose)
compose down --remove-orphans 2>/dev/null || true
compose_monitoring down --remove-orphans 2>/dev/null || true

# Recreate network if it was removed (needed for both app and monitoring)
if ! docker network inspect nazim_network >/dev/null 2>&1; then
  echo -e "${YELLOW}Creating nazim_network...${NC}"
  docker network create nazim_network --driver bridge || echo -e "${YELLOW}Warning: Network may already exist${NC}"
else
  echo -e "${GREEN}Network nazim_network already exists${NC}"
fi

# Clean up containers and networks (but keep nazim_network)
docker container prune -f || echo -e "${YELLOW}Warning: Failed to clean up containers${NC}"
# Remove unused networks (but keep nazim_network)
# Use network ls + grep instead of prune filter (more reliable)
docker network ls --filter "type=custom" --format "{{.Name}}" | grep -v "^nazim_network$" | xargs -r docker network rm 2>/dev/null || echo -e "${YELLOW}Warning: Some networks may not have been removed${NC}"
echo -e "${GREEN}✓ Cleanup completed${NC}"
echo ""

# Step 2: Pull latest images
echo -e "${GREEN}[2/6] Pulling latest images...${NC}"
compose pull || echo -e "${YELLOW}Warning: Some images failed to pull${NC}"
if [[ -f "${MONITORING_COMPOSE_FILE}" ]]; then
  compose_monitoring pull || echo -e "${YELLOW}Warning: Some monitoring images failed to pull${NC}"
fi
echo -e "${GREEN}✓ Images pulled${NC}"
echo ""

# Step 3: Rebuild application images
echo -e "${GREEN}[3/6] Rebuilding application images...${NC}"
compose build --no-cache
echo -e "${GREEN}✓ Application images rebuilt${NC}"
echo ""

# Step 4: Start all services (skip build/cleanup since we already did it)
echo -e "${GREEN}[4/6] Starting all services...${NC}"
bash "${ROOT_DIR}/docker/scripts/prod/bootstrap.sh" --skip-build --skip-cleanup
echo -e "${GREEN}✓ All services started${NC}"
echo ""

# Step 5: Install Composer dependencies and regenerate autoloader
echo -e "${GREEN}[5/6] Installing Composer dependencies and regenerating autoloader...${NC}"
if compose exec -T php composer install --no-interaction --no-dev --optimize-autoloader 2>&1 | grep -q "Nothing to install\|Updating dependencies\|Installing dependencies"; then
  echo -e "${GREEN}✓ Composer dependencies installed${NC}"
else
  echo -e "${YELLOW}⚠️  Composer install completed (may have warnings)${NC}"
fi

# Regenerate autoloader to ensure all classes/traits are available
if compose exec -T php composer dump-autoload --optimize --no-interaction >/dev/null 2>&1; then
  echo -e "${GREEN}✓ Autoloader regenerated${NC}"
else
  echo -e "${YELLOW}⚠️  Autoloader regeneration completed (may have warnings)${NC}"
fi

# Clear Laravel caches to ensure fresh state
compose exec -T php php artisan optimize:clear >/dev/null 2>&1 || echo -e "${YELLOW}⚠️  Cache clear completed (may have warnings)${NC}"
echo ""

# Step 6: Clean up old images
echo -e "${GREEN}[6/6] Cleaning up old/dangling images...${NC}"
PRUNED=$(docker image prune -f 2>&1 | grep -oP 'Total reclaimed space: \K[0-9.]+[KMGT]?B' || echo "0B")
echo -e "${GREEN}✓ Cleaned up old images (reclaimed: ${PRUNED})${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Update Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Service Status:${NC}"
compose ps
if [[ -f "${MONITORING_COMPOSE_FILE}" ]]; then
  echo ""
  echo -e "${BLUE}Monitoring Status:${NC}"
  compose_monitoring ps
fi
echo ""
echo -e "${BLUE}Access Points:${NC}"
# shellcheck disable=SC1090
source "${COMPOSE_ENV}"
echo -e "- Application: ${YELLOW}https://${DOMAIN:-your-domain.com}${NC}"
echo -e "- Grafana: ${YELLOW}http://$(hostname -I | awk '{print $1}'):3000${NC} (admin/admin)"
echo -e "- Prometheus: ${YELLOW}http://$(hostname -I | awk '{print $1}'):9090${NC}"
echo -e "- pgAdmin (database admin): ${YELLOW}http://localhost:${PGADMIN_PORT:-5050}${NC} (${PGADMIN_EMAIL:-admin@nazim.cloud}/${PGADMIN_PASSWORD:-admin})"
echo ""

