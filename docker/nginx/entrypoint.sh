#!/bin/sh
set -e

DOMAIN="${DOMAIN:-}"

if [ -z "$DOMAIN" ]; then
  echo "[nginx] ERROR: DOMAIN env is empty"
  exit 1
fi

CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
HTTP_TPL="/etc/nginx/conf.d/http.conf.template"
HTTPS_TPL="/etc/nginx/conf.d/https.conf.template"
OUT="/etc/nginx/conf.d/default.conf"

echo "[nginx] DOMAIN=$DOMAIN"

if [ -f "$CERT" ]; then
  echo "[nginx] Found Let's Encrypt cert. Rendering HTTPS config."
  envsubst '${DOMAIN}' < "$HTTPS_TPL" > "$OUT"
else
  echo "[nginx] No Let's Encrypt cert yet. Rendering HTTP bootstrap config."
  envsubst '${DOMAIN}' < "$HTTP_TPL" > "$OUT"
fi

exec "$@"

