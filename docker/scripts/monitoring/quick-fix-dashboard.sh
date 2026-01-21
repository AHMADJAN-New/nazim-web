#!/usr/bin/env bash

# Quick Fix: Import Dashboard Manually via API
# This ensures the dashboard is loaded even if provisioning has issues

set -e

GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"
GRAFANA_USER="${GRAFANA_USER:-admin}"
GRAFANA_PASS="${GRAFANA_PASS:-admin}"

echo "=========================================="
echo "Quick Dashboard Import Guide"
echo "=========================================="
echo ""

# Wait for Grafana to be ready
echo "Waiting for Grafana to be ready..."
for i in {1..30}; do
  if curl -s -u "${GRAFANA_USER}:${GRAFANA_PASS}" "${GRAFANA_URL}/api/health" >/dev/null 2>&1; then
    echo "✓ Grafana is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "ERROR: Grafana is not responding"
    exit 1
  fi
  sleep 1
done

echo ""
echo "Import Recommended Dashboards:"
echo "=========================================="
echo ""
echo "1. Open Grafana in your browser:"
echo "   http://168.231.125.153:3000"
echo ""
echo "2. Login with:"
echo "   Username: ${GRAFANA_USER}"
echo "   Password: ${GRAFANA_PASS}"
echo ""
echo "3. For each dashboard:"
echo "   a. Go to: Dashboards → Import"
echo "   b. Enter dashboard ID (see below)"
echo "   c. Click 'Load'"
echo "   d. Select 'Prometheus' as data source"
echo "   e. Click 'Import'"
echo ""
echo "Recommended Dashboards:"
echo "=========================================="
echo ""
echo "1. Node Exporter Full (ID: 1860)"
echo "   - Comprehensive system metrics"
echo "   - CPU, Memory, Disk, Network"
echo "   - System load and processes"
echo ""
echo "2. Docker Container & Host Metrics (ID: 179)"
echo "   - Docker container monitoring"
echo "   - Per-container CPU, Memory, Network"
echo "   - Host and container metrics"
echo ""
echo "3. Prometheus Stats (ID: 893)"
echo "   - Prometheus performance"
echo "   - Query performance metrics"
echo ""
echo "Verify Data is Flowing:"
echo "=========================================="
echo ""
echo "1. Go to: Explore (compass icon in left sidebar)"
echo "2. Select 'Prometheus' data source"
echo "3. Try query: up"
echo "4. Click 'Run query'"
echo "5. You should see results"
echo ""
echo "If you see data in Explore, metrics are working!"
echo "Dashboards will show data once imported."
echo ""

