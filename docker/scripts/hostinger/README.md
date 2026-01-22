# Hostinger Deployment Scripts

Fast deployment scripts optimized for Hostinger hosting.

## Quick Start

```bash
# Deploy to Hostinger (one command)
bash docker/scripts/hostinger/deploy.sh nazim.cloud
```

## Scripts

### `prepare-deployment.sh`

Prepares deployment package for Hostinger:
- ✅ Excludes unnecessary files (node_modules, vendor, build artifacts)
- ✅ Creates optimized ZIP archive
- ✅ Generates environment file templates
- ✅ Creates deployment instructions

**Usage:**
```bash
bash docker/scripts/hostinger/prepare-deployment.sh
```

**Output:**
- Archive: `nazim-web_YYYYMMDD_HHMMSS.zip`
- Deployment directory: `.hostinger-deploy/`

### `deploy.sh`

Fast deployment script with Hostinger MCP integration:
- ✅ Prepares deployment package (if needed)
- ✅ Provides MCP tool instructions
- ✅ Shows post-deployment steps

**Usage:**
```bash
# Auto-prepare and deploy
bash docker/scripts/hostinger/deploy.sh nazim.cloud

# Use existing archive
bash docker/scripts/hostinger/deploy.sh nazim.cloud /path/to/archive.zip
```

## Benefits

### 🚀 Fast Deployments
- Automated packaging
- Zero-downtime deployments
- Quick rollback support

### 🛠️ Simplified Workflow
- One-command deployment
- Automatic builds (Hostinger handles)
- Environment management

### 💰 Cost-Effective
- No Docker overhead
- Shared hosting compatible
- Resource efficient

### 🔒 Production-Ready
- Automatic SSL certificates
- CDN integration
- Backup support

## Documentation

See `docker/docs/HOSTINGER_DEPLOYMENT.md` for complete deployment guide.

## Comparison

| Feature | Docker | Hostinger |
|---------|--------|-----------|
| Setup | Complex | Simple |
| Build | Manual | Automatic |
| Cost | VPS required | Shared hosting |
| Speed | Slower | Faster |



