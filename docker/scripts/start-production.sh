#!/bin/bash
# Start only production environment

set -e

echo "=== Starting Production Environment ==="
echo ""

# Start production containers
echo "Starting production containers..."
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo ""
echo "Waiting for services to be healthy..."
timeout=120
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml ps | grep -q "nazim_prod_nginx.*Up.*healthy"; then
        echo "✓ Production nginx is healthy"
        break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
done

if [ $elapsed -ge $timeout ]; then
    echo "⚠ Production nginx did not become healthy within ${timeout}s"
fi

# Ensure storage directories exist
echo ""
echo "Ensuring storage directories exist..."
docker exec nazim_prod_php mkdir -p /var/www/html/storage/logs 2>/dev/null || true
docker exec nazim_prod_php chmod -R 775 /var/www/html/storage 2>/dev/null || true
docker exec nazim_prod_php chown -R www-data:www-data /var/www/html/storage 2>/dev/null || true
echo "✓ Storage directories ready"

echo ""
echo "=== Production Started ==="
echo ""
echo "Production URL: https://nazim.cloud"
echo ""
echo "To view logs:"
echo "  docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs -f"

