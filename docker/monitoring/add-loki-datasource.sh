#!/bin/bash

# Script to manually add Loki datasource to Grafana after it's running
# This is needed because automatic provisioning might fail

GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"
GRAFANA_USER="${GRAFANA_ADMIN_USER:-admin}"
GRAFANA_PASS="${GRAFANA_ADMIN_PASSWORD:-admin}"

echo "Adding Loki datasource to Grafana..."

# Get API key or use basic auth
RESPONSE=$(curl -s -X POST "${GRAFANA_URL}/api/datasources" \
  -u "${GRAFANA_USER}:${GRAFANA_PASS}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Loki",
    "type": "loki",
    "access": "proxy",
    "url": "http://loki:3100",
    "uid": "loki",
    "isDefault": false,
    "jsonData": {
      "maxLines": 1000
    }
  }')

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q '"id"'; then
  echo "✅ Loki datasource added successfully!"
else
  echo "⚠️  Datasource might already exist or there was an error"
  echo "You can add it manually in Grafana UI:"
  echo "  1. Go to Configuration → Data Sources"
  echo "  2. Click 'Add data source'"
  echo "  3. Select 'Loki'"
  echo "  4. Set URL: http://loki:3100"
  echo "  5. Click 'Save & Test'"
fi


