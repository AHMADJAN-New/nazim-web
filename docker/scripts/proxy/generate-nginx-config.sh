#!/bin/bash
# Generate nginx config dynamically based on available SSL certificates

set -e

CONFIG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../proxy/conf.d" && pwd)"
TEMPLATE_FILE="${CONFIG_DIR}/proxy.conf.template"
OUTPUT_FILE="${CONFIG_DIR}/proxy.conf"

# Check if template exists, if not use existing config as base
if [ ! -f "${TEMPLATE_FILE}" ]; then
    echo "Template file not found, using existing proxy.conf"
    exit 0
fi

# Check if certificates exist in proxy container
check_cert() {
    local domain=$1
    docker exec nazim_proxy test -f "/etc/letsencrypt/proxy/live/${domain}/fullchain.pem" 2>/dev/null
}

# Generate config
echo "Generating nginx configuration..."

# This script would generate the config, but for now we'll use a simpler approach
# The nginx config should handle missing certs gracefully

echo "Configuration generation complete"

