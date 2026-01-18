#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"

if [[ ! -f "${COMPOSE_ENV}" ]]; then
  echo "[update] ERROR: missing ${COMPOSE_ENV}"
  exit 1
fi

# Source env to get DOMAIN and other variables
# shellcheck disable=SC1090
source "${COMPOSE_ENV}"

DOMAIN="${DOMAIN:-nazim.cloud}"

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

echo "[update] Renewing SSL certificates (if needed)..."
# Ensure nginx is running for certificate renewal
compose up -d nginx

# Wait a moment for nginx to be ready
sleep 2

# Renew certificates if they exist, otherwise skip silently
if compose exec -T nginx test -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" 2>/dev/null; then
  echo "[update] Renewing certificates for ${DOMAIN}..."
  if compose run --rm certbot renew --webroot -w /var/www/certbot --non-interactive --quiet; then
    echo "[update] ✓ Certificates renewed (or already up to date)"
    echo "[update] Refreshing cert symlinks + reloading nginx..."
    compose exec -T nginx sh -lc '/refresh_certs.sh && nginx -s reload' || true
  else
    echo "[update] ⚠️  Certificate renewal failed (this is OK if certs don't exist yet)"
  fi
else
  echo "[update] ℹ️  No certificates found, skipping renewal (run docker/scripts/prod/https_init.sh to initialize)"
fi

echo "[update] Done."

