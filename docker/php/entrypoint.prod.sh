#!/bin/bash
set -e

# Ensure Puppeteer cache directory exists with correct permissions
mkdir -p /var/www/.cache/puppeteer /var/www/.cache/npm
chown -R www-data:www-data /var/www/.cache
chmod -R 775 /var/www/.cache

# Install Puppeteer if not already installed (for Browsershot)
if [ ! -d "/var/www/.cache/puppeteer/chrome" ] && [ ! -d "/var/www/.cache/puppeteer/chrome-headless-shell" ]; then
    echo "Installing Puppeteer..."
    npm install -g puppeteer --cache=/var/www/.cache/npm
    chown -R www-data:www-data /var/www/.cache
    chmod -R 775 /var/www/.cache
fi

# Ensure storage directories exist with correct permissions
# CRITICAL: This handles both fresh volumes and existing volumes
# The storage directory is mounted as a volume, so we must ensure base directories exist
mkdir -p /var/www/backend/storage 2>/dev/null || true
mkdir -p /var/www/backend/storage/app/private 2>/dev/null || true
mkdir -p /var/www/backend/storage/app/public 2>/dev/null || true
mkdir -p /var/www/backend/storage/framework/cache 2>/dev/null || true
mkdir -p /var/www/backend/storage/framework/sessions 2>/dev/null || true
mkdir -p /var/www/backend/storage/framework/views 2>/dev/null || true
mkdir -p /var/www/backend/storage/logs 2>/dev/null || true

# Ensure bootstrap/cache directory exists
mkdir -p /var/www/backend/bootstrap/cache 2>/dev/null || true

# Set ownership: www-data must own all storage and cache directories
# This allows PHP-FPM (running as www-data) to create subdirectories and files
chown -R www-data:www-data /var/www/backend/storage 2>/dev/null || true
chown -R www-data:www-data /var/www/backend/bootstrap/cache 2>/dev/null || true

# Set directory permissions: 775 (rwxrwxr-x) - allows www-data to create subdirectories
# This is CRITICAL for Laravel Storage facade to create nested directories
find /var/www/backend/storage -type d -exec chmod 775 {} \; 2>/dev/null || true
find /var/www/backend/bootstrap/cache -type d -exec chmod 775 {} \; 2>/dev/null || true

# Set file permissions: 664 (rw-rw-r--) - allows www-data to write files
find /var/www/backend/storage -type f -exec chmod 664 {} \; 2>/dev/null || true
find /var/www/backend/bootstrap/cache -type f -exec chmod 664 {} \; 2>/dev/null || true

# Execute the original command
exec "$@"

