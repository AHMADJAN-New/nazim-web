#!/usr/bin/env bash

# Fix firewall for monitoring ports

set -e

echo "=========================================="
echo "Opening Firewall Ports for Monitoring"
echo "=========================================="
echo ""

# Check if UFW is active
if sudo ufw status | grep -q "Status: active"; then
  echo "UFW is active. Opening ports..."
  
  # Open monitoring ports
  sudo ufw allow 3000/tcp comment "Grafana"
  sudo ufw allow 9090/tcp comment "Prometheus"
  sudo ufw allow 8080/tcp comment "cAdvisor"
  sudo ufw allow 9100/tcp comment "Node Exporter"
  
  echo ""
  echo "✓ Ports opened:"
  sudo ufw status | grep -E "3000|9090|8080|9100"
  echo ""
else
  echo "UFW is not active. Checking other firewall..."
  
  # Check if firewalld is active
  if systemctl is-active --quiet firewalld 2>/dev/null; then
    echo "firewalld is active. Opening ports..."
    sudo firewall-cmd --permanent --add-port=3000/tcp
    sudo firewall-cmd --permanent --add-port=9090/tcp
    sudo firewall-cmd --permanent --add-port=8080/tcp
    sudo firewall-cmd --permanent --add-port=9100/tcp
    sudo firewall-cmd --reload
    echo "✓ Ports opened in firewalld"
  else
    echo "No active firewall detected. Ports should be accessible."
  fi
fi

echo ""
echo "=========================================="
echo "Testing Access"
echo "=========================================="
echo ""

# Test local access
for port in 3000 9090; do
  if curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://localhost:${port}" >/dev/null 2>&1; then
    echo "✓ Port ${port}: Accessible locally"
  else
    echo "✗ Port ${port}: Not accessible locally"
  fi
done

echo ""
echo "Access URLs:"
echo "  Grafana:    http://$(hostname -I | awk '{print $1}'):3000"
echo "  Prometheus: http://$(hostname -I | awk '{print $1}'):9090"
echo ""
echo "If still not accessible externally, check:"
echo "  1. Cloud provider firewall rules (AWS Security Groups, etc.)"
echo "  2. Network ACLs"
echo "  3. Try accessing from server itself: curl http://localhost:3000"
echo ""

