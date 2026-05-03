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

# Prefer the exact cert directory, but skip it if it is expired. Certbot can
# create suffixed names (for example nazim.cloud-0001) when issuing a temporary
# root-only cert while an old wildcard cert still exists under the exact name.
for CANDIDATE_DIR in "${LE_DIR}" "${LE_DIR}"-*; do
  CANDIDATE_FULLCHAIN="${CANDIDATE_DIR}/fullchain.pem"
  CANDIDATE_PRIVKEY="${CANDIDATE_DIR}/privkey.pem"

  if [ -f "${CANDIDATE_FULLCHAIN}" ] && [ -f "${CANDIDATE_PRIVKEY}" ] \
    && openssl x509 -checkend 0 -noout -in "${CANDIDATE_FULLCHAIN}" >/dev/null 2>&1; then
    echo "[nginx] Using Let's Encrypt certs for ${DOMAIN} from ${CANDIDATE_DIR}"
    ln -sf "${CANDIDATE_FULLCHAIN}" "${CERTS_DIR}/fullchain.pem"
    ln -sf "${CANDIDATE_PRIVKEY}" "${CERTS_DIR}/privkey.pem"
    exit 0
  fi
done

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

