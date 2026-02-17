#!/usr/bin/env bash
set -euo pipefail

# App-only update: pull, build frontend + PHP, install libs, run migrations.
# Does NOT tear down db, redis, certbot, pgadmin. Use for routine fixes/deploys.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"

if [[ ! -f "${COMPOSE_ENV}" ]]; then
  echo "[update-app] ERROR: missing ${COMPOSE_ENV}"
  exit 1
fi

# shellcheck disable=SC1090
source "${COMPOSE_ENV}"
DOMAIN="${DOMAIN:-nazim.cloud}"

compose() {
  docker compose --env-file "${COMPOSE_ENV}" -f "${COMPOSE_FILE}" "$@"
}

echo "[update-app] Pulling latest code..."
git -C "${ROOT_DIR}" pull --ff-only

echo "[update-app] Installing frontend dependencies (npm ci)..."
docker run --rm -v "${ROOT_DIR}/frontend:/app" -w /app node:20-alpine npm ci

echo "[update-app] Building PHP image (composer install)..."
compose build php

echo "[update-app] Building Nginx image (frontend: npm ci + npm run build)..."
compose build nginx

echo "[update-app] Restarting app services (php, queue, scheduler, nginx)..."
compose up -d php queue scheduler nginx

echo "[update-app] Installing Composer dependencies (for bind-mounted code)..."
compose exec -T php composer install --no-interaction --no-dev --optimize-autoloader 2>/dev/null || true

echo "[update-app] Regenerating autoloader..."
compose exec -T php composer dump-autoload --optimize --no-interaction 2>/dev/null || true

echo "[update-app] Running migrations + optimize..."
compose exec -T php sh -lc 'php artisan migrate --force && php artisan optimize' || true

echo "[update-app] Syncing default role permissions..."
compose exec -T php sh -lc 'php artisan permissions:sync-default-roles' || true

echo "[update-app] Done."
