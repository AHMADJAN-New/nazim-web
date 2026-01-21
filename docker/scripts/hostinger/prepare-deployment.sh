#!/usr/bin/env bash
set -euo pipefail

# Hostinger Deployment Preparation Script
# Prepares the application for deployment to Hostinger hosting

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DEPLOY_DIR="${ROOT_DIR}/.hostinger-deploy"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="nazim-web_${TIMESTAMP}.zip"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Hostinger Deployment Preparation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Clean up previous deployment directory
if [[ -d "${DEPLOY_DIR}" ]]; then
  echo -e "${YELLOW}Cleaning up previous deployment directory...${NC}"
  rm -rf "${DEPLOY_DIR}"
fi

mkdir -p "${DEPLOY_DIR}"

# Check if .gitignore exists
GITIGNORE="${ROOT_DIR}/.gitignore"
if [[ ! -f "${GITIGNORE}" ]]; then
  echo -e "${RED}ERROR: .gitignore not found${NC}"
  exit 1
fi

echo -e "${GREEN}[1/5] Copying application files...${NC}"

# Copy frontend source files (excluding node_modules and build output)
echo -e "${BLUE}  → Copying frontend source...${NC}"
mkdir -p "${DEPLOY_DIR}/frontend"
rsync -av \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='build' \
  --exclude='.vite' \
  --exclude='.cache' \
  --exclude='coverage' \
  --exclude='*.log' \
  --exclude='.env.local' \
  --exclude='.env.development' \
  "${ROOT_DIR}/frontend/" "${DEPLOY_DIR}/frontend/"

# Copy backend files (excluding vendor and storage)
echo -e "${BLUE}  → Copying backend source...${NC}"
mkdir -p "${DEPLOY_DIR}/backend"
rsync -av \
  --exclude='vendor' \
  --exclude='node_modules' \
  --exclude='storage' \
  --exclude='bootstrap/cache' \
  --exclude='.env' \
  --exclude='.env.backup' \
  --exclude='*.log' \
  --exclude='coverage' \
  --exclude='.phpunit.result.cache' \
  "${ROOT_DIR}/backend/" "${DEPLOY_DIR}/backend/"

# Copy docker configuration (for reference, not deployment)
echo -e "${BLUE}  → Copying Docker configuration...${NC}"
mkdir -p "${DEPLOY_DIR}/docker"
rsync -av \
  --exclude='*.env' \
  --exclude='*.log' \
  "${ROOT_DIR}/docker/" "${DEPLOY_DIR}/docker/"

# Copy root files
echo -e "${BLUE}  → Copying root files...${NC}"
cp "${ROOT_DIR}/package.json" "${DEPLOY_DIR}/" 2>/dev/null || true
cp "${ROOT_DIR}/README.md" "${DEPLOY_DIR}/" 2>/dev/null || true
cp "${ROOT_DIR}/.gitignore" "${DEPLOY_DIR}/" 2>/dev/null || true

echo -e "${GREEN}[2/5] Creating environment file templates...${NC}"

# Create .env.example files for Hostinger
cat > "${DEPLOY_DIR}/frontend/.env.production.example" << 'EOF'
VITE_API_BASE_URL=/api
VITE_API_URL=/api
EOF

# Copy backend .env.example if it exists
if [[ -f "${ROOT_DIR}/docker/env/backend.env.example" ]]; then
  cp "${ROOT_DIR}/docker/env/backend.env.example" "${DEPLOY_DIR}/backend/.env.example"
fi

echo -e "${GREEN}[3/5] Creating deployment instructions...${NC}"

cat > "${DEPLOY_DIR}/HOSTINGER_DEPLOYMENT.md" << 'EOF'
# Hostinger Deployment Instructions

## Prerequisites

1. Hostinger hosting account with Node.js support
2. PHP 8.2+ with required extensions
3. PostgreSQL database
4. Domain configured in Hostinger

## Deployment Steps

### 1. Upload Archive

Upload the deployment archive to Hostinger using:
- Hostinger File Manager, or
- Hostinger MCP `deployJsApplication` tool

### 2. Extract Files

Extract the archive to your hosting directory (usually `public_html` or `domains/yourdomain.com/public_html`)

### 3. Configure Environment

#### Frontend (.env.production)
```bash
VITE_API_BASE_URL=/api
VITE_API_URL=/api
```

#### Backend (.env)
Copy `backend/.env.example` to `backend/.env` and configure:
- Database credentials
- APP_URL
- APP_KEY (generate with: `php artisan key:generate`)
- Mail settings (optional)

### 4. Install Dependencies

#### Frontend
```bash
cd frontend
npm install
npm run build
```

#### Backend
```bash
cd backend
composer install --no-dev --optimize-autoloader
```

### 5. Run Laravel Setup

```bash
cd backend
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 6. Configure Web Server

Point your web server to:
- Frontend: `frontend/dist` (or `public_html` if extracted there)
- Backend API: `backend/public` (via `/api` route)

## Notes

- Frontend build is handled by Hostinger's Node.js build process
- Backend requires PHP-FPM or similar PHP handler
- Ensure `.env` files are not publicly accessible
- Storage directory must be writable by PHP
EOF

echo -e "${GREEN}[4/5] Creating deployment package...${NC}"

# Create archive (excluding unnecessary files)
cd "${ROOT_DIR}"
zip -r "${ARCHIVE_NAME}" \
  -x "*.git*" \
  -x "*node_modules/*" \
  -x "*vendor/*" \
  -x "*dist/*" \
  -x "*build/*" \
  -x "*.env" \
  -x "*.log" \
  -x "*storage/*" \
  -x "*coverage/*" \
  -x "*.cache/*" \
  -x "*__pycache__/*" \
  "${DEPLOY_DIR}"/* > /dev/null 2>&1 || {
  echo -e "${RED}ERROR: Failed to create archive${NC}"
  exit 1
}

ARCHIVE_PATH="${ROOT_DIR}/${ARCHIVE_NAME}"

echo -e "${GREEN}[5/5] Deployment package ready!${NC}"
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  Deployment Package Created${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Archive: ${GREEN}${ARCHIVE_PATH}${NC}"
echo -e "Size: ${GREEN}$(du -h "${ARCHIVE_PATH}" | cut -f1)${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "1. Upload archive to Hostinger: ${YELLOW}${ARCHIVE_NAME}${NC}"
echo -e "2. Use Hostinger MCP tool: ${YELLOW}deployJsApplication${NC}"
echo -e "3. Or extract manually and follow: ${YELLOW}${DEPLOY_DIR}/HOSTINGER_DEPLOYMENT.md${NC}"
echo ""
echo -e "${BLUE}To deploy via Hostinger MCP:${NC}"
echo -e "  Domain: ${YELLOW}your-domain.com${NC}"
echo -e "  Archive: ${YELLOW}${ARCHIVE_PATH}${NC}"
echo ""


