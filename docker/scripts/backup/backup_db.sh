#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"

BACKUP_DIR="${ROOT_DIR}/backups"
TS="$(date -u +%Y%m%d_%H%M%S)"
OUT="${BACKUP_DIR}/db_${TS}.sql.gz"

mkdir -p "${BACKUP_DIR}"

compose() {
  docker compose --env-file "${COMPOSE_ENV}" -f "${COMPOSE_FILE}" "$@"
}

echo "[backup_db] Writing ${OUT}"
compose exec -T db sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip -9 > "${OUT}"
echo "[backup_db] Done."

