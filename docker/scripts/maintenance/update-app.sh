#!/usr/bin/env bash
set -euo pipefail

# App-only update: pull, build frontend + PHP only when deps/source changed, run migrations.
# Does NOT tear down db, redis, certbot, pgadmin. Use for routine fixes/deploys.
# Rebuilds and installs only when backend composer.* or frontend files changed (no full clean every time).
#
# Usage:
#   bash docker/scripts/maintenance/update-app.sh           # Normal update (no permission sync)
#   bash docker/scripts/maintenance/update-app.sh --sync-permissions  # Include permission sync
#   bash docker/scripts/maintenance/update-app.sh --force-rebuild       # Rebuild both images (ignore change detection)

SYNC_PERMISSIONS=false
FORCE_REBUILD=false
for arg in "$@"; do
  if [[ "$arg" == "--sync-permissions" ]]; then
    SYNC_PERMISSIONS=true
  elif [[ "$arg" == "--force-rebuild" ]]; then
    FORCE_REBUILD=true
  fi
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"
STATE_FILE="${ROOT_DIR}/docker/.update-app-state"

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

CURRENT_COMMIT=$(git -C "${ROOT_DIR}" rev-parse HEAD)
LAST_COMMIT=""
[[ -f "${STATE_FILE}" ]] && LAST_COMMIT=$(cat "${STATE_FILE}")

# Detect what changed (missing state = first run = rebuild everything)
REBUILD_PHP=false
REBUILD_NGINX=false
if [[ "$FORCE_REBUILD" == "true" ]]; then
  REBUILD_PHP=true
  REBUILD_NGINX=true
  echo "[update-app] Force rebuild requested; will rebuild both images."
elif [[ -z "$LAST_COMMIT" ]]; then
  REBUILD_PHP=true
  REBUILD_NGINX=true
  echo "[update-app] No previous state; will rebuild both images."
else
  if git -C "${ROOT_DIR}" diff --name-only "${LAST_COMMIT}".."${CURRENT_COMMIT}" -- backend/composer.json backend/composer.lock | grep -q .; then
    REBUILD_PHP=true
    echo "[update-app] Backend dependency files changed; will rebuild PHP image."
  fi
  if git -C "${ROOT_DIR}" diff --name-only "${LAST_COMMIT}".."${CURRENT_COMMIT}" -- frontend/ | grep -q .; then
    REBUILD_NGINX=true
    echo "[update-app] Frontend changed; will rebuild Nginx image."
  fi
  [[ "$REBUILD_PHP" != "true" ]] && echo "[update-app] No backend dep changes; skipping PHP image build."
  [[ "$REBUILD_NGINX" != "true" ]] && echo "[update-app] No frontend changes; skipping Nginx image build."
fi

# Frontend: no host npm step — image builds deps and app in Docker (faster, uses layer cache)
if [[ "$REBUILD_NGINX" == "true" ]]; then
  echo "[update-app] Building Nginx image (npm ci + npm run build in Docker)..."
  compose build nginx
fi

if [[ "$REBUILD_PHP" == "true" ]]; then
  echo "[update-app] Building PHP image (composer install in Docker)..."
  compose build php
fi

echo "[update-app] Restarting app services (php, queue, scheduler, nginx)..."
compose up -d php queue scheduler nginx

# Only run composer install in container when backend deps changed (image already has vendor from build; this syncs if needed)
if [[ "$REBUILD_PHP" == "true" ]]; then
  echo "[update-app] Ensuring Composer dependencies and autoloader..."
  compose exec -T php composer install --no-interaction --no-dev --optimize-autoloader 2>/dev/null || true
  compose exec -T php composer dump-autoload --optimize --no-interaction 2>/dev/null || true
else
  echo "[update-app] Skipping Composer install (no backend dependency changes)."
fi

echo "[update-app] Running migrations + optimize..."
if ! compose exec -T php sh -lc 'php artisan migrate --force && php artisan optimize'; then
  echo "[update-app] ERROR: Migrations or optimize failed. Fix errors and re-run. Login and other features may break until migrations succeed."
  exit 1
fi

if [[ "$SYNC_PERMISSIONS" == "true" ]]; then
  echo "[update-app] Syncing default role permissions..."
  compose exec -T php sh -lc 'php artisan permissions:sync-default-roles' || true
else
  echo "[update-app] Skipping permission sync (run with --sync-permissions to sync)."
fi

echo "${CURRENT_COMMIT}" > "${STATE_FILE}"
echo "[update-app] Done."
