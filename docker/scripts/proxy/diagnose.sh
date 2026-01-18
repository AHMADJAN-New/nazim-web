#!/bin/bash
# Diagnostic script for proxy issues

set -e

echo "=== Proxy Diagnostic Script ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if proxy container is running
echo "1. Checking proxy container status..."
if docker ps --format '{{.Names}}' | grep -q "^nazim_proxy$"; then
    echo -e "${GREEN}✓${NC} Proxy container is running"
else
    echo -e "${RED}✗${NC} Proxy container is NOT running"
    echo "   Run: docker compose -f docker-compose.proxy.yml up -d"
    exit 1
fi

# Check if production containers are running
echo ""
echo "2. Checking production containers..."
if docker ps --format '{{.Names}}' | grep -q "^nazim_prod_nginx$"; then
    echo -e "${GREEN}✓${NC} Production nginx container is running"
else
    echo -e "${RED}✗${NC} Production nginx container is NOT running"
    echo "   Run: docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d"
fi

# Check if demo containers are running
echo ""
echo "3. Checking demo containers..."
if docker ps --format '{{.Names}}' | grep -q "^nazim_demo_nginx$"; then
    echo -e "${GREEN}✓${NC} Demo nginx container is running"
else
    echo -e "${RED}✗${NC} Demo nginx container is NOT running"
    echo "   Run: docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d"
fi

# Check networks
echo ""
echo "4. Checking networks..."
if docker network ls --format '{{.Name}}' | grep -q "^nazim-web_nazim_network$"; then
    echo -e "${GREEN}✓${NC} Production network exists"
else
    echo -e "${RED}✗${NC} Production network does NOT exist"
fi

if docker network ls --format '{{.Name}}' | grep -q "^nazim-web_nazim_demo_network$"; then
    echo -e "${GREEN}✓${NC} Demo network exists"
else
    echo -e "${RED}✗${NC} Demo network does NOT exist"
fi

# Check proxy network connectivity
echo ""
echo "5. Checking proxy network connectivity..."
if docker network inspect nazim-web_nazim_network --format '{{range .Containers}}{{.Name}} {{end}}' | grep -q "nazim_proxy"; then
    echo -e "${GREEN}✓${NC} Proxy connected to production network"
else
    echo -e "${RED}✗${NC} Proxy NOT connected to production network"
fi

if docker network inspect nazim-web_nazim_demo_network --format '{{range .Containers}}{{.Name}} {{end}}' | grep -q "nazim_proxy"; then
    echo -e "${GREEN}✓${NC} Proxy connected to demo network"
else
    echo -e "${RED}✗${NC} Proxy NOT connected to demo network"
fi

# Test DNS resolution from proxy
echo ""
echo "6. Testing DNS resolution from proxy..."
if docker exec nazim_proxy nslookup nazim_prod_nginx > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Proxy can resolve nazim_prod_nginx"
else
    echo -e "${RED}✗${NC} Proxy CANNOT resolve nazim_prod_nginx"
fi

if docker exec nazim_proxy nslookup nazim_demo_nginx > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Proxy can resolve nazim_demo_nginx"
else
    echo -e "${RED}✗${NC} Proxy CANNOT resolve nazim_demo_nginx"
fi

# Check SSL certificates
echo ""
echo "7. Checking SSL certificates..."
if docker exec nazim_proxy test -f /etc/letsencrypt/proxy/live/nazim.cloud/fullchain.pem 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Production SSL certificate exists"
else
    echo -e "${YELLOW}⚠${NC} Production SSL certificate does NOT exist"
    echo "   Run: bash docker/scripts/proxy/https_init.sh"
fi

if docker exec nazim_proxy test -f /etc/letsencrypt/proxy/live/demo.nazim.cloud/fullchain.pem 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Demo SSL certificate exists"
else
    echo -e "${YELLOW}⚠${NC} Demo SSL certificate does NOT exist"
    echo "   Run: bash docker/scripts/proxy/https_init.sh"
fi

# Check certificate permissions
echo ""
echo "8. Checking certificate permissions..."
if docker exec nazim_proxy test -r /etc/letsencrypt/proxy/live/nazim.cloud/fullchain.pem 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Production certificate is readable"
else
    if docker exec nazim_proxy test -f /etc/letsencrypt/proxy/live/nazim.cloud/fullchain.pem 2>/dev/null; then
        echo -e "${RED}✗${NC} Production certificate exists but is NOT readable"
        echo "   Fix: docker exec nazim_proxy chmod 644 /etc/letsencrypt/proxy/live/nazim.cloud/*.pem"
    fi
fi

if docker exec nazim_proxy test -r /etc/letsencrypt/proxy/live/demo.nazim.cloud/fullchain.pem 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Demo certificate is readable"
else
    if docker exec nazim_proxy test -f /etc/letsencrypt/proxy/live/demo.nazim.cloud/fullchain.pem 2>/dev/null; then
        echo -e "${RED}✗${NC} Demo certificate exists but is NOT readable"
        echo "   Fix: docker exec nazim_proxy chmod 644 /etc/letsencrypt/proxy/live/demo.nazim.cloud/*.pem"
    fi
fi

# Test HTTP connectivity
echo ""
echo "9. Testing HTTP connectivity..."
if docker exec nazim_proxy wget -qO- --timeout=5 http://nazim_prod_nginx:80/healthz > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Proxy can reach production nginx via HTTP"
else
    echo -e "${RED}✗${NC} Proxy CANNOT reach production nginx via HTTP"
fi

if docker exec nazim_proxy wget -qO- --timeout=5 http://nazim_demo_nginx:80/healthz > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Proxy can reach demo nginx via HTTP"
else
    echo -e "${RED}✗${NC} Proxy CANNOT reach demo nginx via HTTP"
fi

# Check nginx config
echo ""
echo "10. Checking nginx configuration..."
if docker exec nazim_proxy nginx -t > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Nginx configuration is valid"
else
    echo -e "${RED}✗${NC} Nginx configuration has errors"
    echo "   Run: docker exec nazim_proxy nginx -t"
fi

echo ""
echo "=== Diagnostic Complete ==="
echo ""
echo "Next steps:"
echo "1. Ensure all containers are running (production, demo, proxy)"
echo "2. Initialize SSL certificates if missing: bash docker/scripts/proxy/https_init.sh"
echo "3. Reload nginx: docker exec nazim_proxy nginx -s reload"
echo "4. Test: curl http://localhost/healthz"

