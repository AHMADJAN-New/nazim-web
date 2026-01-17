# Quick Start Guide - Production Setup

This guide will help you set up Nazim on a new production server in one command.

## Prerequisites

1. **Ubuntu Server** (20.04 or later recommended)
2. **Root or sudo access**
3. **Domain name** pointing to your server's IP address
4. **Docker installed** (if not, run `bash docker/scripts/setup/install-docker.sh` first)

## One-Command Setup

Run the master setup script:

```bash
sudo bash docker/scripts/prod/setup.sh
```

This script will:
1. ✅ Check prerequisites (Docker, Docker Compose)
2. ✅ Create environment files from examples (if needed)
3. ✅ Run preflight checks (DNS, configuration)
4. ✅ Configure firewall (UFW) - allows ports 22, 80, 443
5. ✅ Build Docker images and start services
6. ✅ Run database migrations
7. ✅ Optionally seed database with initial data
8. ✅ Verify all services are running

## What You Need to Configure

The script will prompt you to edit these files:

### 1. `docker/env/compose.prod.env`
```bash
DOMAIN=your-domain.com
APP_URL=https://your-domain.com
LETSENCRYPT_EMAIL=admin@your-domain.com
POSTGRES_PASSWORD=your-secure-password
HTTP_PORT=80
HTTPS_PORT=443
```

### 2. `backend/.env`
```bash
APP_URL=https://your-domain.com
DB_PASSWORD=your-secure-password  # Must match POSTGRES_PASSWORD above
# ... other settings
```

## Manual Steps (if needed)

If you prefer to run steps manually:

### Step 1: Install Docker
```bash
bash docker/scripts/setup/install-docker.sh
# Log out and log back in after installation
```

### Step 2: Setup Environment Files
```bash
cp docker/env/compose.prod.env.example docker/env/compose.prod.env
cp docker/env/backend.env.example backend/.env
# Edit both files with your configuration
```

### Step 3: Run Preflight Checks
```bash
bash docker/scripts/prod/preflight.sh
```

### Step 4: Configure Firewall
```bash
sudo bash docker/scripts/prod/setup-firewall.sh
```

### Step 5: Bootstrap (Build & Start Services)
```bash
bash docker/scripts/prod/bootstrap.sh
```

### Step 6: Seed Database (Optional)
```bash
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml exec php php artisan db:seed --force
```

## What Gets Installed

- **PostgreSQL 18** - Database (latest stable version)
- **Redis 7** - Cache and queue
- **PHP 8.3-FPM** - Laravel backend
- **Nginx 1.24** - Web server
- **Certbot** - SSL certificate management

## Ports Used

- **80** - HTTP (redirects to HTTPS)
- **443** - HTTPS (main application)
- **22** - SSH (already configured)

## After Setup

1. **Check service status:**
   ```bash
   docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml ps
   ```

2. **View logs:**
   ```bash
   docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs -f
   ```

3. **Access your application:**
   - Open `https://your-domain.com` in your browser
   - SSL certificate will be automatically obtained from Let's Encrypt

## Troubleshooting

### Services not starting
```bash
# Check logs
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs

# Restart services
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml restart
```

### Firewall blocking access
```bash
# Check firewall status
sudo ufw status verbose

# Re-run firewall setup
sudo bash docker/scripts/prod/setup-firewall.sh
```

### Database connection issues
- Verify `DB_PASSWORD` in `backend/.env` matches `POSTGRES_PASSWORD` in `docker/env/compose.prod.env`
- Check database container is running: `docker compose ps db`

### SSL certificate issues
- Ensure DNS A record points to your server IP
- Wait a few minutes for Let's Encrypt to verify
- Check certbot logs: `docker compose logs certbot`

## Next Steps

- [ ] Configure email settings in `backend/.env` (MAIL_*)
- [ ] Set up backups (see `docker/scripts/backup/backup_*.sh`)
- [ ] Configure monitoring and alerts
- [ ] Review security settings
- [ ] Set up automated SSL renewal

