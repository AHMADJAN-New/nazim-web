#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.demo.yml"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.demo.env"

if [[ ! -f "${COMPOSE_ENV}" ]]; then
  echo "[demo/https_init] ERROR: missing ${COMPOSE_ENV}"
  exit 1
fi

source "${COMPOSE_ENV}"

DOMAIN="${DOMAIN:-demo.nazim.cloud}"
EMAIL="${LETSENCRYPT_EMAIL:-}"

if [[ -z "${EMAIL}" ]]; then
  echo "[demo/https_init] ERROR: LETSENCRYPT_EMAIL is required in docker/env/compose.demo.env"
  exit 1
fi

compose() {
  docker compose --env-file "${COMPOSE_ENV}" -f "${COMPOSE_FILE}" "$@"
}

echo "[demo/https_init] Issuing Let's Encrypt cert for: ${DOMAIN}"

# Ensure nginx is up to serve the ACME challenge
compose up -d nginx

compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "${DOMAIN}" \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email \
  --non-interactive

echo "[demo/https_init] Refreshing cert symlinks + reloading nginx..."
compose exec -T nginx sh -lc '/refresh_certs.sh && nginx -s reload'

echo "[demo/https_init] Done."

