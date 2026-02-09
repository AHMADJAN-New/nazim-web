#!/usr/bin/env bash
set -euo pipefail

# Parse command line arguments
SKIP_BUILD=false
SKIP_CLEANUP=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-cleanup)
      SKIP_CLEANUP=true
      shift
      ;;
    *)
      echo "[bootstrap] Unknown option: $1"
      exit 1
      ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
MONITORING_COMPOSE_FILE="${ROOT_DIR}/docker-compose.monitoring.yml"
COMPOSE_ENV_EXAMPLE="${ROOT_DIR}/docker/env/compose.prod.env.example"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"
BACKEND_ENV_EXAMPLE="${ROOT_DIR}/docker/env/backend.env.example"
BACKEND_ENV="${ROOT_DIR}/backend/.env"

echo "[bootstrap] root: ${ROOT_DIR}"

if ! command -v docker >/dev/null 2>&1; then
  echo "[bootstrap] ERROR: docker not installed"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[bootstrap] ERROR: docker compose plugin not available"
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "[bootstrap] ERROR: missing ${COMPOSE_FILE}"
  exit 1
fi

if [[ ! -f "${COMPOSE_ENV}" ]]; then
  echo "[bootstrap] Creating ${COMPOSE_ENV} from example"
  mkdir -p "$(dirname "${COMPOSE_ENV}")"
  cp "${COMPOSE_ENV_EXAMPLE}" "${COMPOSE_ENV}"
  echo "[bootstrap] EDIT THIS FILE NOW: ${COMPOSE_ENV}"
  echo "[bootstrap] Then re-run this script."
  exit 1
fi

if [[ ! -f "${BACKEND_ENV}" ]]; then
  echo "[bootstrap] Creating ${BACKEND_ENV} from example"
  cp "${BACKEND_ENV_EXAMPLE}" "${BACKEND_ENV}"
  echo "[bootstrap] EDIT THIS FILE NOW: ${BACKEND_ENV}"
  echo "[bootstrap] At minimum set APP_URL, DB_PASSWORD, and optionally MAIL_*."
  echo "[bootstrap] Then re-run this script."
  exit 1
fi

compose() {
  docker compose --env-file "${COMPOSE_ENV}" -f "${COMPOSE_FILE}" "$@"
}

compose_monitoring() {
  docker compose -f "${MONITORING_COMPOSE_FILE}" "$@"
}

# Load compose env vars (DOMAIN, etc.) for local script logic
# shellcheck disable=SC1090
source "${COMPOSE_ENV}"

# Check firewall configuration (optional - will warn if not configured)
FIREWALL_SCRIPT="${ROOT_DIR}/docker/scripts/prod/setup-firewall.sh"
if [[ -f "${FIREWALL_SCRIPT}" ]]; then
  if command -v ufw >/dev/null 2>&1; then
    if sudo ufw status | grep -q "Status: active"; then
      HTTP_PORT="${HTTP_PORT:-80}"
      HTTPS_PORT="${HTTPS_PORT:-443}"
      if ! sudo ufw status | grep -q "${HTTP_PORT}/tcp" || ! sudo ufw status | grep -q "${HTTPS_PORT}/tcp"; then
        echo "[bootstrap] WARNING: Firewall is active but HTTP/HTTPS ports may not be allowed"
        echo "[bootstrap] Run: sudo bash ${FIREWALL_SCRIPT}"
      else
        echo "[bootstrap] Firewall is active and ports are configured"
      fi
    else
      echo "[bootstrap] WARNING: Firewall (UFW) is not active"
      echo "[bootstrap] To configure firewall, run: sudo bash ${FIREWALL_SCRIPT}"
    fi
  else
    echo "[bootstrap] INFO: UFW not installed. To set up firewall, run: sudo bash ${FIREWALL_SCRIPT}"
  fi
fi

if [[ "${SKIP_CLEANUP}" != "true" ]]; then
  echo "[bootstrap] Cleaning up old containers and networks..."
  # Stop and remove old containers from both compose files
  compose down --remove-orphans 2>/dev/null || true
  compose_monitoring down --remove-orphans 2>/dev/null || true

  # Remove dangling containers
  docker container prune -f || echo "[bootstrap] Warning: Failed to clean up containers (non-critical)"

  # Remove unused networks (but keep nazim_network)
  # Use until filter instead of name filter (more reliable)
  docker network ls --filter "type=custom" --format "{{.Name}}" | grep -v "^nazim_network$" | xargs -r docker network rm 2>/dev/null || echo "[bootstrap] Warning: Some networks may not have been removed (non-critical)"
else
  echo "[bootstrap] Skipping cleanup (already done)"
fi

# Create network if it doesn't exist (needed for both app and monitoring)
# This must happen AFTER compose down (which may remove the network)
if ! docker network inspect nazim_network >/dev/null 2>&1; then
  echo "[bootstrap] Creating nazim_network..."
  docker network create nazim_network --driver bridge || echo "[bootstrap] Warning: Network may already exist"
else
  echo "[bootstrap] Network nazim_network already exists"
fi

if [[ "${SKIP_BUILD}" != "true" ]]; then
  echo "[bootstrap] Building images (php + nginx w/ frontend build)..."
  compose build --no-cache

  echo "[bootstrap] Cleaning up old/dangling images..."
  docker image prune -f || echo "[bootstrap] Warning: Failed to clean up images (non-critical)"
else
  echo "[bootstrap] Skipping build (already done)"
fi

echo "[bootstrap] Starting db + redis..."
compose up -d db redis

echo "[bootstrap] Waiting for db health..."
compose ps

echo "[bootstrap] Starting php (API)..."
compose up -d php

echo "[bootstrap] Running Laravel setup..."
compose exec -T php sh -lc '
  set -e
  php -v
  if [ -z "${APP_KEY:-}" ] || [ "${APP_KEY}" = "base64:" ]; then
    echo "[bootstrap/php] Generating APP_KEY"
    php artisan key:generate --force
  fi

  echo "[bootstrap/php] Running migrations"
  php artisan migrate --force

  echo "[bootstrap/php] Creating storage symlink (safe if already exists)"
  php artisan storage:link || true

  echo "[bootstrap/php] Optimizing caches"
  php artisan config:cache || true
  php artisan route:cache || true
  php artisan view:cache || true
'

echo "[bootstrap] Starting queue + scheduler..."
compose up -d queue scheduler

echo "[bootstrap] Starting pgAdmin (database administration)..."
compose up -d pgadmin

echo "[bootstrap] Starting nginx..."
compose up -d nginx

echo "[bootstrap] Ensuring HTTPS cert (Let's Encrypt)..."
compose exec -T nginx sh -lc 'test -f "/etc/letsencrypt/live/${DOMAIN:-nazim.cloud}/fullchain.pem" && test -f "/etc/letsencrypt/live/${DOMAIN:-nazim.cloud}/privkey.pem"' \
  && echo "[bootstrap] Cert already present" \
  || bash "${ROOT_DIR}/docker/scripts/prod/https_init.sh"

echo "[bootstrap] Starting monitoring stack (Prometheus, Grafana, Loki, Promtail)..."
if [[ -f "${MONITORING_COMPOSE_FILE}" ]]; then
  compose_monitoring up -d
  echo "[bootstrap] Waiting for monitoring services to be healthy..."
  sleep 15
  
  # Wait for Grafana to be ready
  echo "[bootstrap] Waiting for Grafana to be ready..."
  for i in {1..30}; do
    if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
      echo "[bootstrap] Grafana is ready"
      break
    fi
    sleep 2
  done
  
  # Add datasources via API
  echo "[bootstrap] Adding Prometheus datasource..."
  curl -s -X POST -u admin:admin -H "Content-Type: application/json" \
    -d '{"name":"Prometheus","type":"prometheus","access":"proxy","url":"http://prometheus:9090","uid":"prometheus","isDefault":true,"jsonData":{"timeInterval":"15s","httpMethod":"POST","queryTimeout":"60s"}}' \
    http://localhost:3000/api/datasources >/dev/null 2>&1 || echo "[bootstrap] Warning: Failed to add Prometheus datasource (may already exist)"
  
  echo "[bootstrap] Adding Loki datasource..."
  curl -s -X POST -u admin:admin -H "Content-Type: application/json" \
    -d '{"name":"Loki","type":"loki","access":"proxy","url":"http://loki:3100","uid":"loki","isDefault":false,"jsonData":{"maxLines":1000}}' \
    http://localhost:3000/api/datasources >/dev/null 2>&1 || echo "[bootstrap] Warning: Failed to add Loki datasource (may already exist)"
  
  compose_monitoring ps
  echo "[bootstrap] Monitoring stack started"
else
  echo "[bootstrap] Warning: Monitoring compose file not found, skipping monitoring stack"
fi

echo
echo "[bootstrap] Done."
echo "[bootstrap] Application services: docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs -f"
echo "[bootstrap] Monitoring services: docker compose -f docker-compose.monitoring.yml logs -f"
echo "[bootstrap] Grafana: http://$(hostname -I | awk '{print $1}'):3000 (admin/admin)"
# shellcheck disable=SC1090
source "${COMPOSE_ENV}"
echo "[bootstrap] pgAdmin: http://localhost:${PGADMIN_PORT:-5050} (${PGADMIN_EMAIL:-admin@nazim.cloud}/${PGADMIN_PASSWORD:-admin})"

