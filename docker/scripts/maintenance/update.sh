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

echo "[update] Cleaning up old/dangling images..."
docker image prune -f || echo "[update] Warning: Failed to clean up images (non-critical)"

echo "[update] Restarting services..."
compose up -d

echo "[update] Ensuring storage directories and fixing permissions..."
compose exec -T php sh -c '
  mkdir -p /var/www/backend/storage/app/private/platform/files \
    /var/www/backend/storage/app/private/organizations \
    /var/www/backend/storage/app/backups \
    /var/www/backend/storage/app/restore_temp \
    /var/www/backend/storage/app/temp \
    /var/www/backend/storage/app/upload_tmp 2>/dev/null || true
  chown -R www-data:www-data /var/www/backend/storage 2>/dev/null || true
  find /var/www/backend/storage -type d -exec chmod 775 {} \; 2>/dev/null || true
  find /var/www/backend/storage -type f -exec chmod 664 {} \; 2>/dev/null || true
' || true

echo "[update] Running migrations + optimize..."
compose exec -T php sh -lc 'php artisan migrate --force && php artisan optimize || true'

echo "[update] Restarting php, queue, and scheduler (reload workers after deploy; fixes stale report paths)..."
compose restart php queue scheduler 2>/dev/null || compose up -d php queue scheduler

echo "[update] Syncing default role permissions (staff + accountant)..."
compose exec -T php sh -lc 'php artisan permissions:sync-default-roles' || true

echo "[update] Renewing SSL certificates (if needed)..."
# Ensure nginx is running for certificate renewal
compose up -d nginx

# Wait a moment for nginx to be ready
sleep 2

# Renew certificates if they exist, otherwise skip silently
if compose exec -T nginx test -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" 2>/dev/null; then
  echo "[update] Renewing certificates for ${DOMAIN}..."
  # Use renewal configs (no --webroot). Wildcard certs (manual DNS-01) cannot auto-renew here.
  if compose run --rm certbot renew --non-interactive --quiet 2>/dev/null; then
    echo "[update] ✓ Certificates renewed (or already up to date)"
  else
    echo "[update] ⚠️  Certificate renewal skipped or failed (OK if using wildcard cert; renew manually with docker/scripts/prod/https_init_wildcard.sh before expiry)"
  fi
  echo "[update] Reloading nginx..."
  compose exec -T nginx sh -lc '/refresh_certs.sh && nginx -s reload' || true
else
  echo "[update] ℹ️  No certificates found, skipping renewal (run docker/scripts/prod/https_init.sh or https_init_wildcard.sh to initialize)"
fi

echo "[update] Done."

