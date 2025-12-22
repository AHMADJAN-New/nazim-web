#!/bin/bash

# Installation script for PDF letterhead dependencies
# This script installs Imagick and Ghostscript on Ubuntu/Debian systems

set -e

echo "=========================================="
echo "Installing PDF Letterhead Dependencies"
echo "=========================================="
echo ""

# Detect PHP version
PHP_VERSION=$(php -r "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;")
echo "Detected PHP version: $PHP_VERSION"
echo ""

# Update package list
echo "Updating package list..."
sudo apt-get update

# Install Imagick
echo ""
echo "Installing Imagick PHP extension..."
if sudo apt-get install -y "php${PHP_VERSION}-imagick"; then
    echo "✓ Imagick installed successfully"
else
    echo "✗ Failed to install Imagick"
    echo "  Trying alternative installation method..."
    sudo apt-get install -y php-imagick || echo "  Alternative method also failed"
fi

# Install Ghostscript
echo ""
echo "Installing Ghostscript..."
if sudo apt-get install -y ghostscript; then
    echo "✓ Ghostscript installed successfully"
else
    echo "✗ Failed to install Ghostscript"
fi

# Verify installations
echo ""
echo "=========================================="
echo "Verifying installations..."
echo "=========================================="

# Check Imagick
if php -m | grep -q imagick; then
    echo "✓ Imagick PHP extension is loaded"
else
    echo "✗ Imagick PHP extension is NOT loaded"
    echo "  You may need to restart PHP-FPM or your web server"
fi

# Check Ghostscript
if command -v gs &> /dev/null; then
    GS_VERSION=$(gs --version)
    echo "✓ Ghostscript is installed: $GS_VERSION"
else
    echo "✗ Ghostscript is NOT installed or not in PATH"
fi

# Restart PHP-FPM if available
echo ""
echo "Attempting to restart PHP-FPM..."
if systemctl is-active --quiet php${PHP_VERSION}-fpm; then
    sudo systemctl restart php${PHP_VERSION}-fpm
    echo "✓ PHP-FPM restarted"
elif systemctl is-active --quiet php-fpm; then
    sudo systemctl restart php-fpm
    echo "✓ PHP-FPM restarted"
else
    echo "  PHP-FPM not running, skipping restart"
    echo "  Please restart your web server manually if needed"
fi

echo ""
echo "=========================================="
echo "Installation Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Verify installation: php -m | grep imagick"
echo "2. Verify Ghostscript: gs --version"
echo "3. Test PDF letterhead generation in the application"
echo "4. Check Laravel logs if letterheads don't appear"
echo ""

