#!/usr/bin/env bash
set -euo pipefail

# Master Setup Script for Nazim Demo Environment
# This script runs all setup steps in sequence for a new demo server deployment

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.demo.env"
COMPOSE_ENV_EXAMPLE="${ROOT_DIR}/docker/env/compose.demo.env.example"
BACKEND_ENV="${ROOT_DIR}/backend/.env.demo"
BACKEND_ENV_EXAMPLE="${ROOT_DIR}/docker/env/backend.env.example"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Nazim Demo Environment Setup${NC}"
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
  echo -e "   - DOMAIN (demo.nazim.cloud)"
  echo -e "   - APP_URL (https://demo.nazim.cloud)"
  echo -e "   - LETSENCRYPT_EMAIL (for SSL certificates)"
  echo -e "   - POSTGRES_PASSWORD (database password)"
  echo -e "${YELLOW}Then re-run this script.${NC}"
  exit 1
fi

if [[ ! -f "${BACKEND_ENV}" ]]; then
  echo -e "${YELLOW}Creating ${BACKEND_ENV} from example...${NC}"
  if [[ -f "${BACKEND_ENV_EXAMPLE}" ]]; then
    cp "${BACKEND_ENV_EXAMPLE}" "${BACKEND_ENV}"
  else
    echo -e "${YELLOW}Creating minimal ${BACKEND_ENV}...${NC}"
    touch "${BACKEND_ENV}"
  fi
  echo -e "${RED}⚠️  IMPORTANT: Edit ${BACKEND_ENV} and configure:${NC}"
  echo -e "   - APP_URL (https://demo.nazim.cloud)"
  echo -e "   - DB_PASSWORD (must match POSTGRES_PASSWORD in compose.demo.env)"
  echo -e "   - DB_DATABASE (should be nazim_demo)"
  echo -e "${YELLOW}Then re-run this script.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Environment files ready${NC}"
echo ""

# Step 3: Configure firewall (optional)
echo -e "${GREEN}[3/7] Firewall configuration...${NC}"
FIREWALL_SCRIPT="${ROOT_DIR}/docker/scripts/prod/setup-firewall.sh"
if [[ -f "${FIREWALL_SCRIPT}" ]]; then
  read -p "Do you want to configure the firewall now? (y/N): " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Running firewall setup...${NC}"
    sudo bash "${FIREWALL_SCRIPT}"
  else
    echo -e "${YELLOW}⚠️  Skipping firewall setup${NC}"
    echo -e "${YELLOW}   Run manually: sudo bash ${FIREWALL_SCRIPT}${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Firewall script not found, skipping${NC}"
fi
echo ""

# Step 4: Bootstrap Docker containers
echo -e "${GREEN}[4/7] Bootstrapping Docker containers...${NC}"
if bash "${ROOT_DIR}/docker/scripts/demo/bootstrap.sh"; then
  echo -e "${GREEN}✓ Containers bootstrapped successfully${NC}"
else
  echo -e "${RED}✗ Bootstrap failed${NC}"
  exit 1
fi
echo ""

# Step 5: Run database migrations
echo -e "${GREEN}[5/7] Running database migrations...${NC}"

compose() {
  docker compose --env-file "${COMPOSE_ENV}" -f "${ROOT_DIR}/docker-compose.demo.yml" "$@"
}

if compose exec -T php php artisan migrate --force; then
  echo -e "${GREEN}✓ Migrations completed successfully${NC}"
else
  echo -e "${YELLOW}⚠️  Migrations failed or were skipped${NC}"
fi
echo ""

# Step 6: Run database seeding (optional)
echo -e "${GREEN}[6/7] Database seeding...${NC}"
read -p "Do you want to seed the database with initial data? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Running database seeders...${NC}"

  # Load compose env to get docker compose command
  # shellcheck disable=SC1090
  source "${COMPOSE_ENV}"

  compose() {
    docker compose --env-file "${COMPOSE_ENV}" -f "${ROOT_DIR}/docker-compose.demo.yml" "$@"
  }

  if compose exec -T php php artisan db:seed --force; then
    echo -e "${GREEN}✓ Database seeded successfully${NC}"
  else
    echo -e "${YELLOW}⚠️  Database seeding failed or was skipped${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Skipping database seeding${NC}"
  echo -e "${YELLOW}   Run manually: docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml exec php php artisan db:seed --force${NC}"
fi
echo ""

# Step 7: Final status
echo -e "${GREEN}[7/7] Setup complete!${NC}"
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  Demo Environment Ready!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Demo environment is running on:${NC}"
# shellcheck disable=SC1090
source "${COMPOSE_ENV}"
DOMAIN="${DOMAIN:-demo.nazim.cloud}"
HTTP_PORT="${HTTP_PORT:-8080}"
HTTPS_PORT="${HTTPS_PORT:-8443}"
echo -e "   HTTP:  http://${DOMAIN}:${HTTP_PORT}"
echo -e "   HTTPS: https://${DOMAIN}:${HTTPS_PORT}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "   View logs: docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml logs -f"
echo -e "   Stop:     docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml down"
echo -e "   Start:    docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d"
echo ""

