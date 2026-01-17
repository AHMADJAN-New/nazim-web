#!/usr/bin/env bash
set -euo pipefail

# Master Setup Script for Nazim Production
# This script runs all setup steps in sequence for a new server deployment

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"
COMPOSE_ENV_EXAMPLE="${ROOT_DIR}/docker/env/compose.prod.env.example"
BACKEND_ENV="${ROOT_DIR}/backend/.env"
BACKEND_ENV_EXAMPLE="${ROOT_DIR}/docker/env/backend.env.example"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Nazim Production Server Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${GREEN}[1/7] Checking prerequisites...${NC}"
if ! command -v docker >/dev/null 2>&1; then
  echo -e "${RED}ERROR: Docker is not installed${NC}"
  echo -e "${YELLOW}Run: bash docker/scripts/setup/install-docker.sh${NC}"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo -e "${RED}ERROR: Docker Compose plugin is not available${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"
echo ""

# Step 2: Setup environment files
echo -e "${GREEN}[2/7] Setting up environment files...${NC}"
if [[ ! -f "${COMPOSE_ENV}" ]]; then
  echo -e "${YELLOW}Creating ${COMPOSE_ENV} from example...${NC}"
  mkdir -p "$(dirname "${COMPOSE_ENV}")"
  cp "${COMPOSE_ENV_EXAMPLE}" "${COMPOSE_ENV}"
  echo -e "${RED}⚠️  IMPORTANT: Edit ${COMPOSE_ENV} and configure:${NC}"
  echo -e "   - DOMAIN (your domain name)"
  echo -e "   - APP_URL (your application URL)"
  echo -e "   - LETSENCRYPT_EMAIL (for SSL certificates)"
  echo -e "   - POSTGRES_PASSWORD (database password)"
  echo -e "   - HTTP_PORT (default: 80)"
  echo -e "   - HTTPS_PORT (default: 443)"
  echo ""
  read -p "Press Enter after editing the file to continue..."
fi

if [[ ! -f "${BACKEND_ENV}" ]]; then
  echo -e "${YELLOW}Creating ${BACKEND_ENV} from example...${NC}"
  cp "${BACKEND_ENV_EXAMPLE}" "${BACKEND_ENV}"
  echo -e "${RED}⚠️  IMPORTANT: Edit ${BACKEND_ENV} and configure:${NC}"
  echo -e "   - APP_URL (must match compose.env)"
  echo -e "   - DB_PASSWORD (must match POSTGRES_PASSWORD in compose.env)"
  echo -e "   - MAIL_* settings (optional)"
  echo ""
  read -p "Press Enter after editing the file to continue..."
fi

echo -e "${GREEN}✓ Environment files are ready${NC}"
echo ""

# Step 3: Run preflight checks
echo -e "${GREEN}[3/7] Running preflight checks...${NC}"
bash "${ROOT_DIR}/docker/scripts/prod/preflight.sh"
if [[ $? -ne 0 ]]; then
  echo -e "${RED}Preflight checks failed. Please fix the issues and try again.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Preflight checks passed${NC}"
echo ""

# Step 4: Setup firewall (optional, requires sudo)
echo -e "${GREEN}[4/7] Configuring firewall...${NC}"
FIREWALL_SCRIPT="${ROOT_DIR}/docker/scripts/prod/setup-firewall.sh"
if [[ -f "${FIREWALL_SCRIPT}" ]]; then
  if [[ $EUID -eq 0 ]] || sudo -n true 2>/dev/null; then
    echo -e "${YELLOW}Setting up firewall (requires sudo)...${NC}"
    if sudo bash "${FIREWALL_SCRIPT}"; then
      echo -e "${GREEN}✓ Firewall configured successfully${NC}"
    else
      echo -e "${YELLOW}⚠️  Firewall setup failed or was skipped${NC}"
    fi
  else
    echo -e "${YELLOW}⚠️  Skipping firewall setup (requires sudo)${NC}"
    echo -e "${YELLOW}   Run manually: sudo bash ${FIREWALL_SCRIPT}${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Firewall script not found, skipping...${NC}"
fi
echo ""

# Step 5: Run bootstrap (builds images, starts services, runs migrations)
echo -e "${GREEN}[5/7] Running bootstrap (this may take several minutes)...${NC}"
bash "${ROOT_DIR}/docker/scripts/prod/bootstrap.sh"
if [[ $? -ne 0 ]]; then
  echo -e "${RED}Bootstrap failed. Check the logs above for errors.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Bootstrap completed${NC}"
echo ""

# Load compose env for docker compose commands
# shellcheck disable=SC1090
source "${COMPOSE_ENV}"

compose() {
  docker compose --env-file "${COMPOSE_ENV}" -f "${ROOT_DIR}/docker-compose.prod.yml" "$@"
}

# Step 6: Run database seeding (optional)
echo -e "${GREEN}[6/7] Database seeding...${NC}"
read -p "Do you want to seed the database with initial data? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Running database seeders...${NC}"
  
  if compose exec -T php php artisan db:seed --force; then
    echo -e "${GREEN}✓ Database seeded successfully${NC}"
  else
    echo -e "${YELLOW}⚠️  Database seeding failed or was skipped${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Skipping database seeding${NC}"
  echo -e "${YELLOW}   Run manually: docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml exec php php artisan db:seed --force${NC}"
fi
echo ""

# Step 7: Final verification
echo -e "${GREEN}[7/7] Final verification...${NC}"

echo -e "${BLUE}Checking service status:${NC}"
compose ps

echo ""
echo -e "${BLUE}Checking service health:${NC}"
if compose ps | grep -q "healthy"; then
  echo -e "${GREEN}✓ All services are healthy${NC}"
else
  echo -e "${YELLOW}⚠️  Some services may not be healthy yet${NC}"
  echo -e "${YELLOW}   Wait a few moments and check: docker compose ps${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Check logs: ${YELLOW}docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs -f${NC}"
echo -e "2. Access your application at: ${YELLOW}https://${DOMAIN:-your-domain.com}${NC}"
echo -e "3. Monitor services: ${YELLOW}docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml ps${NC}"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo -e "- View logs: ${YELLOW}docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs -f [service]${NC}"
echo -e "- Restart service: ${YELLOW}docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml restart [service]${NC}"
echo -e "- Stop all: ${YELLOW}docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml down${NC}"
echo -e "- Start all: ${YELLOW}docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d${NC}"
echo ""

