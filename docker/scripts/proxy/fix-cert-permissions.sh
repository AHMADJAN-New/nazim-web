#!/bin/bash
# Fix SSL certificate permissions for proxy nginx worker

set -e

echo "Fixing SSL certificate permissions..."

# Fix directory permissions (nginx worker needs read access)
docker exec nazim_proxy chmod 755 /etc/letsencrypt/proxy/live/ 2>/dev/null || true
docker exec nazim_proxy find /etc/letsencrypt/proxy/live -type d -exec chmod 755 {} \; 2>/dev/null || true
docker exec nazim_proxy find /etc/letsencrypt/proxy/archive -type d -exec chmod 755 {} \; 2>/dev/null || true

# Fix file permissions (certificates are symlinks, fix actual files in archive)
docker exec nazim_proxy find /etc/letsencrypt/proxy/archive -name "*.pem" -exec chmod 644 {} \; 2>/dev/null || true

# Reload nginx to apply changes
docker exec nazim_proxy nginx -s reload 2>/dev/null || true

echo "✓ Certificate permissions fixed and nginx reloaded"

