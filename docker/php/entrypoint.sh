#!/bin/bash
# PHP container entrypoint script
# Ensures storage directories exist and have correct permissions

set -e

# Ensure storage directories exist
mkdir -p /var/www/html/storage/logs
mkdir -p /var/www/html/storage/framework/cache
mkdir -p /var/www/html/storage/framework/sessions
mkdir -p /var/www/html/storage/framework/views
mkdir -p /var/www/html/storage/app/public

# Set permissions
chown -R www-data:www-data /var/www/html/storage 2>/dev/null || true
chmod -R 775 /var/www/html/storage 2>/dev/null || true

# Also ensure backend storage exists (for backward compatibility)
mkdir -p /var/www/backend/storage/logs 2>/dev/null || true
chown -R www-data:www-data /var/www/backend/storage 2>/dev/null || true
chmod -R 775 /var/www/backend/storage 2>/dev/null || true

# Execute the original command
exec "$@"

