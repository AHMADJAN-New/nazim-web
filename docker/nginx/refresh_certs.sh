#!/bin/sh
set -eu

DOMAIN="${DOMAIN:-nazim.cloud}"

LE_DIR="/etc/letsencrypt/live/${DOMAIN}"
LE_FULLCHAIN="${LE_DIR}/fullchain.pem"
LE_PRIVKEY="${LE_DIR}/privkey.pem"

CERTS_DIR="/etc/nginx/certs/${DOMAIN}"
SELF_DIR="/etc/nginx/selfsigned/${DOMAIN}"
SELF_FULLCHAIN="${SELF_DIR}/fullchain.pem"
SELF_PRIVKEY="${SELF_DIR}/privkey.pem"

mkdir -p "${CERTS_DIR}" "${SELF_DIR}"

if [ -f "${LE_FULLCHAIN}" ] && [ -f "${LE_PRIVKEY}" ]; then
  echo "[nginx] Using Let's Encrypt certs for ${DOMAIN}"
  ln -sf "${LE_FULLCHAIN}" "${CERTS_DIR}/fullchain.pem"
  ln -sf "${LE_PRIVKEY}" "${CERTS_DIR}/privkey.pem"
  exit 0
fi

if [ ! -f "${SELF_FULLCHAIN}" ] || [ ! -f "${SELF_PRIVKEY}" ]; then
  echo "[nginx] No LE cert yet; generating temporary self-signed cert for ${DOMAIN}"
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -subj "/CN=${DOMAIN}" \
    -keyout "${SELF_PRIVKEY}" \
    -out "${SELF_FULLCHAIN}" >/dev/null 2>&1
fi

echo "[nginx] Using self-signed certs for ${DOMAIN} (temporary)"
ln -sf "${SELF_FULLCHAIN}" "${CERTS_DIR}/fullchain.pem"
ln -sf "${SELF_PRIVKEY}" "${CERTS_DIR}/privkey.pem"

