#!/bin/bash
# Master script to stop all environments gracefully

set -e

echo "=== Stopping All Nazim Environments ==="
echo ""

echo "Stopping reverse proxy..."
docker compose -f docker-compose.proxy.yml down

echo "Stopping demo environment..."
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml down

echo "Stopping production environment..."
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml down

echo ""
echo "=== All Environments Stopped ==="

