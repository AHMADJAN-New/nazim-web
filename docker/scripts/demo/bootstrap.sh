#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.demo.yml"
COMPOSE_ENV_EXAMPLE="${ROOT_DIR}/docker/env/compose.demo.env.example"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.demo.env"
BACKEND_ENV_EXAMPLE="${ROOT_DIR}/docker/env/backend.env.example"
BACKEND_ENV="${ROOT_DIR}/backend/.env.demo"

echo "[demo/bootstrap] root: ${ROOT_DIR}"

if ! command -v docker >/dev/null 2>&1; then
  echo "[demo/bootstrap] ERROR: docker not installed"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[demo/bootstrap] ERROR: docker compose plugin not available"
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "[demo/bootstrap] ERROR: missing ${COMPOSE_FILE}"
  exit 1
fi

if [[ ! -f "${COMPOSE_ENV}" ]]; then
  echo "[demo/bootstrap] Creating ${COMPOSE_ENV} from example"
  mkdir -p "$(dirname "${COMPOSE_ENV}")"
  cp "${COMPOSE_ENV_EXAMPLE}" "${COMPOSE_ENV}"
  echo "[demo/bootstrap] EDIT THIS FILE NOW: ${COMPOSE_ENV}"
  echo "[demo/bootstrap] Then re-run this script."
  exit 1
fi

if [[ ! -f "${BACKEND_ENV}" ]]; then
  echo "[demo/bootstrap] Creating ${BACKEND_ENV} from example"
  if [[ -f "${BACKEND_ENV_EXAMPLE}" ]]; then
    cp "${BACKEND_ENV_EXAMPLE}" "${BACKEND_ENV}"
  else
    echo "[demo/bootstrap] WARNING: ${BACKEND_ENV_EXAMPLE} not found"
    echo "[demo/bootstrap] Creating minimal ${BACKEND_ENV}"
    touch "${BACKEND_ENV}"
  fi
  echo "[demo/bootstrap] EDIT THIS FILE NOW: ${BACKEND_ENV}"
  echo "[demo/bootstrap] At minimum set APP_URL, DB_PASSWORD, and optionally MAIL_*."
  echo "[demo/bootstrap] Then re-run this script."
  exit 1
fi

compose() {
  docker compose --env-file "${COMPOSE_ENV}" -f "${COMPOSE_FILE}" "$@"
}

# Load compose env vars (DOMAIN, etc.) for local script logic
# shellcheck disable=SC1090
source "${COMPOSE_ENV}"

# Check firewall configuration (optional - will warn if not configured)
FIREWALL_SCRIPT="${ROOT_DIR}/docker/scripts/prod/setup-firewall.sh"
if [[ -f "${FIREWALL_SCRIPT}" ]]; then
  if command -v ufw >/dev/null 2>&1; then
    if sudo ufw status | grep -q "Status: active"; then
      HTTP_PORT="${HTTP_PORT:-8080}"
      HTTPS_PORT="${HTTPS_PORT:-8443}"
      if ! sudo ufw status | grep -q "${HTTP_PORT}/tcp" || ! sudo ufw status | grep -q "${HTTPS_PORT}/tcp"; then
        echo "[demo/bootstrap] WARNING: Firewall is active but HTTP/HTTPS ports may not be allowed"
        echo "[demo/bootstrap] Run: sudo bash ${FIREWALL_SCRIPT}"
      else
        echo "[demo/bootstrap] Firewall is active and ports are configured"
      fi
    else
      echo "[demo/bootstrap] WARNING: Firewall (UFW) is not active"
      echo "[demo/bootstrap] To configure firewall, run: sudo bash ${FIREWALL_SCRIPT}"
    fi
  else
    echo "[demo/bootstrap] INFO: UFW not installed. To set up firewall, run: sudo bash ${FIREWALL_SCRIPT}"
  fi
fi

echo "[demo/bootstrap] Building images (php + nginx w/ frontend build)..."
compose build --no-cache

echo "[demo/bootstrap] Starting db + redis..."
compose up -d db redis

echo "[demo/bootstrap] Waiting for db health..."
compose ps

echo "[demo/bootstrap] Starting php (API)..."
compose up -d php

echo "[demo/bootstrap] Running Laravel setup..."
compose exec -T php sh -lc '
  set -e
  php -v
  if [ -z "${APP_KEY:-}" ] || [ "${APP_KEY}" = "base64:" ]; then
    echo "[demo/bootstrap/php] Generating APP_KEY"
    php artisan key:generate --force
  fi

  echo "[demo/bootstrap/php] Running migrations"
  php artisan migrate --force

  echo "[demo/bootstrap/php] Creating storage symlink (safe if already exists)"
  php artisan storage:link || true

  echo "[demo/bootstrap/php] Optimizing caches"
  php artisan config:cache || true
  php artisan route:cache || true
  php artisan view:cache || true
'

echo "[demo/bootstrap] Starting queue + scheduler..."
compose up -d queue scheduler

echo "[demo/bootstrap] Starting nginx..."
compose up -d nginx

echo "[demo/bootstrap] Ensuring HTTPS cert (Let's Encrypt)..."
compose exec -T nginx sh -lc 'test -f "/etc/letsencrypt/live/${DOMAIN:-demo.nazim.cloud}/fullchain.pem" && test -f "/etc/letsencrypt/live/${DOMAIN:-demo.nazim.cloud}/privkey.pem"' \
  && echo "[demo/bootstrap] Cert already present" \
  || bash "${ROOT_DIR}/docker/scripts/demo/https_init.sh"

echo
echo "[demo/bootstrap] Done."
echo "[demo/bootstrap] Check logs: docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml logs -f"

