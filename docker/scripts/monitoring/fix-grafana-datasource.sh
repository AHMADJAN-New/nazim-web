#!/usr/bin/env bash

# Fix Grafana Datasource Configuration
# This script helps configure Prometheus datasource after Grafana starts

set -e

GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"
GRAFANA_USER="${GRAFANA_USER:-admin}"
GRAFANA_PASS="${GRAFANA_PASS:-admin}"

echo "=========================================="
echo "Fix Grafana Datasource Configuration"
echo "=========================================="
echo ""

# Wait for Grafana to be ready
echo "Waiting for Grafana to be ready..."
for i in {1..60}; do
  if curl -s -u "${GRAFANA_USER}:${GRAFANA_PASS}" "${GRAFANA_URL}/api/health" >/dev/null 2>&1; then
    echo "✓ Grafana is ready"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "ERROR: Grafana is not responding after 60 seconds"
    exit 1
  fi
  sleep 1
done

echo ""
echo "Manual Configuration Steps:"
echo "=========================================="
echo ""
echo "1. Open Grafana: http://168.231.125.153:3000"
echo "2. Login: ${GRAFANA_USER} / ${GRAFANA_PASS}"
echo ""
echo "3. Go to: Configuration → Data Sources"
echo ""
echo "4. Click 'Add data source'"
echo ""
echo "5. Select 'Prometheus'"
echo ""
echo "6. Configure:"
echo "   - URL: http://prometheus:9090"
echo "   - Access: Server (default)"
echo ""
echo "7. Click 'Save & Test'"
echo "   Should show: ✅ 'Data source is working'"
echo ""
echo "Alternative: Use API to configure"
echo "=========================================="
echo ""
echo "Run this command to configure via API:"
echo ""
echo "curl -X POST '${GRAFANA_URL}/api/datasources' \\"
echo "  -u '${GRAFANA_USER}:${GRAFANA_PASS}' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"name\": \"Prometheus\","
echo "    \"type\": \"prometheus\","
echo "    \"url\": \"http://prometheus:9090\","
echo "    \"access\": \"proxy\","
echo "    \"isDefault\": true"
echo "  }'"
echo ""

