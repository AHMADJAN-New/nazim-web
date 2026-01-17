# Docker Directory Index

Quick navigation guide for the Docker directory.

## 📚 Documentation

- **[README.md](./README.md)** - Main Docker documentation
- **[STRUCTURE.md](./STRUCTURE.md)** - Directory structure guide
- **[docs/QUICK_START.md](./docs/QUICK_START.md)** - Quick start guide
- **[docs/PRODUCTION_SCRIPTS.md](./docs/PRODUCTION_SCRIPTS.md)** - Production scripts guide
- **[docs/PRODUCTION_ENV_FILES.md](./docs/PRODUCTION_ENV_FILES.md)** - Environment files guide

## 🚀 Quick Start

### New Server Setup
```bash
# 1. Install Docker
bash docker/scripts/setup/install-docker.sh

# 2. Run master setup
sudo bash docker/scripts/prod/setup.sh
```

## 📁 Directory Structure

### Scripts
- **`scripts/setup/`** - Initial setup (Docker installation)
- **`scripts/prod/`** - Production deployment scripts
- **`scripts/backup/`** - Backup and restore scripts
- **`scripts/maintenance/`** - Maintenance and monitoring scripts

### Configuration
- **`env/`** - Environment variable templates
- **`nginx/`** - Nginx configuration
- **`php/`** - PHP configuration
- **`postgres/`** - PostgreSQL configuration

## 🔧 Common Tasks

### Setup
- Install Docker: `docker/scripts/setup/install-docker.sh`
- Full setup: `docker/scripts/prod/setup.sh`

### Backups
- Database: `docker/scripts/backup/backup_db.sh`
- Storage: `docker/scripts/backup/backup_storage.sh`

### Maintenance
- Update app: `docker/scripts/maintenance/update.sh`
- Health check: `docker/scripts/maintenance/smoke_test.sh`

See [STRUCTURE.md](./STRUCTURE.md) for complete details.
