# Demo Environment Setup

This document explains how to set up and manage a separate demo/trials/training environment alongside production.

## Overview

The demo environment is completely isolated from production:
- **Separate containers**: All containers have `demo` prefix (`nazim_demo_*`)
- **Separate volumes**: All data stored in `nazim_demo_*` volumes
- **Separate network**: `nazim_demo_network` (isolated from production)
- **No exposed ports**: Internal ports only (80/443), accessed via reverse proxy
- **Separate domain**: Accessible via `demo.nazim.cloud` (routed through reverse proxy)

## Architecture

```
Internet (ports 80/443)
    ↓
Reverse Proxy (nginx)
    ├─→ nazim.cloud → Production (internal)
    └─→ demo.nazim.cloud → Demo (internal)

Production Environment          Demo Environment
──────────────────────          ────────────────
docker-compose.prod.yml         docker-compose.demo.yml
nazim_prod_* containers         nazim_demo_* containers
nazim_pg_data volumes           nazim_demo_pg_data volumes
nazim_network                   nazim_demo_network
Ports: None (internal)          Ports: None (internal)
Domain: nazim.cloud             Domain: demo.nazim.cloud
```

## Quick Start

### 1. Initial Setup

Run the master setup script:

```bash
bash docker/scripts/demo/setup.sh
```

This will:
- Check prerequisites
- Create environment files from examples
- Configure firewall (if requested)
- Build Docker images
- Start all services
- Run migrations
- Optionally seed the database

### 2. Manual Setup (Step by Step)

If you prefer to set up manually:

```bash
# 1. Copy environment file
cp docker/env/compose.demo.env.example docker/env/compose.demo.env
# Edit docker/env/compose.demo.env with your settings

# 2. Copy backend environment (optional, if not using same .env)
cp backend/.env backend/.env.demo
# Edit backend/.env.demo - ensure DB_DATABASE matches compose.demo.env

# 3. Bootstrap containers
bash docker/scripts/demo/bootstrap.sh

# 4. Run migrations
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml exec php php artisan migrate --force

# 5. Seed database (optional)
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml exec php php artisan db:seed --force
```

## Environment Files

### `docker/env/compose.demo.env`

Demo-specific Docker Compose environment variables:

```bash
DOMAIN=demo.nazim.cloud
APP_URL=https://demo.nazim.cloud
# NOTE: HTTP_PORT and HTTPS_PORT are no longer used (ports not exposed)
# The reverse proxy handles ports 80/443
POSTGRES_DB=nazim_demo
POSTGRES_USER=nazim_demo
POSTGRES_PASSWORD=change_me
LETSENCRYPT_EMAIL=admin@nazim.cloud
```

### `backend/.env.demo`

Backend Laravel environment (optional, can use same `.env` as production):

```bash
APP_ENV=demo
APP_URL=https://demo.nazim.cloud
DB_DATABASE=nazim_demo
DB_USERNAME=nazim_demo
DB_PASSWORD=change_me
```

## DNS Configuration

Configure your DNS to point `demo.nazim.cloud` to your server IP:

```
A Record: demo.nazim.cloud → YOUR_SERVER_IP
```

**NOTE**: With the reverse proxy setup, the reverse proxy handles routing. See `REVERSE_PROXY.md` for details.

The reverse proxy automatically routes:
- `nazim.cloud` → Production (internal network)
- `demo.nazim.cloud` → Demo (internal network)

## SSL Certificates

### Initial Certificate Setup

```bash
bash docker/scripts/demo/https_init.sh
```

This will:
- Issue a Let's Encrypt certificate for `demo.nazim.cloud`
- Configure Nginx to use the certificate
- Reload Nginx

### Certificate Renewal

Certificates are renewed automatically via:
- Manual renewal: `bash docker/scripts/demo/https_renew.sh`
- Automatic renewal: Add to cron (certificates auto-renew 30 days before expiry)

## Daily Operations

### Start Demo Environment

```bash
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d
```

### Stop Demo Environment

```bash
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml down
```

### View Logs

```bash
# All services
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml logs -f

# Specific service
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml logs -f nginx
```

### Run Migrations

```bash
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml exec php php artisan migrate --force
```

### Access PHP Container

```bash
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml exec php bash
```

### Clear Caches

```bash
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml exec php php artisan optimize:clear
```

## Backup and Restore

### Backup Demo Database

```bash
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml exec -T db pg_dump -U nazim_demo nazim_demo > demo_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Demo Database

```bash
cat demo_backup.sql | docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml exec -T db psql -U nazim_demo -d nazim_demo
```

## Firewall Configuration

With the reverse proxy setup, only the reverse proxy needs ports 80/443 exposed:

- Reverse Proxy: 80, 443 (the only exposed ports)
- Production: No exposed ports (internal network only)
- Demo: No exposed ports (internal network only)

Configure firewall:

```bash
# Allow HTTP/HTTPS (80/443) for reverse proxy
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

**NOTE**: The firewall setup script should be updated to reflect this. The reverse proxy is the single entry point.

## Troubleshooting

### Port Already in Use

With the reverse proxy setup, production and demo don't expose ports directly. If you get "port already in use" errors:

1. Check if the reverse proxy is running on ports 80/443
2. Verify no other service is using ports 80/443
3. Use `sudo netstat -tuln | grep -E ':(80|443)'` to check port usage

### Database Connection Errors

If PHP can't connect to database:
1. Verify `backend/.env.demo` has correct `DB_*` settings
2. Ensure database container is healthy: `docker compose ps`
3. Check database logs: `docker compose logs db`

### SSL Certificate Issues

If SSL certificate doesn't work:
1. Verify DNS points to your server: `dig demo.nazim.cloud`
2. Ensure port 80/8080 is accessible for ACME challenge
3. Check certbot logs: `docker compose logs certbot`
4. Manually renew: `bash docker/scripts/demo/https_init.sh`

### Container Names Conflict

If you get container name conflicts:
- Ensure you're using the correct compose file (`docker-compose.demo.yml`)
- Verify container names in compose file have `demo` prefix
- Check existing containers: `docker ps -a | grep nazim`

## Maintenance

### Update Demo Environment

Similar to production, use the update script pattern:

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml build
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d

# Run migrations
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml exec php php artisan migrate --force

# Clear caches
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml exec php php artisan optimize
```

### Reset Demo Environment

To completely reset the demo environment (⚠️ **WARNING: This deletes all data**):

```bash
# Stop and remove containers
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml down -v

# Remove volumes (optional)
docker volume rm nazim_demo_pg_data nazim_demo_redis_data nazim_demo_backend_storage

# Restart setup
bash docker/scripts/demo/setup.sh
```

## Security Considerations

1. **Separate Credentials**: Use different passwords for demo database
2. **Demo Data Only**: Don't use real production data in demo
3. **Access Control**: Restrict demo access as needed
4. **Regular Resets**: Consider resetting demo environment periodically for trials

## Comparison: Production vs Demo

| Aspect | Production | Demo |
|--------|-----------|------|
| Compose File | `docker-compose.prod.yml` | `docker-compose.demo.yml` |
| Container Names | `nazim_prod_*` | `nazim_demo_*` |
| Volumes | `nazim_pg_data` | `nazim_demo_pg_data` |
| Network | `nazim_network` | `nazim_demo_network` |
| Exposed Ports | None (internal only) | None (internal only) |
| Domain | `nazim.cloud` | `demo.nazim.cloud` |
| Database | `nazim` | `nazim_demo` |
| Bootstrap Script | `docker/scripts/prod/bootstrap.sh` | `docker/scripts/demo/bootstrap.sh` |

Both environments can run simultaneously on the same server without conflicts. They are accessed via the reverse proxy on ports 80/443.

See `REVERSE_PROXY.md` for reverse proxy setup instructions.

