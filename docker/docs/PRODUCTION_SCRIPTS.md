# Production Setup Scripts

This directory contains scripts for setting up and managing Nazim in production.

## Master Setup Script

**`setup.sh`** - One-command setup for new servers

This is the main script you should run on a new server. It orchestrates all setup steps:

```bash
sudo bash docker/scripts/prod/setup.sh
```

### What it does:

1. ✅ **Prerequisites Check** - Verifies Docker and Docker Compose are installed
2. ✅ **Environment Setup** - Creates and prompts for configuration of environment files
3. ✅ **Preflight Checks** - Validates DNS, configuration, and system requirements
4. ✅ **Firewall Configuration** - Sets up UFW to allow ports 22, 80, 443
5. ✅ **Bootstrap** - Builds images, starts services, runs migrations
6. ✅ **Database Seeding** - Optionally seeds database with initial data
7. ✅ **Verification** - Checks that all services are running correctly

## Individual Scripts

### `preflight.sh`
Pre-deployment checks:
- Validates environment files exist
- Checks DNS resolution
- Verifies Docker installation
- Checks firewall status

**Usage:**
```bash
bash docker/scripts/prod/preflight.sh
```

### `setup-firewall.sh`
Configures UFW firewall:
- Installs UFW if needed
- Allows SSH (port 22)
- Allows HTTP (port 80)
- Allows HTTPS (port 443)
- Enables firewall

**Usage:**
```bash
sudo bash docker/scripts/prod/setup-firewall.sh
```

### `bootstrap.sh`
Main deployment script:
- Builds Docker images (with `--no-cache` for clean build)
- **Automatically cleans up old/dangling images** after build
- Starts database and Redis
- Starts PHP-FPM service
- Runs Laravel migrations
- Starts queue worker and scheduler
- Starts Nginx
- Sets up SSL certificates

**Usage:**
```bash
bash docker/scripts/prod/bootstrap.sh
```

**Note**: The script automatically removes old/dangling images after building to prevent disk space accumulation.

### `https_init.sh`
Initializes Let's Encrypt SSL certificates

**Usage:**
```bash
bash docker/scripts/prod/https_init.sh
```

### `https_renew.sh`
Renews Let's Encrypt SSL certificates (for cron jobs)

**Usage:**
```bash
bash docker/scripts/prod/https_renew.sh
```

### Backup Scripts

- `backup_db.sh` - Backup PostgreSQL database
- `backup_storage.sh` - Backup Laravel storage
- `restore_db.sh` - Restore database from backup
- `restore_storage.sh` - Restore storage from backup

### Maintenance Scripts

- `update.sh` - Update application code and restart services (automatically cleans up old images after build)
- `smoke_test.sh` - Basic health checks
- `check-disk-usage.sh` - Diagnose disk usage and identify what's consuming space
- `cleanup-docker.sh` - Safely remove unused Docker resources to free up disk space
- `build-with-cleanup.sh` - Build wrapper that cleans up old images after build (alternative to `docker compose build`)
- `monitor-traffic.sh` - Monitor network traffic and bandwidth consumption
- `analyze-traffic.sh` - Analyze traffic patterns from logs
- `traffic-summary.sh` - Quick summary of bandwidth usage
- `enable-traffic-logging.sh` - Enable detailed access logging (already enabled by default)

### Monitoring Scripts

- `setup-monitoring.sh` - Set up Grafana + Prometheus monitoring stack

## Setup Workflow

### For New Servers

1. **Install Docker** (if not installed):
   ```bash
   bash docker/scripts/setup/install-docker.sh
   # Log out and log back in
   ```

2. **Run master setup**:
   ```bash
   sudo bash docker/scripts/prod/setup.sh
   ```

3. **Follow prompts** to configure environment files

4. **Done!** Your application should be running at `https://your-domain.com`

### For Existing Servers

If you've already run setup and just need to:

- **Update code**: `bash docker/scripts/maintenance/update.sh` (automatically cleans up old images)
- **Backup database**: `bash docker/scripts/backup/backup_db.sh`
- **Renew SSL**: `bash docker/scripts/prod/https_renew.sh`
- **Manual build with cleanup**: `bash docker/scripts/maintenance/build-with-cleanup.sh`

## Environment Files

### `docker/env/compose.prod.env`
Docker Compose environment variables:
- `DOMAIN` - Your domain name
- `APP_URL` - Full application URL
- `HTTP_PORT` - HTTP port (default: 80)
- `HTTPS_PORT` - HTTPS port (default: 443)
- `LETSENCRYPT_EMAIL` - Email for SSL certificates
- `POSTGRES_PASSWORD` - Database password

### `backend/.env`
Laravel environment variables:
- `APP_URL` - Must match compose.prod.env
- `DB_PASSWORD` - Must match POSTGRES_PASSWORD
- `MAIL_*` - Email configuration (optional)

## Troubleshooting

### Script fails at firewall step
- Ensure you have sudo access
- Run firewall setup manually: `sudo bash docker/scripts/prod/setup-firewall.sh`

### Script fails at bootstrap step
- Check Docker is running: `docker ps`
- Check environment files are configured correctly
- View logs: `docker compose logs`

### Services not starting
- Check logs: `docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs`
- Verify environment files are correct
- Check disk space: `df -h`

### Database connection errors
- Verify `DB_PASSWORD` in `backend/.env` matches `POSTGRES_PASSWORD` in `docker/env/compose.prod.env`
- Check database container is running: `docker compose ps db`
- Test connection: `docker compose exec db psql -U nazim -d nazim`

### High Disk Usage

If your server is using excessive disk space (e.g., 45GB+), it's likely due to:

1. **Docker Images**: Old/unused images accumulate over time
2. **Stopped Containers**: Containers that were stopped but not removed
3. **Docker Build Cache**: Cached layers from image builds
4. **Container Logs**: Large log files from containers
5. **Docker Volumes**: Database and storage volumes (these are necessary)

**Diagnose disk usage:**
```bash
bash docker/scripts/maintenance/check-disk-usage.sh
```

**Clean up unused Docker resources:**
```bash
bash docker/scripts/maintenance/cleanup-docker.sh
```

**Common cleanup commands:**
```bash
# Remove stopped containers, unused images, and build cache
docker system prune -a

# Remove only stopped containers
docker container prune

# Remove unused images (not used by any container)
docker image prune -a

# Remove build cache (may slow down future builds)
docker builder prune -a
```

**⚠️ WARNING**: Be careful with `docker volume prune` - it removes volumes not used by any container. Your database and storage volumes are important!

**Prevent log file growth:**

Add log rotation to `docker-compose.prod.yml` for each service:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## Hostinger Deployment (Alternative)

For Hostinger hosting deployments, use the optimized Hostinger scripts:

```bash
# Fast deployment to Hostinger
bash docker/scripts/hostinger/deploy.sh nazim.cloud
```

**Benefits:**
- 🚀 Faster deployments (Hostinger handles builds)
- 💰 Cost-effective (no Docker overhead)
- 🛠️ Simplified workflow (one command)
- 🔒 Production-ready (automatic SSL, CDN)

See `HOSTINGER_DEPLOYMENT.md` for complete guide.

## See Also

- `QUICK_START.md` - Detailed quick start guide
- `MONITORING.md` - Grafana + Prometheus monitoring setup (recommended)
- `TRAFFIC_MONITORING.md` - Traffic monitoring and bandwidth analysis guide
- `DISK_USAGE.md` - Disk usage management guide
- `HOSTINGER_DEPLOYMENT.md` - Hostinger deployment guide
- `../README.md` - General Docker documentation

