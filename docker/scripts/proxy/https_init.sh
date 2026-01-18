#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.proxy.yml"

# Source environment if available
if [ -f "${ROOT_DIR}/docker/env/compose.proxy.env" ]; then
  source "${ROOT_DIR}/docker/env/compose.proxy.env"
fi

PROD_DOMAIN="${PROD_DOMAIN:-nazim.cloud}"
DEMO_DOMAIN="${DEMO_DOMAIN:-demo.nazim.cloud}"
EMAIL="${PROXY_LETSENCRYPT_EMAIL:-admin@nazim.cloud}"

compose() {
  docker compose -f "${COMPOSE_FILE}" "$@"
}

echo "[proxy/https_init] Initializing SSL certificates for proxy..."
echo "[proxy/https_init] Production domain: ${PROD_DOMAIN}"
echo "[proxy/https_init] Demo domain: ${DEMO_DOMAIN}"
echo "[proxy/https_init] Email: ${EMAIL}"

# Ensure proxy is running to serve ACME challenge
echo "[proxy/https_init] Ensuring proxy is running..."
compose up -d proxy

# Wait for proxy to be ready
echo "[proxy/https_init] Waiting for proxy to be ready..."
sleep 3

# Issue certificate for production domain
if [ ! -z "${PROD_DOMAIN}" ] && [ "${PROD_DOMAIN}" != "none" ]; then
  echo "[proxy/https_init] Issuing certificate for ${PROD_DOMAIN}..."
  compose run --rm proxy_certbot certonly \
    --webroot -w /var/www/certbot \
    -d "${PROD_DOMAIN}" \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --non-interactive || {
    echo "[proxy/https_init] ⚠️  Failed to issue certificate for ${PROD_DOMAIN} (may already exist or DNS not configured)"
  }
fi

# Issue certificate for demo domain
if [ ! -z "${DEMO_DOMAIN}" ] && [ "${DEMO_DOMAIN}" != "none" ]; then
  echo "[proxy/https_init] Issuing certificate for ${DEMO_DOMAIN}..."
  compose run --rm proxy_certbot certonly \
    --webroot -w /var/www/certbot \
    -d "${DEMO_DOMAIN}" \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --non-interactive || {
    echo "[proxy/https_init] ⚠️  Failed to issue certificate for ${DEMO_DOMAIN} (may already exist or DNS not configured)"
  }
fi

echo "[proxy/https_init] Certificate initialization complete."
echo "[proxy/https_init] Next: Run docker/scripts/proxy/https_configure.sh to enable HTTPS in nginx"

