#!/usr/bin/env bash
# Set FileBrowser admin password to match FILEBROWSER_USER / FILEBROWSER_PASSWORD from compose.prod.env.
# Use this when login fails: the official image may ignore env and set a random password on first run.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"

if [[ ! -f "${COMPOSE_ENV}" ]]; then
  echo "[filebrowser-set-admin-password] ERROR: missing ${COMPOSE_ENV}"
  exit 1
fi

# shellcheck disable=SC1090
source "${COMPOSE_ENV}"

USER="${FILEBROWSER_USER:-admin}"
PASS="${FILEBROWSER_PASSWORD:-changeme}"

# FileBrowser requires password length >= 12
if [[ ${#PASS} -lt 12 ]]; then
  echo "[filebrowser-set-admin-password] ERROR: FILEBROWSER_PASSWORD must be at least 12 characters (current length: ${#PASS})."
  echo "  Set FILEBROWSER_PASSWORD in docker/env/compose.prod.env and run this script again."
  exit 1
fi

echo "[filebrowser-set-admin-password] Stopping filebrowser so the database is not locked..."
docker compose --env-file "${COMPOSE_ENV}" -f "${COMPOSE_FILE}" stop filebrowser 2>/dev/null || true

echo "[filebrowser-set-admin-password] Setting password for user '${USER}' via CLI..."
docker compose --env-file "${COMPOSE_ENV}" -f "${COMPOSE_FILE}" run --rm --no-deps filebrowser \
  users update "${USER}" -p "${PASS}" -d /database/filebrowser.db

echo "[filebrowser-set-admin-password] Starting filebrowser again..."
docker compose --env-file "${COMPOSE_ENV}" -f "${COMPOSE_FILE}" up -d filebrowser

echo "[filebrowser-set-admin-password] Done. Log in at http://<server-ip>:${FILEBROWSER_PORT:-8081} with ${USER} / <your FILEBROWSER_PASSWORD>"
