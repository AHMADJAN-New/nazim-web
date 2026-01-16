#!/bin/sh
set -eu

DOMAIN="${DOMAIN:-nazim.cloud}"

echo "[nginx] DOMAIN=${DOMAIN}"

# Render nginx config from template (envsubst)
if [ -f /etc/nginx/conf.d/default.conf.template ]; then
  envsubst '${DOMAIN}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
fi

if [ -x /refresh_certs.sh ]; then
  /refresh_certs.sh
fi

exec "$@"

