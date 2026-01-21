#!/usr/bin/env bash

# Import Docker Container Dashboard (11074)
# Shows individual containers with detailed metrics

set -e

echo "=========================================="
echo "Import Docker Container Dashboard"
echo "=========================================="
echo ""
echo "Dashboard 11074: Docker Container Stats"
echo "  - Shows each container individually"
echo "  - Per-container CPU, Memory, Network"
echo "  - Container selection and filtering"
echo ""
echo "To import:"
echo ""
echo "1. Open Grafana: http://168.231.125.153:3000"
echo "2. Go to: Dashboards → Import"
echo "3. Enter dashboard ID: 11074"
echo "4. Click 'Load'"
echo "5. Select 'Prometheus' as data source"
echo "6. Click 'Import'"
echo ""
echo "After importing, you'll see:"
echo "  - All containers listed individually"
echo "  - Per-container metrics panels"
echo "  - Container selection dropdown"
echo ""
echo "Dashboard URL:"
echo "  https://grafana.com/grafana/dashboards/11074"
echo ""
echo "Alternative dashboards for container monitoring:"
echo "  - 14282: cAdvisor Exporter (very detailed)"
echo "  - 179: Docker Container & Host Metrics (you have this)"
echo ""

