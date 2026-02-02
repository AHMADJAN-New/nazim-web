#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"

if [[ ! -f "${COMPOSE_ENV}" ]]; then
  echo "[https_renew] ERROR: missing ${COMPOSE_ENV}"
  exit 1
fi

compose() {
  docker compose --env-file "${COMPOSE_ENV}" -f "${COMPOSE_FILE}" "$@"
}

echo "[https_renew] Renewing certificates (if needed)..."
# Use renewal configs only (no --webroot). Webroot-issued certs renew automatically.
# Manual DNS-01 wildcard certs (*.domain) cannot renew here; run https_init_wildcard.sh before expiry.
if ! compose run --rm certbot renew --non-interactive --quiet 2>/dev/null; then
  echo "[https_renew] ⚠️  Some certs could not be renewed (e.g. wildcard certs need manual renewal)."
  echo "[https_renew]    To renew a wildcard cert, run: bash docker/scripts/prod/https_init_wildcard.sh"
fi

echo "[https_renew] Refreshing cert symlinks + reloading nginx..."
compose exec -T nginx sh -lc '/refresh_certs.sh && nginx -s reload'

echo "[https_renew] Done."

