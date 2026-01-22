#!/usr/bin/env bash
set -euo pipefail

# Quick fix script for monitoring stack issues
# This script ensures the network exists and restarts monitoring services

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
MONITORING_COMPOSE_FILE="${ROOT_DIR}/docker-compose.monitoring.yml"

echo "[fix-monitoring] Ensuring network exists..."
if ! docker network inspect nazim_network >/dev/null 2>&1; then
  echo "[fix-monitoring] Creating nazim_network..."
  docker network create nazim_network --driver bridge
else
  echo "[fix-monitoring] Network nazim_network already exists"
fi

echo "[fix-monitoring] Restarting monitoring stack..."
docker compose -f "${MONITORING_COMPOSE_FILE}" restart

echo "[fix-monitoring] Waiting for services to be healthy..."
sleep 15

echo "[fix-monitoring] Service status:"
docker compose -f "${MONITORING_COMPOSE_FILE}" ps

echo "[fix-monitoring] Done."
echo "[fix-monitoring] Grafana: http://$(hostname -I | awk '{print $1}'):3000 (admin/admin)"

