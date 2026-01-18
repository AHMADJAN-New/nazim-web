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
compose run --rm certbot renew --webroot -w /var/www/certbot --non-interactive --quiet

echo "[https_renew] Refreshing cert symlinks + reloading nginx..."
compose exec -T nginx sh -lc '/refresh_certs.sh && nginx -s reload'

echo "[https_renew] Done."

