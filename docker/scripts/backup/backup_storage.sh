#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PROJECT_NAME="$(basename "${ROOT_DIR}")"
VOLUME_NAME="${PROJECT_NAME}_nazim_backend_storage"

BACKUP_DIR="${ROOT_DIR}/backups"
TS="$(date -u +%Y%m%d_%H%M%S)"
OUT="${BACKUP_DIR}/storage_${TS}.tar.gz"

mkdir -p "${BACKUP_DIR}"

echo "[backup_storage] Volume: ${VOLUME_NAME}"
echo "[backup_storage] Writing ${OUT}"

docker run --rm \
  -v "${VOLUME_NAME}:/data:ro" \
  -v "${BACKUP_DIR}:/backups" \
  alpine:3.20 \
  sh -lc "tar -czf /backups/$(basename "${OUT}") -C /data ."

echo "[backup_storage] Done."

