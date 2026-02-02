#!/usr/bin/env bash
# Issue a Let's Encrypt wildcard certificate for *.DOMAIN and DOMAIN (DNS-01 challenge).
# Run from a terminal so you can add the TXT record when certbot pauses.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"

if [[ ! -f "${COMPOSE_ENV}" ]]; then
  echo "[https_init_wildcard] ERROR: missing ${COMPOSE_ENV}"
  exit 1
fi

source "${COMPOSE_ENV}"

DOMAIN="${DOMAIN:-nazim.cloud}"
EMAIL="${LETSENCRYPT_EMAIL:-}"

if [[ -z "${EMAIL}" ]]; then
  echo "[https_init_wildcard] ERROR: LETSENCRYPT_EMAIL is required in docker/env/compose.prod.env"
  exit 1
fi

compose() {
  docker compose --env-file "${COMPOSE_ENV}" -f "${COMPOSE_FILE}" "$@"
}

echo "[https_init_wildcard] Issuing Let's Encrypt WILDCARD cert for: *.${DOMAIN} and ${DOMAIN}"
echo "[https_init_wildcard] This uses DNS-01 challenge. You will need to add a TXT record at your DNS provider (e.g. Hostinger)."
echo ""

# Use interactive mode so user can add TXT record and press Enter when ready
compose run --rm certbot certonly \
  --manual \
  --preferred-challenges dns \
  -d "*.${DOMAIN}" \
  -d "${DOMAIN}" \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email

echo "[https_init_wildcard] Cert issued. Reloading nginx..."
compose exec -T nginx nginx -s reload 2>/dev/null || true

echo "[https_init_wildcard] Done. Subdomains (e.g. demo.${DOMAIN}, gd.${DOMAIN}) will now use this certificate."
