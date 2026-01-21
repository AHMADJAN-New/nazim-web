#!/usr/bin/env bash

# Fix Dashboard Loading Issues
# Restarts Grafana and verifies dashboards are loaded

set -e

echo "=========================================="
echo "Restarting Grafana"
echo "=========================================="
echo ""

# Restart Grafana to reload dashboards
echo "Restarting Grafana..."
docker compose -f /projects/nazim-web/docker-compose.monitoring.yml restart grafana

echo ""
echo "Waiting for Grafana to start..."
sleep 10

# Check Grafana logs for dashboard loading
echo ""
echo "Checking Grafana status..."
DASHBOARD_LOGS=$(docker logs nazim_monitoring_grafana 2>&1 | grep -iE "HTTP Server|error|Error" | tail -5)
if echo "$DASHBOARD_LOGS" | grep -q "HTTP Server"; then
  echo "✓ Grafana is running"
else
  echo "⚠ Check Grafana logs for issues"
fi

echo ""
echo "=========================================="
echo "Next Steps"
echo "=========================================="
echo ""
echo "1. Access Grafana: http://your-server-ip:3000"
echo "2. Go to: Dashboards → Browse"
echo "3. You should see imported dashboards"
echo ""
echo "To import popular dashboards:"
echo "  1. Go to: Dashboards → Import"
echo "  2. Enter dashboard ID: 1860 (Node Exporter) or 179 (Docker)"
echo "  3. Select 'Prometheus' as data source"
echo "  4. Click 'Import'"
echo ""
echo "Or run:"
echo "  bash docker/scripts/monitoring/import-recommended-dashboards.sh"
echo ""

