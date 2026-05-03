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
echo "[https_init_wildcard] IMPORTANT — \"secondary validation\" failures:"
echo "[https_init_wildcard]   Your registrar NS (e.g. ns1.dns-parking.com) can show the NEW TXT while Google/Cloudflare"
echo "[https_init_wildcard]   resolvers still cache an OLD TXT for up to the old record's TTL."
echo "[https_init_wildcard]   Do NOT press Enter in Certbot until public resolvers match."
echo "[https_init_wildcard]   In a second terminal, after you add each TXT value Certbot shows, run:"
echo ""
echo "    bash docker/scripts/prod/https_acme_txt_propagation_check.sh --wait ${DOMAIN} <TOKEN_FROM_CERTBOT> [<SECOND_TOKEN_IF_ANY>]"
echo ""
echo "[https_init_wildcard] That script checks your authoritative NS + many public resolvers, then waits ~3m"
echo "[https_init_wildcard] (ACME_TXT_POST_OK_COOLDOWN_SEC) and re-checks — reduces LE \"secondary validation\" failures."
echo "[https_init_wildcard] When it exits 0, press Enter in Certbot for that step."
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
