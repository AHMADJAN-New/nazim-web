#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
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

# Load compose env vars (DOMAIN, etc.) for local script logic
# shellcheck disable=SC1090
source "${COMPOSE_ENV}"

echo "[bootstrap] Building images (php + nginx w/ frontend build)..."
compose build --no-cache

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

echo "[bootstrap] Starting nginx..."
compose up -d nginx

echo "[bootstrap] Ensuring HTTPS cert (Let's Encrypt)..."
compose exec -T nginx sh -lc 'test -f "/etc/letsencrypt/live/${DOMAIN:-nazim.cloud}/fullchain.pem" && test -f "/etc/letsencrypt/live/${DOMAIN:-nazim.cloud}/privkey.pem"' \
  && echo "[bootstrap] Cert already present" \
  || bash "${ROOT_DIR}/docker/scripts/prod/https_init.sh"

echo
echo "[bootstrap] Done."
echo "[bootstrap] Check logs: docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs -f"

