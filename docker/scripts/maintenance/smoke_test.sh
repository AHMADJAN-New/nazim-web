#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"

if [[ ! -f "${COMPOSE_ENV}" ]]; then
  echo "[smoke] ERROR: missing ${COMPOSE_ENV}"
  exit 1
fi

# shellcheck disable=SC1090
source "${COMPOSE_ENV}"

DOMAIN="${DOMAIN:-nazim.cloud}"

if ! command -v curl >/dev/null 2>&1; then
  echo "[smoke] ERROR: curl not installed on host"
  exit 1
fi

echo "[smoke] Testing HTTPS endpoints for ${DOMAIN}"

echo "[smoke] GET https://${DOMAIN}/healthz"
if ! curl -fsS "https://${DOMAIN}/healthz" >/dev/null; then
  echo "[smoke] WARNING: HTTPS check failed (maybe cert not issued yet). Trying with -k..."
  curl -kfsS "https://${DOMAIN}/healthz" >/dev/null
  echo "[smoke] OK with -k (self-signed). Run https_init.sh to issue Let's Encrypt."
else
  echo "[smoke] OK"
fi

echo "[smoke] GET https://${DOMAIN}/api/health"
curl -fsS "https://${DOMAIN}/api/health" >/dev/null && echo "[smoke] OK" || {
  echo "[smoke] WARNING: /api/health failed. Check php container logs."
  exit 1
}

echo "[smoke] Done."

