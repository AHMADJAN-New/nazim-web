#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"
HOOKS_DIR="${ROOT_DIR}/docker/scripts/prod/hostinger_acme"

if [[ ! -f "${COMPOSE_ENV}" ]]; then
  echo "[https_renew] ERROR: missing ${COMPOSE_ENV}"
  exit 1
fi

# shellcheck disable=SC1090
source "${COMPOSE_ENV}"

DOMAIN="${DOMAIN:-nazim.cloud}"
ACME_TXT_TTL="${ACME_TXT_TTL:-60}"
ACME_TXT_POST_OK_COOLDOWN_SEC="${ACME_TXT_POST_OK_COOLDOWN_SEC:-90}"

compose() {
  docker compose --env-file "${COMPOSE_ENV}" -f "${COMPOSE_FILE}" "$@"
}

echo "[https_renew] Renewing certificates (if due)..."

# Mount Hostinger hooks so DNS-01 wildcards can renew non-interactively.
# (HTTP-01 certs ignore these hooks.)
if [[ -n "${HOSTINGER_API_TOKEN:-}" && -f "${HOOKS_DIR}/auth-hook.py" ]]; then
  compose run --rm \
    -v "${HOOKS_DIR}:/hooks:ro" \
    -e "HOSTINGER_API_TOKEN=${HOSTINGER_API_TOKEN}" \
    -e "DOMAIN=${DOMAIN}" \
    -e "ACME_TXT_TTL=${ACME_TXT_TTL}" \
    -e "ACME_TXT_POST_OK_COOLDOWN_SEC=${ACME_TXT_POST_OK_COOLDOWN_SEC}" \
    certbot renew --non-interactive \
    --manual-auth-hook "python3 /hooks/auth-hook.py" \
    --manual-cleanup-hook "python3 /hooks/cleanup-hook.py" \
    || echo "[https_renew] ⚠️  renew reported errors — see certbot logs. If wildcard never used hooks, run: bash docker/scripts/prod/https_init_wildcard.sh"
else
  if ! compose run --rm certbot renew --non-interactive --quiet 2>/dev/null; then
    echo "[https_renew] ⚠️  Some certs could not be renewed (wildcard needs HOSTINGER_API_TOKEN)."
    echo "[https_renew]    Set HOSTINGER_API_TOKEN in compose.prod.env, then:"
    echo "[https_renew]    bash docker/scripts/prod/https_init_wildcard.sh"
  fi
fi

echo "[https_renew] Refreshing cert symlinks + reloading nginx..."
compose exec -T nginx sh -lc '/refresh_certs.sh && nginx -s reload' 2>/dev/null || true

echo "[https_renew] Done."
