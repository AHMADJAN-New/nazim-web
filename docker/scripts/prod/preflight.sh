#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"

if [[ ! -f "${COMPOSE_ENV}" ]]; then
  echo "[preflight] ERROR: missing ${COMPOSE_ENV}"
  echo "[preflight] Create it from docker/env/compose.prod.env.example"
  exit 1
fi

# shellcheck disable=SC1090
source "${COMPOSE_ENV}"

DOMAIN="${DOMAIN:-}"
APP_URL="${APP_URL:-}"
SERVER_IP="${SERVER_IP:-}"

if [[ -z "${DOMAIN}" ]]; then
  echo "[preflight] ERROR: DOMAIN is empty in ${COMPOSE_ENV}"
  exit 1
fi

if [[ -z "${APP_URL}" ]]; then
  echo "[preflight] ERROR: APP_URL is empty in ${COMPOSE_ENV}"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "[preflight] ERROR: docker not installed"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[preflight] ERROR: docker compose plugin not available"
  exit 1
fi

# Check firewall status (optional - informational only)
if command -v ufw >/dev/null 2>&1; then
  if sudo ufw status | grep -q "Status: active"; then
    HTTP_PORT="${HTTP_PORT:-80}"
    HTTPS_PORT="${HTTPS_PORT:-443}"
    if sudo ufw status | grep -q "${HTTP_PORT}/tcp" && sudo ufw status | grep -q "${HTTPS_PORT}/tcp"; then
      echo "[preflight] Firewall: Active (HTTP/HTTPS ports allowed)"
    else
      echo "[preflight] WARNING: Firewall active but HTTP/HTTPS ports may not be configured"
    fi
  else
    echo "[preflight] WARNING: Firewall (UFW) is not active"
  fi
fi

echo "[preflight] DOMAIN=${DOMAIN}"
echo "[preflight] APP_URL=${APP_URL}"

if [[ -n "${SERVER_IP}" ]]; then
  RESOLVED="$(getent ahosts "${DOMAIN}" | awk 'NR==1{print $1}')"
  if [[ -z "${RESOLVED}" ]]; then
    echo "[preflight] WARNING: could not resolve ${DOMAIN} (DNS not ready?)"
  else
    echo "[preflight] DNS ${DOMAIN} -> ${RESOLVED} (expected ${SERVER_IP})"
    if [[ "${RESOLVED}" != "${SERVER_IP}" ]]; then
      echo "[preflight] WARNING: DNS mismatch. Let's Encrypt will fail until A record points to this server."
    fi
  fi
fi

echo "[preflight] OK"

