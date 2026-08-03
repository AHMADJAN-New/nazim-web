#!/usr/bin/env bash
# Issue a Let's Encrypt wildcard certificate for *.DOMAIN and DOMAIN (DNS-01).
# Automates Hostinger TXT updates via certbot hooks (HOSTINGER_API_TOKEN required).
#
# Note: Let's Encrypt certificates are always max ~90 days — longer periods are not
# available from LE. Use https_renew.sh (with the same hooks) before expiry.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"
HOOKS_DIR="${ROOT_DIR}/docker/scripts/prod/hostinger_acme"

if [[ ! -f "${COMPOSE_ENV}" ]]; then
  echo "[https_init_wildcard] ERROR: missing ${COMPOSE_ENV}"
  exit 1
fi

# shellcheck disable=SC1090
source "${COMPOSE_ENV}"

DOMAIN="${DOMAIN:-nazim.cloud}"
EMAIL="${LETSENCRYPT_EMAIL:-}"
ACME_TXT_TTL="${ACME_TXT_TTL:-60}"
ACME_TXT_POST_OK_COOLDOWN_SEC="${ACME_TXT_POST_OK_COOLDOWN_SEC:-90}"

if [[ -z "${EMAIL}" ]]; then
  echo "[https_init_wildcard] ERROR: LETSENCRYPT_EMAIL is required in docker/env/compose.prod.env"
  exit 1
fi

if [[ -z "${HOSTINGER_API_TOKEN:-}" ]]; then
  echo "[https_init_wildcard] ERROR: HOSTINGER_API_TOKEN is required in docker/env/compose.prod.env"
  echo "[https_init_wildcard]        (Hostinger hPanel → API → generate token; used to set _acme-challenge TXT)"
  exit 1
fi

if [[ ! -f "${HOOKS_DIR}/auth-hook.py" || ! -f "${HOOKS_DIR}/cleanup-hook.py" ]]; then
  echo "[https_init_wildcard] ERROR: missing Hostinger ACME hooks in ${HOOKS_DIR}"
  exit 1
fi

compose() {
  docker compose --env-file "${COMPOSE_ENV}" -f "${COMPOSE_FILE}" "$@"
}

CERTBOT_EXTRA=()
if [[ "${FORCE_RENEWAL:-0}" == "1" ]]; then
  CERTBOT_EXTRA+=(--force-renewal)
  echo "[https_init_wildcard] FORCE_RENEWAL=1 — will replace the existing certificate"
else
  CERTBOT_EXTRA+=(--keep-until-expiring)
fi

echo "[https_init_wildcard] Issuing Let's Encrypt WILDCARD cert for: *.${DOMAIN} and ${DOMAIN}"
echo "[https_init_wildcard] DNS-01 via Hostinger API (TTL=${ACME_TXT_TTL}s, cooldown=${ACME_TXT_POST_OK_COOLDOWN_SEC}s)"
echo "[https_init_wildcard] LE max lifetime is ~90 days (cannot extend). Auto-renew with https_renew.sh."
echo ""

# Mount hooks + pass token. Certbot image includes python3.
compose run --rm \
  -v "${HOOKS_DIR}:/hooks:ro" \
  -e "HOSTINGER_API_TOKEN=${HOSTINGER_API_TOKEN}" \
  -e "DOMAIN=${DOMAIN}" \
  -e "ACME_TXT_TTL=${ACME_TXT_TTL}" \
  -e "ACME_TXT_POST_OK_COOLDOWN_SEC=${ACME_TXT_POST_OK_COOLDOWN_SEC}" \
  certbot certonly \
  --manual \
  --preferred-challenges dns \
  --manual-auth-hook "python3 /hooks/auth-hook.py" \
  --manual-cleanup-hook "python3 /hooks/cleanup-hook.py" \
  --manual-public-ip-logging-ok \
  -d "*.${DOMAIN}" \
  -d "${DOMAIN}" \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email \
  --non-interactive \
  "${CERTBOT_EXTRA[@]}"

echo "[https_init_wildcard] Cert issued. Refreshing nginx certs + reload..."
compose exec -T nginx sh -lc '/refresh_certs.sh && nginx -s reload' 2>/dev/null \
  || compose exec -T nginx nginx -s reload 2>/dev/null \
  || true

echo "[https_init_wildcard] Done. Subdomains (e.g. demo.${DOMAIN}) use this wildcard certificate."
