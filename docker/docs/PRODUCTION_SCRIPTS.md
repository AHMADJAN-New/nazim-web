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
- Builds Docker images
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

### Other Scripts

- `update.sh` - Update application code and restart services
- `smoke_test.sh` - Basic health checks

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

- **Update code**: `bash docker/scripts/maintenance/update.sh`
- **Backup database**: `bash docker/scripts/backup/backup_db.sh`
- **Renew SSL**: `bash docker/scripts/prod/https_renew.sh`

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

## See Also

- `QUICK_START.md` - Detailed quick start guide
- `../README.md` - General Docker documentation

