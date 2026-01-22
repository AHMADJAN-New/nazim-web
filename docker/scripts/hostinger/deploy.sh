#!/usr/bin/env bash
set -euo pipefail

# Hostinger Fast Deployment Script
# Uses Hostinger MCP tools for automated deployment

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PREPARE_SCRIPT="${ROOT_DIR}/docker/scripts/hostinger/prepare-deployment.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Hostinger Fast Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if domain is provided
if [[ $# -lt 1 ]]; then
  echo -e "${RED}ERROR: Domain name required${NC}"
  echo ""
  echo "Usage: $0 <domain> [archive_path]"
  echo ""
  echo "Examples:"
  echo "  $0 nazim.cloud"
  echo "  $0 nazim.cloud /path/to/archive.zip"
  echo ""
  exit 1
fi

DOMAIN="$1"
ARCHIVE_PATH="${2:-}"

# Step 1: Prepare deployment package if archive not provided
if [[ -z "${ARCHIVE_PATH}" ]]; then
  echo -e "${GREEN}[1/3] Preparing deployment package...${NC}"
  bash "${PREPARE_SCRIPT}"
  
  # Find the latest archive
  ARCHIVE_PATH=$(ls -t "${ROOT_DIR}"/nazim-web_*.zip 2>/dev/null | head -1)
  
  if [[ -z "${ARCHIVE_PATH}" ]] || [[ ! -f "${ARCHIVE_PATH}" ]]; then
    echo -e "${RED}ERROR: Failed to create deployment archive${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✓ Archive created: ${ARCHIVE_PATH}${NC}"
else
  if [[ ! -f "${ARCHIVE_PATH}" ]]; then
    echo -e "${RED}ERROR: Archive not found: ${ARCHIVE_PATH}${NC}"
    exit 1
  fi
  echo -e "${GREEN}[1/3] Using provided archive: ${ARCHIVE_PATH}${NC}"
fi

echo ""

# Step 2: Deploy using Hostinger MCP
echo -e "${GREEN}[2/3] Deploying to Hostinger...${NC}"
echo -e "${BLUE}  Domain: ${DOMAIN}${NC}"
echo -e "${BLUE}  Archive: ${ARCHIVE_PATH}${NC}"
echo ""

# Note: This script prepares for MCP tool usage
# The actual MCP call would be made via Cursor/IDE integration
echo -e "${YELLOW}⚠️  MCP Integration Required${NC}"
echo ""
echo "To deploy via Hostinger MCP, use the following command in Cursor:"
echo ""
echo -e "${BLUE}Deploy JavaScript Application:${NC}"
echo -e "  Domain: ${GREEN}${DOMAIN}${NC}"
echo -e "  Archive: ${GREEN}${ARCHIVE_PATH}${NC}"
echo ""
echo "Or use the Hostinger MCP tool directly:"
echo -e "  ${YELLOW}mcp_hostinger-mcp_hosting_deployJsApplication${NC}"
echo ""

# Step 3: Post-deployment instructions
echo -e "${GREEN}[3/3] Post-Deployment Steps${NC}"
echo ""
echo -e "${BLUE}After deployment completes:${NC}"
echo "1. Configure environment variables in Hostinger panel"
echo "2. Run database migrations:"
echo "   ${YELLOW}cd backend && php artisan migrate --force${NC}"
echo "3. Create storage symlink:"
echo "   ${YELLOW}cd backend && php artisan storage:link${NC}"
echo "4. Optimize Laravel:"
echo "   ${YELLOW}cd backend && php artisan config:cache && php artisan route:cache${NC}"
echo "5. Verify deployment:"
echo "   ${YELLOW}Visit https://${DOMAIN}${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Ready${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""



