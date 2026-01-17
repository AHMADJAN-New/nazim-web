#!/usr/bin/env bash
set -euo pipefail

# Firewall Setup Script for Nazim Production
# Configures UFW (Uncomplicated Firewall) to allow necessary ports

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_ENV="${ROOT_DIR}/docker/env/compose.prod.env"

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   echo "[firewall] ERROR: This script must be run as root or with sudo"
   echo "[firewall] Usage: sudo bash docker/scripts/prod/setup-firewall.sh"
   exit 1
fi

# Check if UFW is installed
if ! command -v ufw >/dev/null 2>&1; then
    echo "[firewall] Installing UFW..."
    apt-get update
    apt-get install -y ufw
fi

# Load environment variables if compose.env exists
HTTP_PORT=80
HTTPS_PORT=443
if [[ -f "${COMPOSE_ENV}" ]]; then
    # shellcheck disable=SC1090
    source "${COMPOSE_ENV}"
    HTTP_PORT="${HTTP_PORT:-80}"
    HTTPS_PORT="${HTTPS_PORT:-443}"
fi

echo "[firewall] Configuring UFW firewall rules..."
echo "[firewall] HTTP_PORT=${HTTP_PORT}"
echo "[firewall] HTTPS_PORT=${HTTPS_PORT}"

# Reset UFW to defaults (optional - comment out if you want to preserve existing rules)
# ufw --force reset

# Set default policies
echo "[firewall] Setting default policies..."
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (CRITICAL: Do this first to avoid locking yourself out)
echo "[firewall] Allowing SSH (port 22)..."
ufw allow 22/tcp comment 'SSH'

# Allow HTTP
echo "[firewall] Allowing HTTP (port ${HTTP_PORT})..."
ufw allow "${HTTP_PORT}/tcp" comment 'HTTP'

# Allow HTTPS
echo "[firewall] Allowing HTTPS (port ${HTTPS_PORT})..."
ufw allow "${HTTPS_PORT}/tcp" comment 'HTTPS'

# Allow Docker (if Docker is using default bridge network)
# Docker containers communicate via the bridge network, but we need to allow
# the host ports that Docker exposes
echo "[firewall] Docker ports are handled via HTTP/HTTPS rules above"

# Enable UFW (non-interactive)
echo "[firewall] Enabling UFW firewall..."
ufw --force enable

# Show status
echo ""
echo "[firewall] Firewall status:"
ufw status verbose

echo ""
echo "[firewall] ✅ Firewall configuration complete!"
echo "[firewall] Allowed ports:"
echo "[firewall]   - SSH: 22/tcp"
echo "[firewall]   - HTTP: ${HTTP_PORT}/tcp"
echo "[firewall]   - HTTPS: ${HTTPS_PORT}/tcp"
echo ""
echo "[firewall] To view firewall status: sudo ufw status verbose"
echo "[firewall] To disable firewall: sudo ufw disable"
echo "[firewall] To reload firewall: sudo ufw reload"

