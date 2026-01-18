#!/usr/bin/env bash
set -euo pipefail

# Automated SSL certificate setup for reverse proxy
# This script initializes certificates and configures nginx automatically

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Reverse Proxy SSL Certificate Setup"
echo "=========================================="
echo ""

# Step 1: Initialize certificates
echo "Step 1: Initializing SSL certificates..."
bash "${SCRIPT_DIR}/https_init.sh"

# Step 2: Configure nginx for HTTPS
echo ""
echo "Step 2: Configuring nginx for HTTPS..."
bash "${SCRIPT_DIR}/https_configure.sh"

echo ""
echo "=========================================="
echo "✓ SSL Setup Complete!"
echo "=========================================="
echo ""
echo "Your domains should now be accessible via HTTPS:"
echo "  - https://nazim.cloud"
echo "  - https://demo.nazim.cloud"
echo ""
echo "Note: If DNS is not configured yet, certificates will fail to obtain."
echo "      Once DNS points to this server, run this script again."

