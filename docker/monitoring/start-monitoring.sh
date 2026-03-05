#!/bin/bash

# Start Grafana Loki monitoring stack for Nazim
# This script sets up log monitoring with Grafana

set -e

echo "🚀 Starting Grafana Loki monitoring stack..."

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install docker-compose."
    exit 1
fi

# Create network if it doesn't exist
echo "📡 Creating Docker network..."
docker network create nazim_network 2>/dev/null || echo "Network already exists"

# Use same project name as main app so Promtail shares the backend storage volume (Laravel logs).
# If you start prod with -p NAME, start monitoring with the same: docker compose -p NAME -f docker-compose.monitoring.yml up -d
echo "🔧 Starting monitoring services..."
docker-compose -f docker-compose.monitoring.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "📊 Checking service status..."
docker-compose -f docker-compose.monitoring.yml ps

echo ""
echo "✅ Monitoring stack started successfully!"
echo ""
echo "📈 Access Grafana at: http://localhost:3000"
echo "   Username: admin (or check GRAFANA_ADMIN_USER env var)"
echo "   Password: admin (or check GRAFANA_ADMIN_PASSWORD env var)"
echo ""
echo "📋 Available services:"
echo "   - Grafana: http://localhost:3000"
echo "   - Loki: http://localhost:3100"
echo "   - Prometheus: http://localhost:9090"
echo ""
echo "🔍 To view logs:"
echo "   docker-compose -f docker-compose.monitoring.yml logs -f"
echo ""
echo "🛑 To stop:"
echo "   docker-compose -f docker-compose.monitoring.yml down"
echo ""


