#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Nazim Production Cleanup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if compose env exists
if [[ ! -f "${COMPOSE_ENV}" ]]; then
  echo -e "${YELLOW}⚠️  ${COMPOSE_ENV} not found. Using defaults.${NC}"
fi

compose() {
  if [[ -f "${COMPOSE_ENV}" ]]; then
    docker compose --env-file "${COMPOSE_ENV}" -f "${COMPOSE_FILE}" "$@"
  else
    docker compose -f "${COMPOSE_FILE}" "$@"
  fi
}

# Step 1: Stop all containers
echo -e "${BLUE}[1/5] Stopping all containers...${NC}"
if compose ps -q 2>/dev/null | grep -q .; then
  compose down --remove-orphans 2>/dev/null || true
  echo -e "${GREEN}✓ Stopped compose containers${NC}"
else
  echo -e "${YELLOW}⚠️  No compose containers running${NC}"
fi

# Step 2: Stop and remove orphan containers
echo -e "${BLUE}[2/5] Removing orphan containers...${NC}"
ORPHAN_CONTAINERS=$(docker ps -a --filter "name=nazim_proxy" --filter "name=nazim_proxy_certbot" --format "{{.Names}}" 2>/dev/null || true)
if [[ -n "${ORPHAN_CONTAINERS}" ]]; then
  echo -e "${YELLOW}Found orphan containers:${NC}"
  echo "${ORPHAN_CONTAINERS}" | while read -r container; do
    echo -e "  - ${container}"
    docker stop "${container}" 2>/dev/null || true
    docker rm -f "${container}" 2>/dev/null || true
  done
  echo -e "${GREEN}✓ Removed orphan containers${NC}"
else
  echo -e "${GREEN}✓ No orphan containers found${NC}"
fi

# Step 3: Check what's using port 80
echo -e "${BLUE}[3/5] Checking port 80 usage...${NC}"
PORT_80_USAGE=$(sudo lsof -i :80 2>/dev/null | grep LISTEN || true)
if [[ -n "${PORT_80_USAGE}" ]]; then
  echo -e "${YELLOW}⚠️  Port 80 is in use:${NC}"
  echo "${PORT_80_USAGE}"
  echo ""
  echo -e "${YELLOW}Attempting to identify and stop containers using port 80...${NC}"
  # Find containers using port 80
  CONTAINERS_ON_80=$(docker ps --format "{{.ID}}\t{{.Names}}\t{{.Ports}}" | grep ":80->" || true)
  if [[ -n "${CONTAINERS_ON_80}" ]]; then
    echo "${CONTAINERS_ON_80}" | while read -r line; do
      CONTAINER_ID=$(echo "${line}" | awk '{print $1}')
      CONTAINER_NAME=$(echo "${line}" | awk '{print $2}')
      echo -e "  Stopping container: ${CONTAINER_NAME} (${CONTAINER_ID})"
      docker stop "${CONTAINER_ID}" 2>/dev/null || true
      docker rm -f "${CONTAINER_ID}" 2>/dev/null || true
    done
    echo -e "${GREEN}✓ Stopped containers using port 80${NC}"
  else
    echo -e "${YELLOW}⚠️  Port 80 is in use but not by Docker containers${NC}"
    echo -e "${YELLOW}   You may need to stop the service manually${NC}"
  fi
else
  echo -e "${GREEN}✓ Port 80 is free${NC}"
fi

# Step 4: Remove all Nazim containers (safety check)
echo -e "${BLUE}[4/5] Removing all Nazim containers...${NC}"
NAZIM_CONTAINERS=$(docker ps -a --filter "name=nazim_" --format "{{.Names}}" 2>/dev/null || true)
if [[ -n "${NAZIM_CONTAINERS}" ]]; then
  echo "${NAZIM_CONTAINERS}" | while read -r container; do
    echo -e "  Removing: ${container}"
    docker rm -f "${container}" 2>/dev/null || true
  done
  echo -e "${GREEN}✓ Removed all Nazim containers${NC}"
else
  echo -e "${GREEN}✓ No Nazim containers found${NC}"
fi

# Step 5: Clean up networks (optional - ask user)
echo -e "${BLUE}[5/5] Network cleanup...${NC}"
NAZIM_NETWORKS=$(docker network ls --filter "name=nazim" --format "{{.Name}}" 2>/dev/null || true)
if [[ -n "${NAZIM_NETWORKS}" ]]; then
  echo "${NAZIM_NETWORKS}" | while read -r network; do
    # Check if network has containers
    NETWORK_CONTAINERS=$(docker network inspect "${network}" --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || true)
    if [[ -z "${NETWORK_CONTAINERS}" ]] || [[ "${NETWORK_CONTAINERS}" == " " ]]; then
      echo -e "  Removing network: ${network}"
      docker network rm "${network}" 2>/dev/null || true
    else
      echo -e "  Skipping network ${network} (has containers: ${NETWORK_CONTAINERS})"
    fi
  done
  echo -e "${GREEN}✓ Network cleanup complete${NC}"
else
  echo -e "${GREEN}✓ No Nazim networks found${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Cleanup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Note: Volumes were NOT removed to preserve data.${NC}"
echo -e "${BLUE}To remove volumes, run:${NC}"
echo -e "${YELLOW}  docker volume rm nazim_pg_data nazim_redis_data nazim_backend_storage nazim_letsencrypt nazim_certbot_www nazim_pgadmin_data nazim_filebrowser_data${NC}"
echo ""
echo -e "${BLUE}To start fresh, run:${NC}"
echo -e "${YELLOW}  sudo bash docker/scripts/prod/setup.sh${NC}"
echo ""






