#!/usr/bin/env bash
# Build wrapper script that automatically cleans up old images after build
# Usage: bash docker/scripts/maintenance/build-with-cleanup.sh [docker compose build args...]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"

if [[ ! -f "${COMPOSE_ENV}" ]]; then
  echo "[build] ERROR: missing ${COMPOSE_ENV}"
  exit 1
fi

compose() {
  docker compose --env-file "${COMPOSE_ENV}" -f "${COMPOSE_FILE}" "$@"
}

echo "[build] Building images..."
compose build "$@"

echo "[build] Cleaning up old/dangling images..."
PRUNED=$(docker image prune -f 2>&1 | grep -oP 'Total reclaimed space: \K[0-9.]+[KMGT]?B' || echo "0B")
echo "[build] ✓ Cleaned up old images (reclaimed: ${PRUNED})"

echo "[build] Done. Old images cleaned."

