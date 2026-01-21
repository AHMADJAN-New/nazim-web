#!/usr/bin/env bash

# Quick check script for monitoring stack status

set -e

echo "=========================================="
echo "Monitoring Stack Status Check"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check containers
echo "1. Container Status"
echo "----------------------------------------"
for container in nazim_monitoring_grafana nazim_monitoring_prometheus nazim_monitoring_node_exporter nazim_monitoring_cadvisor; do
  if docker ps | grep -q "${container}"; then
    STATUS=$(docker ps --format "{{.Status}}" --filter "name=${container}")
    echo -e "${GREEN}✓${NC} ${container}: ${STATUS}"
  else
    echo -e "${RED}✗${NC} ${container}: Not running"
  fi
done
echo ""

# Check network
echo "2. Network Status"
echo "----------------------------------------"
if docker network ls | grep -q nazim_network; then
  echo -e "${GREEN}✓${NC} nazim_network exists"
else
  echo -e "${RED}✗${NC} nazim_network missing"
  echo "   Create with: docker network create nazim_network --driver bridge"
fi
echo ""

# Check ports
echo "3. Port Accessibility"
echo "----------------------------------------"
for port in 3000 9090 8080 9100; do
  if curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://localhost:${port}" >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Port ${port}: Accessible"
  else
    echo -e "${YELLOW}⚠${NC} Port ${port}: Not accessible (may still be starting)"
  fi
done
echo ""

# Check Grafana health
echo "4. Grafana Health"
echo "----------------------------------------"
GRAFANA_HEALTH=$(curl -s http://localhost:3000/api/health 2>/dev/null || echo "unreachable")
if [ "$GRAFANA_HEALTH" != "unreachable" ]; then
  echo -e "${GREEN}✓${NC} Grafana is healthy"
  echo "   Response: ${GRAFANA_HEALTH}"
else
  echo -e "${YELLOW}⚠${NC} Grafana health check failed (may still be starting)"
  echo "   Check logs: docker logs nazim_monitoring_grafana"
fi
echo ""

# Check Prometheus targets
echo "5. Prometheus Targets"
echo "----------------------------------------"
PROM_TARGETS=$(curl -s http://localhost:9090/api/v1/targets 2>/dev/null | grep -o '"health":"[^"]*"' | head -3 || echo "")
if [ -n "$PROM_TARGETS" ]; then
  echo -e "${GREEN}✓${NC} Prometheus is scraping targets"
  echo "   Targets: ${PROM_TARGETS}"
else
  echo -e "${YELLOW}⚠${NC} Prometheus targets check failed"
  echo "   Check: http://localhost:9090/targets"
fi
echo ""

echo "=========================================="
echo "Access URLs"
echo "=========================================="
echo "  Grafana:    http://$(hostname -I | awk '{print $1}'):3000"
echo "  Prometheus: http://$(hostname -I | awk '{print $1}'):9090"
echo "  cAdvisor:   http://$(hostname -I | awk '{print $1}'):8080"
echo ""
echo "If you can't access from external IP, check firewall:"
echo "  sudo ufw allow 3000/tcp"
echo "  sudo ufw allow 9090/tcp"
echo ""

