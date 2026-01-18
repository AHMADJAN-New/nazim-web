#!/bin/bash
# Master script to start all environments (production, demo, proxy)
# Ensures proper startup order and dependencies

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=== Starting All Nazim Environments ==="
echo ""

# Step 1: Start production environment
echo -e "${YELLOW}Step 1: Starting production environment...${NC}"
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d

# Wait for production to be healthy
echo -e "${YELLOW}Waiting for production services to be healthy...${NC}"
timeout=120
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml ps | grep -q "nazim_prod_nginx.*Up.*healthy"; then
        echo -e "${GREEN}✓ Production nginx is healthy${NC}"
        break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
done

if [ $elapsed -ge $timeout ]; then
    echo -e "${RED}⚠ Production nginx did not become healthy within ${timeout}s${NC}"
fi

# Step 2: Start demo environment
echo ""
echo -e "${YELLOW}Step 2: Starting demo environment...${NC}"
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d

# Wait for demo to be healthy
echo -e "${YELLOW}Waiting for demo services to be healthy...${NC}"
timeout=120
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml ps | grep -q "nazim_demo_nginx.*Up.*healthy"; then
        echo -e "${GREEN}✓ Demo nginx is healthy${NC}"
        break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
done

if [ $elapsed -ge $timeout ]; then
    echo -e "${RED}⚠ Demo nginx did not become healthy within ${timeout}s${NC}"
fi

# Step 3: Ensure storage directories exist
echo ""
echo -e "${YELLOW}Step 3: Ensuring storage directories exist...${NC}"

# Production storage
docker exec nazim_prod_php mkdir -p /var/www/html/storage/logs 2>/dev/null || true
docker exec nazim_prod_php chmod -R 775 /var/www/html/storage 2>/dev/null || true
docker exec nazim_prod_php chown -R www-data:www-data /var/www/html/storage 2>/dev/null || true

# Demo storage
docker exec nazim_demo_php mkdir -p /var/www/html/storage/logs 2>/dev/null || true
docker exec nazim_demo_php chmod -R 775 /var/www/html/storage 2>/dev/null || true
docker exec nazim_demo_php chown -R www-data:www-data /var/www/html/storage 2>/dev/null || true

echo -e "${GREEN}✓ Storage directories ready${NC}"

# Step 4: Start proxy (depends on production and demo networks)
echo ""
echo -e "${YELLOW}Step 4: Starting reverse proxy...${NC}"
docker compose -f docker-compose.proxy.yml up -d

# CRITICAL: Restart proxy to ensure DNS resolution works for production/demo containers
# Proxy needs to resolve container names after they're running
echo -e "${YELLOW}Restarting proxy to refresh DNS resolution...${NC}"
docker compose -f docker-compose.proxy.yml restart proxy
sleep 3

# Wait for proxy to be healthy
echo -e "${YELLOW}Waiting for proxy to be healthy...${NC}"
timeout=30
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker compose -f docker-compose.proxy.yml ps | grep -q "nazim_proxy.*Up"; then
        echo -e "${GREEN}✓ Proxy is running${NC}"
        break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
done

if [ $elapsed -ge $timeout ]; then
    echo -e "${RED}⚠ Proxy did not start within ${timeout}s${NC}"
fi

# Step 5: Fix certificate permissions
echo ""
echo -e "${YELLOW}Step 5: Fixing certificate permissions...${NC}"
# Fix directory permissions (nginx worker needs to read certificates)
docker exec nazim_proxy chmod 755 /etc/letsencrypt/proxy/live/ 2>/dev/null || true
docker exec nazim_proxy find /etc/letsencrypt/proxy/live -type d -exec chmod 755 {} \; 2>/dev/null || true
docker exec nazim_proxy find /etc/letsencrypt/proxy/archive -type d -exec chmod 755 {} \; 2>/dev/null || true
# Fix file permissions (certificates are symlinks, fix actual files in archive)
docker exec nazim_proxy find /etc/letsencrypt/proxy/archive -name "*.pem" -exec chmod 644 {} \; 2>/dev/null || true
echo -e "${GREEN}✓ Certificate permissions fixed${NC}"

# Step 6: Reload nginx
echo ""
echo -e "${YELLOW}Step 6: Reloading nginx...${NC}"
docker exec nazim_proxy nginx -s reload 2>/dev/null || true
echo -e "${GREEN}✓ Nginx reloaded${NC}"

# Step 7: Verify connectivity
echo ""
echo -e "${YELLOW}Step 7: Verifying connectivity...${NC}"

# Test proxy health
if curl -s http://localhost/healthz > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Proxy health check passed${NC}"
else
    echo -e "${RED}✗ Proxy health check failed${NC}"
fi

# Test production routing
if curl -s -H "Host: nazim.cloud" http://localhost/healthz > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Production routing works${NC}"
else
    echo -e "${RED}✗ Production routing failed${NC}"
fi

# Test demo routing
if curl -s -H "Host: demo.nazim.cloud" http://localhost/healthz > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Demo routing works${NC}"
else
    echo -e "${RED}✗ Demo routing failed${NC}"
fi

echo ""
echo "=== Startup Complete ==="
echo ""
echo "Services:"
echo "  Production: https://nazim.cloud"
echo "  Demo: https://demo.nazim.cloud"
echo ""
echo "To view logs:"
echo "  docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs -f"
echo "  docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml logs -f"
echo "  docker compose -f docker-compose.proxy.yml logs -f"

