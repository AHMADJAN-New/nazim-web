#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: restore_db.sh <path-to-db_dump.sql.gz>"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"

IN="$1"
if [[ ! -f "${IN}" ]]; then
  echo "[restore_db] ERROR: file not found: ${IN}"
  exit 1
fi

compose() {
  docker compose --env-file "${COMPOSE_ENV}" -f "${COMPOSE_FILE}" "$@"
}

echo "[restore_db] Restoring from ${IN}"
echo "[restore_db] WARNING: this will overwrite data in the target database."
echo

# Ensure db is up
compose up -d db

gunzip -c "${IN}" | compose exec -T db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

echo "[restore_db] Done."

