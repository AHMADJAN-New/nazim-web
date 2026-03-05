#!/bin/bash
# Fix Grafana "Datasource provisioning error: data source not found" by resetting the DB.
# Run from repo root: bash docker/monitoring/fix-grafana-provisioning.sh

set -e
cd "$(dirname "$0")/../.."

echo "Stopping monitoring stack..."
docker compose -f docker-compose.monitoring.yml down

echo "Removing Grafana volume (clears corrupted provisioning state)..."
docker volume rm nazim-web_nazim_grafana_data 2>/dev/null || docker volume rm nazim_grafana_data 2>/dev/null || true

echo "Starting monitoring stack..."
docker compose -f docker-compose.monitoring.yml up -d

echo "Waiting for Grafana to be healthy..."
sleep 30
docker compose -f docker-compose.monitoring.yml ps

echo ""
echo "Grafana should now be accessible at http://localhost:3000 (or your server IP:3000)"
echo "Login: admin / (check GRAFANA_ADMIN_PASSWORD in docker/env/compose.prod.env)"
