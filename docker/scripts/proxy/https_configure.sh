#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.proxy.yml"
PROXY_CONF="${ROOT_DIR}/docker/proxy/conf.d/proxy.conf"

# Source environment if available
if [ -f "${ROOT_DIR}/docker/env/compose.proxy.env" ]; then
  source "${ROOT_DIR}/docker/env/compose.proxy.env"
fi

PROD_DOMAIN="${PROD_DOMAIN:-nazim.cloud}"
DEMO_DOMAIN="${DEMO_DOMAIN:-demo.nazim.cloud}"

compose() {
  docker compose -f "${COMPOSE_FILE}" "$@"
}

echo "[proxy/https_configure] Configuring HTTPS in proxy nginx..."

# Check if certificates exist
PROD_CERT="/etc/letsencrypt/proxy/live/${PROD_DOMAIN}/fullchain.pem"
DEMO_CERT="/etc/letsencrypt/proxy/live/${DEMO_DOMAIN}/fullchain.pem"

PROD_HAS_CERT=false
DEMO_HAS_CERT=false

if docker volume inspect nazim-web_nazim_proxy_letsencrypt >/dev/null 2>&1; then
  if docker run --rm -v nazim-web_nazim_proxy_letsencrypt:/certs:ro alpine test -f "/certs/live/${PROD_DOMAIN}/fullchain.pem" 2>/dev/null; then
    PROD_HAS_CERT=true
  fi
  if docker run --rm -v nazim-web_nazim_proxy_letsencrypt:/certs:ro alpine test -f "/certs/live/${DEMO_DOMAIN}/fullchain.pem" 2>/dev/null; then
    DEMO_HAS_CERT=true
  fi
fi

if [ "$PROD_HAS_CERT" = true ]; then
  echo "[proxy/https_configure] ✓ Production certificate found for ${PROD_DOMAIN}"
  # Uncomment production HTTPS block (lines 60-109)
  sed -i.bak '60,109s/^#//' "${PROXY_CONF}" 2>/dev/null || {
    echo "[proxy/https_configure] ⚠️  Could not auto-uncomment HTTPS block. Please uncomment manually in ${PROXY_CONF}"
  }
  rm -f "${PROXY_CONF}.bak"
else
  echo "[proxy/https_configure] ⚠️  Production certificate not found. Run docker/scripts/proxy/https_init.sh first."
fi

if [ "$DEMO_HAS_CERT" = true ]; then
  echo "[proxy/https_configure] ✓ Demo certificate found for ${DEMO_DOMAIN}"
  # Uncomment demo HTTPS block (lines 154-201)
  sed -i.bak '154,201s/^#//' "${PROXY_CONF}" 2>/dev/null || {
    echo "[proxy/https_configure] ⚠️  Could not auto-uncomment HTTPS block. Please uncomment manually in ${PROXY_CONF}"
  }
  rm -f "${PROXY_CONF}.bak"
else
  echo "[proxy/https_configure] ⚠️  Demo certificate not found. Run docker/scripts/proxy/https_init.sh first."
fi

# Reload nginx to apply changes
echo "[proxy/https_configure] Reloading proxy nginx..."
compose exec proxy nginx -t && compose exec proxy nginx -s reload || {
  echo "[proxy/https_configure] ⚠️  Failed to reload nginx. Check configuration manually."
  exit 1
}

echo "[proxy/https_configure] ✓ HTTPS configuration complete!"

