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
# This is important for report generation and file storage
if [ -d "/var/www/backend/storage" ]; then
    # Create base app directories if they don't exist (needed for dynamic directory creation)
    # These directories are required for Laravel Storage facade to create subdirectories
    mkdir -p /var/www/backend/storage/app/private
    mkdir -p /var/www/backend/storage/app/public
    
    # Ensure all storage directories have correct ownership (www-data:www-data)
    # This allows PHP-FPM (running as www-data) to create subdirectories and files
    chown -R www-data:www-data /var/www/backend/storage 2>/dev/null || true
    
    # Set directory permissions: 775 (rwxrwxr-x) - allows www-data to create subdirectories
    find /var/www/backend/storage -type d -exec chmod 775 {} \; 2>/dev/null || true
    
    # Set file permissions: 664 (rw-rw-r--) - allows www-data to write files
    find /var/www/backend/storage -type f -exec chmod 664 {} \; 2>/dev/null || true
fi

# Execute the original command
exec "$@"

