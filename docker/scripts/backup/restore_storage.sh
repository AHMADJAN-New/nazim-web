#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: restore_storage.sh <path-to-storage_backup.tar.gz>"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PROJECT_NAME="$(basename "${ROOT_DIR}")"
VOLUME_NAME="${PROJECT_NAME}_nazim_backend_storage"

IN="$1"
if [[ ! -f "${IN}" ]]; then
  echo "[restore_storage] ERROR: file not found: ${IN}"
  exit 1
fi

echo "[restore_storage] Volume: ${VOLUME_NAME}"
echo "[restore_storage] Restoring from ${IN}"
echo "[restore_storage] WARNING: this overwrites storage volume contents."
echo

docker run --rm \
  -v "${VOLUME_NAME}:/data" \
  -v "$(cd "$(dirname "${IN}")" && pwd):/backup" \
  alpine:3.20 \
  sh -lc "rm -rf /data/* && tar -xzf /backup/$(basename "${IN}") -C /data"

echo "[restore_storage] Done."

