#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"

compose() {
  docker compose --env-file "${COMPOSE_ENV}" -f "${COMPOSE_FILE}" "$@"
}

echo "[update] Pulling latest code..."
git -C "${ROOT_DIR}" pull --ff-only

echo "[update] Building images..."
compose build

echo "[update] Restarting services..."
compose up -d

echo "[update] Running migrations + optimize..."
compose exec -T php sh -lc 'php artisan migrate --force && php artisan optimize || true'

echo "[update] Done."

