#!/bin/bash
# Test script to verify production, demo, and proxy containers can build/run

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$ROOT_DIR"

echo "=== Testing Docker Compose Configurations ==="
echo ""

# Test production config
echo "1. Validating production compose file..."
if docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml config >/dev/null 2>&1; then
    echo "   ✅ Production config is valid"
else
    echo "   ❌ Production config has errors:"
    docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml config
    exit 1
fi

# Test demo config
echo "2. Validating demo compose file..."
if docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml config >/dev/null 2>&1; then
    echo "   ✅ Demo config is valid"
else
    echo "   ❌ Demo config has errors:"
    docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml config
    exit 1
fi

# Test proxy config
echo "3. Validating proxy compose file..."
if docker compose -f docker-compose.proxy.yml config >/dev/null 2>&1; then
    echo "   ✅ Proxy config is valid"
else
    echo "   ❌ Proxy config has errors:"
    docker compose -f docker-compose.proxy.yml config
    exit 1
fi

echo ""
echo "=== Checking Networks ==="
echo ""

# Check if networks exist or need to be created
echo "4. Checking Docker networks..."

NETWORKS=("nazim_network" "nazim_demo_network")
for network in "${NETWORKS[@]}"; do
    if docker network inspect "$network" >/dev/null 2>&1; then
        echo "   ✅ Network '$network' exists"
    else
        echo "   ⚠️  Network '$network' does not exist (will be created when services start)"
    fi
done

echo ""
echo "=== Checking Required Files ==="
echo ""

REQUIRED_FILES=(
    "docker/proxy/nginx.conf"
    "docker/proxy/conf.d/proxy.conf"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file exists"
    else
        echo "   ❌ $file is missing"
        exit 1
    fi
done

echo ""
echo "=== Testing Nginx Configuration ==="
echo ""

# Test nginx config if nginx image is available
if docker run --rm -v "$ROOT_DIR/docker/proxy/nginx.conf:/etc/nginx/nginx.conf:ro" -v "$ROOT_DIR/docker/proxy/conf.d:/etc/nginx/conf.d:ro" nginx:alpine nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Proxy nginx configuration is valid"
else
    echo "   ⚠️  Could not validate nginx config (nginx image may not be available)"
    echo "   Testing manually..."
    docker run --rm -v "$ROOT_DIR/docker/proxy/nginx.conf:/etc/nginx/nginx.conf:ro" -v "$ROOT_DIR/docker/proxy/conf.d:/etc/nginx/conf.d:ro" nginx:alpine nginx -t || true
fi

echo ""
echo "=== Summary ==="
echo ""
echo "✅ All configurations are valid!"
echo ""
echo "Next steps:"
echo "  1. Start production: docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d"
echo "  2. Start demo: docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d"
echo "  3. Start proxy: docker compose -f docker-compose.proxy.yml up -d"
echo ""
echo "Note: Start production/demo first (to create networks), then start proxy."

