# Docker Directory Structure

This document describes the organization of the `docker/` directory.

## Directory Layout

```
docker/
├── README.md                 # Main Docker documentation
├── STRUCTURE.md              # This file - directory structure guide
├── docs/                     # Documentation files
│   ├── PRODUCTION_ENV_FILES.md
│   ├── PRODUCTION_SCRIPTS.md
│   └── QUICK_START.md
├── env/                      # Environment configuration files
│   ├── backend.env.example
│   ├── compose.prod.env.example
│   └── compose.prod.env      # (not committed)
├── nginx/                     # Nginx configuration
│   ├── Dockerfile.prod
│   ├── entrypoint.sh
│   ├── refresh_certs.sh
│   ├── http.conf.template
│   ├── https.conf.template
│   └── default*.conf
├── php/                       # PHP configuration
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── nazim.ini
├── postgres/                  # PostgreSQL configuration
│   └── init/
│       └── 01-extensions.sql
└── scripts/                   # All scripts organized by purpose
    ├── setup/                 # Initial setup scripts
    │   └── install-docker.sh
    ├── backup/                # Backup and restore scripts
    │   ├── backup_db.sh
    │   ├── backup_storage.sh
    │   ├── restore_db.sh
    │   └── restore_storage.sh
    ├── maintenance/           # Maintenance and monitoring scripts
    │   ├── update.sh
    │   └── smoke_test.sh
    └── prod/                  # Production deployment scripts
        ├── setup.sh           # Master setup script (run this first!)
        ├── bootstrap.sh       # Build and start services
        ├── preflight.sh       # Pre-deployment checks
        ├── setup-firewall.sh  # Firewall configuration
        ├── https_init.sh      # SSL certificate initialization
        └── https_renew.sh     # SSL certificate renewal
```

## Script Categories

### Setup Scripts (`scripts/setup/`)
Scripts for initial server setup:
- **`install-docker.sh`** - Install Docker and Docker Compose on Ubuntu

### Production Scripts (`scripts/prod/`)
Core production deployment scripts:
- **`setup.sh`** - Master setup script (orchestrates all setup steps)
- **`bootstrap.sh`** - Build images, start services, run migrations
- **`preflight.sh`** - Pre-deployment validation checks
- **`setup-firewall.sh`** - Configure UFW firewall
- **`https_init.sh`** - Initialize Let's Encrypt SSL certificates
- **`https_renew.sh`** - Renew SSL certificates (for cron jobs)

### Backup Scripts (`scripts/backup/`)
Database and storage backup/restore:
- **`backup_db.sh`** - Backup PostgreSQL database
- **`backup_storage.sh`** - Backup Laravel storage directory
- **`restore_db.sh`** - Restore database from backup
- **`restore_storage.sh`** - Restore storage from backup

### Maintenance Scripts (`scripts/maintenance/`)
Ongoing maintenance and monitoring:
- **`update.sh`** - Update application code and restart services
- **`smoke_test.sh`** - Basic health checks and smoke tests

## Quick Reference

### For New Server Setup
```bash
# 1. Install Docker (if needed)
bash docker/scripts/setup/install-docker.sh

# 2. Run master setup
sudo bash docker/scripts/prod/setup.sh
```

### For Backups
```bash
# Backup database
bash docker/scripts/backup/backup_db.sh

# Backup storage
bash docker/scripts/backup/backup_storage.sh
```

### For Maintenance
```bash
# Update application
bash docker/scripts/maintenance/update.sh

# Run health checks
bash docker/scripts/maintenance/smoke_test.sh
```

## Documentation

- **`README.md`** - Main Docker documentation
- **`docs/QUICK_START.md`** - Quick start guide for new deployments
- **`docs/PRODUCTION_SCRIPTS.md`** - Detailed production scripts documentation
- **`docs/PRODUCTION_ENV_FILES.md`** - Environment files guide

## Environment Files

- **`env/compose.prod.env`** - Docker Compose production variables (not committed)
- **`env/compose.prod.env.example`** - Template for compose.prod.env
- **`env/backend.env.example`** - Template for backend/.env

## Container Configurations

- **`nginx/`** - Nginx web server configuration and Dockerfile
- **`php/`** - PHP-FPM configuration and Dockerfiles
- **`postgres/`** - PostgreSQL initialization scripts

