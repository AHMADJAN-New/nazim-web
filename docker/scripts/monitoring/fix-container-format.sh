#!/usr/bin/env bash

# Fix Container ID Format to Match Standard Format
# Restarts cAdvisor and Prometheus with updated configuration

set -e

echo "=========================================="
echo "Fixing Container ID Format"
echo "=========================================="
echo ""

cd /projects/nazim-web

echo "1. Restarting cAdvisor with updated configuration..."
docker compose -f docker-compose.monitoring.yml restart cadvisor

echo ""
echo "2. Waiting for cAdvisor to start..."
sleep 10

echo ""
echo "3. Reloading Prometheus configuration..."
curl -X POST http://localhost:9090/-/reload 2>/dev/null || echo "⚠ Prometheus reload might need manual restart"

echo ""
echo "4. Waiting for metrics to populate..."
sleep 30

echo ""
echo "5. Verifying new container format..."
echo "----------------------------------------"

# Check if container_name label exists
CONTAINER_COUNT=$(curl -s 'http://localhost:9090/api/v1/query?query=container_cpu_usage_seconds_total{id=~"/system.slice/docker-.*scope"}' | jq '[.data.result[] | select(.metric.id | startswith("/system.slice/docker-"))] | length' 2>/dev/null || echo "0")
echo "  Containers found: ${CONTAINER_COUNT}"

# Check if relabeling worked (check for container_id or container_name labels)
RELABELED_COUNT=$(curl -s 'http://localhost:9090/api/v1/query?query=container_cpu_usage_seconds_total' | jq '[.data.result[] | select(.metric.container_id != null or .metric.container_name != null)] | length' 2>/dev/null || echo "0")
echo "  Containers with relabeled IDs: ${RELABELED_COUNT}"

echo ""
if [ "$RELABELED_COUNT" -gt 0 ]; then
  echo "✅ Container format fix applied!"
  echo ""
  echo "Test queries in Grafana Explore:"
  echo "  container_cpu_usage_seconds_total{container_name=~\"nazim.*\"}"
  echo "  container_cpu_usage_seconds_total{container_id=~\".*\"}"
else
  echo "⚠ Relabeling might need more time or Prometheus restart"
  echo ""
  echo "Try restarting Prometheus:"
  echo "  docker compose -f docker-compose.monitoring.yml restart prometheus"
fi
echo ""

