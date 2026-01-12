#!/bin/bash
# Install Chrome/Chromium system dependencies for PDF generation
# Run with: sudo bash install-chrome-deps.sh

set -e

echo "Installing Chrome system dependencies..."

apt-get update -qq
apt-get install -y \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libxss1 \
    libxtst6 \
    libgconf-2-4 \
    libxkbcommon0 \
    libnss3 \
    libx11-6 \
    libxext6

echo "Chrome dependencies installed successfully!"
echo "Verifying Chrome can run..."
ldd /home/nazim/.cache/puppeteer/chrome-headless-shell/linux-143.0.7499.169/chrome-headless-shell-linux64/chrome-headless-shell 2>&1 | grep "not found" && echo "WARNING: Some libraries still missing" || echo "All dependencies satisfied!"
