#!/bin/bash
# Fix proxy issues: ensure containers are running, networks connected, and SSL certs handled

set -e

echo "=== Fixing Proxy Issues ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Ensure production containers are running
echo "1. Ensuring production containers are running..."
if ! docker ps --format '{{.Names}}' | grep -q "^nazim_prod_nginx$"; then
    echo -e "${YELLOW}Starting production containers...${NC}"
    docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d
    sleep 5
else
    echo -e "${GREEN}✓${NC} Production containers are running"
fi

# Step 2: Ensure demo containers are running
echo ""
echo "2. Ensuring demo containers are running..."
if ! docker ps --format '{{.Names}}' | grep -q "^nazim_demo_nginx$"; then
    echo -e "${YELLOW}Starting demo containers...${NC}"
    docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d
    sleep 5
else
    echo -e "${GREEN}✓${NC} Demo containers are running"
fi

# Step 3: Restart proxy to reconnect to networks
echo ""
echo "3. Restarting proxy to reconnect networks..."
docker compose -f docker-compose.proxy.yml restart proxy
sleep 3

# Step 4: Fix certificate permissions if they exist
echo ""
echo "4. Fixing certificate permissions..."
if docker exec nazim_proxy test -f /etc/letsencrypt/proxy/live/nazim.cloud/fullchain.pem 2>/dev/null; then
    docker exec nazim_proxy chmod 644 /etc/letsencrypt/proxy/live/nazim.cloud/*.pem 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Fixed production certificate permissions"
fi

if docker exec nazim_proxy test -f /etc/letsencrypt/proxy/live/demo.nazim.cloud/fullchain.pem 2>/dev/null; then
    docker exec nazim_proxy chmod 644 /etc/letsencrypt/proxy/live/demo.nazim.cloud/*.pem 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Fixed demo certificate permissions"
fi

# Step 5: Test nginx config
echo ""
echo "5. Testing nginx configuration..."
if docker exec nazim_proxy nginx -t > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Nginx configuration is valid"
    docker exec nazim_proxy nginx -s reload
    echo -e "${GREEN}✓${NC} Nginx reloaded"
else
    echo -e "${RED}✗${NC} Nginx configuration has errors"
    echo "Checking configuration..."
    docker exec nazim_proxy nginx -t
    exit 1
fi

# Step 6: Test connectivity
echo ""
echo "6. Testing connectivity..."
if docker exec nazim_proxy wget -qO- --timeout=5 http://nazim_prod_nginx:80/healthz > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Proxy can reach production nginx"
else
    echo -e "${RED}✗${NC} Proxy CANNOT reach production nginx"
fi

if docker exec nazim_proxy wget -qO- --timeout=5 http://nazim_demo_nginx:80/healthz > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Proxy can reach demo nginx"
else
    echo -e "${RED}✗${NC} Proxy CANNOT reach demo nginx"
fi

echo ""
echo "=== Fix Complete ==="
echo ""
echo "If SSL certificates are missing, initialize them:"
echo "  bash docker/scripts/proxy/https_init.sh"
echo ""
echo "Test the proxy:"
echo "  curl http://localhost/healthz"
echo "  curl -H 'Host: nazim.cloud' http://localhost/healthz"
echo "  curl -H 'Host: demo.nazim.cloud' http://localhost/healthz"

