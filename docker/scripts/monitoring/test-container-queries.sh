#!/usr/bin/env bash

# Test Container Queries That Work With Your Setup
# These queries match the actual container ID format from cAdvisor

set -e

echo "=========================================="
echo "Testing Container Metrics Queries"
echo "=========================================="
echo ""

PROMETHEUS_URL="http://localhost:9090"

echo "1. Checking container metrics availability..."
echo "----------------------------------------"

# Test container CPU
CPU_COUNT=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=container_cpu_usage_seconds_total{id=~\"\/system.slice\/docker-.*\"}" | jq '.data.result | length' 2>/dev/null || echo "0")
echo "  Container CPU metrics: ${CPU_COUNT}"

# Test container memory
MEM_COUNT=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=container_memory_usage_bytes{id=~\"\/system.slice\/docker-.*\"}" | jq '.data.result | length' 2>/dev/null || echo "0")
echo "  Container Memory metrics: ${MEM_COUNT}"

# Test container network
NET_COUNT=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=container_network_receive_bytes_total{id=~\"\/system.slice\/docker-.*\"}" | jq '.data.result | length' 2>/dev/null || echo "0")
echo "  Container Network metrics: ${NET_COUNT}"

echo ""
echo "2. Container ID format..."
echo "----------------------------------------"
CONTAINER_IDS=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=container_last_seen{id=~\"\/system.slice\/docker-.*\"}" | jq -r '.data.result[].metric.id' 2>/dev/null | head -3)
if [ -n "$CONTAINER_IDS" ]; then
  echo "  Found container IDs:"
  echo "$CONTAINER_IDS" | while read id; do
    echo "    - $id"
  done
else
  echo "  ⚠ No container IDs found"
fi

echo ""
echo "3. Working Queries for Grafana Explore..."
echo "----------------------------------------"
echo ""
echo "Copy these queries into Grafana Explore (Prometheus):"
echo ""
echo "# Container CPU Usage (all containers)"
echo "rate(container_cpu_usage_seconds_total{id=~\"\/system.slice\/docker-.*\"}[5m]) * 100"
echo ""
echo "# Container Memory Usage (all containers)"
echo "container_memory_usage_bytes{id=~\"\/system.slice\/docker-.*\"}"
echo ""
echo "# Container Network Receive (all containers)"
echo "rate(container_network_receive_bytes_total{id=~\"\/system.slice\/docker-.*\"}[5m])"
echo ""
echo "# Container Network Transmit (all containers)"
echo "rate(container_network_transmit_bytes_total{id=~\"\/system.slice\/docker-.*\"}[5m])"
echo ""
echo "# List all containers"
echo "container_last_seen{id=~\"\/system.slice\/docker-.*\"}"
echo ""

if [ "$CPU_COUNT" -gt 0 ] && [ "$MEM_COUNT" -gt 0 ]; then
  echo "✅ Metrics are available!"
  echo "   Dashboard 11074 should work, or use Explore with queries above."
else
  echo "⚠ Metrics might not be available yet."
  echo "   Wait a few minutes and check again."
fi
echo ""

