#!/usr/bin/env bash

# Setup Monitoring Stack (Grafana + Prometheus)
# Installs and configures monitoring for Nazim production

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
MONITORING_COMPOSE="${ROOT_DIR}/docker-compose.monitoring.yml"
MAIN_COMPOSE="${ROOT_DIR}/docker-compose.prod.yml"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"

echo "=========================================="
echo "Nazim Monitoring Stack Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is available
if ! command -v docker >/dev/null 2>&1; then
  echo -e "${RED}ERROR: Docker is not installed${NC}"
  exit 1
fi

# Check if main services are running
if ! docker ps | grep -q nazim_prod_nginx; then
  echo -e "${YELLOW}WARNING: Main Nazim services are not running${NC}"
  echo "Start main services first: bash docker/scripts/prod/bootstrap.sh"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check if monitoring stack is already running
if docker ps | grep -q nazim_monitoring_grafana; then
  echo -e "${GREEN}Monitoring stack is already running!${NC}"
  echo ""
  echo "Access URLs:"
  echo "  Grafana:    http://localhost:3000"
  echo "  Prometheus: http://localhost:9090"
  echo "  cAdvisor:   http://localhost:8080"
  echo ""
  echo "To restart: docker compose -f docker-compose.monitoring.yml restart"
  echo ""
  exit 0
fi

# Create monitoring directories
echo "1. Creating monitoring directories..."
mkdir -p "${ROOT_DIR}/docker/monitoring/grafana/provisioning/datasources"
mkdir -p "${ROOT_DIR}/docker/monitoring/grafana/provisioning/dashboards"
mkdir -p "${ROOT_DIR}/docker/monitoring/grafana/dashboards"
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Check if Prometheus config exists
if [ ! -f "${ROOT_DIR}/docker/monitoring/prometheus.yml" ]; then
  echo -e "${RED}ERROR: Prometheus config not found: docker/monitoring/prometheus.yml${NC}"
  exit 1
fi

# Check if Grafana provisioning exists
if [ ! -f "${ROOT_DIR}/docker/monitoring/grafana/provisioning/datasources/prometheus.yml" ]; then
  echo -e "${RED}ERROR: Grafana datasource config not found${NC}"
  exit 1
fi

# Check if main network exists, create if not
if ! docker network ls | grep -q nazim_network; then
  echo -e "${YELLOW}Creating nazim_network...${NC}"
  docker network create nazim_network --driver bridge
  echo -e "${GREEN}✓ Network created${NC}"
else
  echo -e "${GREEN}✓ Network nazim_network exists${NC}"
fi
echo ""

# Set default Grafana credentials if not set
if [ -f "${COMPOSE_ENV}" ]; then
  source "${COMPOSE_ENV}"
fi

GRAFANA_USER="${GRAFANA_ADMIN_USER:-admin}"
GRAFANA_PASS="${GRAFANA_ADMIN_PASSWORD:-admin}"

echo "2. Starting monitoring stack..."
echo "   Grafana credentials:"
echo "     Username: ${GRAFANA_USER}"
echo "     Password: ${GRAFANA_PASS}"
echo ""

docker compose -f "${MONITORING_COMPOSE}" up -d
echo -e "${GREEN}✓ Monitoring stack started${NC}"
echo ""

# Wait for services to be healthy
echo "3. Waiting for services to be ready..."
sleep 10

# Check service health
echo ""
echo "4. Checking service health..."

check_service() {
  local service=$1
  local name=$2
  if docker ps | grep -q "${service}"; then
    echo -e "${GREEN}✓ ${name} is running${NC}"
    return 0
  else
    echo -e "${RED}✗ ${name} failed to start${NC}"
    echo "   Check logs: docker logs ${service}"
    return 1
  fi
}

check_service "nazim_monitoring_grafana" "Grafana"
check_service "nazim_monitoring_prometheus" "Prometheus"
check_service "nazim_monitoring_node_exporter" "Node Exporter"
check_service "nazim_monitoring_cadvisor" "cAdvisor"

echo ""
echo "=========================================="
echo -e "${GREEN}Monitoring Stack Ready!${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}Access URLs:${NC}"
echo "  Grafana:    http://localhost:3000"
echo "  Prometheus: http://localhost:9090"
echo "  cAdvisor:   http://localhost:8080"
echo ""
echo -e "${BLUE}Default Credentials:${NC}"
echo "  Username: ${GRAFANA_USER}"
echo "  Password: ${GRAFANA_PASS}"
echo ""
echo -e "${YELLOW}⚠ IMPORTANT: Change the default password on first login!${NC}"
echo ""
echo -e "${BLUE}To change credentials, set in docker/env/compose.prod.env:${NC}"
echo "  GRAFANA_ADMIN_USER=your_username"
echo "  GRAFANA_ADMIN_PASSWORD=your_password"
echo ""
echo "Then restart: docker compose -f docker-compose.monitoring.yml restart grafana"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  View logs:        docker logs -f nazim_monitoring_grafana"
echo "  Stop monitoring:  docker compose -f docker-compose.monitoring.yml down"
echo "  Restart:          docker compose -f docker-compose.monitoring.yml restart"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Access Grafana at http://localhost:3000"
echo "  2. Change default password"
echo "  3. Import pre-built dashboards (see docker/docs/MONITORING.md)"
echo "  4. Set up alerts for high traffic/low disk space"
echo ""

