#!/usr/bin/env bash

# Test Working Container Queries
# These queries work with your container ID format

set -e

echo "=========================================="
echo "Testing Working Container Queries"
echo "=========================================="
echo ""

PROMETHEUS_URL="http://localhost:9090"

echo "1. Testing queries that should work..."
echo "----------------------------------------"

# Test without regex first
echo "Testing: container_cpu_usage_seconds_total (all)"
ALL_COUNT=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=container_cpu_usage_seconds_total" | jq '[.data.result[] | select(.metric.id | startswith("/system.slice/docker-"))] | length' 2>/dev/null || echo "0")
echo "  Containers found (jq filter): ${ALL_COUNT}"

# Test with simple regex
echo "Testing: container_cpu_usage_seconds_total{id=~\"/system.slice/docker-.*\"}"
REGEX_COUNT=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=container_cpu_usage_seconds_total{id=~\"/system.slice/docker-.*\"}" | jq '.data.result | length' 2>/dev/null || echo "0")
echo "  Containers found (regex): ${REGEX_COUNT}"

echo ""
echo "2. Working Solution: Use Grafana Explore"
echo "----------------------------------------"
echo ""
echo "Since regex queries return 0, use Grafana Explore with these queries:"
echo ""
echo "# Get all container metrics (no filter)"
echo "container_cpu_usage_seconds_total"
echo ""
echo "# Then filter in Grafana UI by:"
echo "  - id contains '/system.slice/docker-'"
echo ""
echo "# Or use this query (might work):"
echo "container_cpu_usage_seconds_total{id=~\"/system.slice/docker-.*\"}"
echo ""
echo "3. Alternative: Use label_values to get container IDs"
echo "----------------------------------------"
echo ""
echo "In Grafana Explore, use:"
echo "  label_values(container_cpu_usage_seconds_total, id)"
echo ""
echo "This will show all container IDs, then you can filter manually."
echo ""

if [ "$ALL_COUNT" -gt 0 ]; then
  echo "✅ Metrics ARE available!"
  echo "   Use Grafana Explore with queries above."
  echo "   Filter by container ID manually if regex doesn't work."
else
  echo "⚠ Metrics might not be available yet."
  echo "   Wait a few minutes and check again."
fi
echo ""

