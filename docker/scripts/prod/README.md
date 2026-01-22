# Production Scripts

This directory contains scripts for managing the Nazim production deployment.

## Quick Reference

### Initial Setup
```bash
# Complete setup (first time)
bash docker/scripts/prod/setup.sh
```

### Update Application
```bash
# Update application and monitoring stack
bash docker/scripts/prod/update.sh
```

### Bootstrap (Build & Start)
```bash
# Build and start all services (including monitoring)
bash docker/scripts/prod/bootstrap.sh
```

## Scripts Overview

### `setup.sh`
**Master setup script** - Runs complete initial setup:
1. Checks prerequisites (Docker, Docker Compose)
2. Creates environment files from examples
3. Runs preflight checks (DNS, configuration)
4. Configures firewall (UFW)
5. Runs bootstrap (builds images, starts services, runs migrations)
6. Optionally seeds database
7. Verifies all services

**Usage:**
```bash
bash docker/scripts/prod/setup.sh
```

### `bootstrap.sh`
**Build and start script** - Handles:
1. Cleans up old containers and networks
2. Builds application images
3. Starts database and Redis
4. Runs Laravel migrations
5. Starts all application services
6. Starts monitoring stack (Prometheus, Grafana, Loki, Promtail)
7. Sets up HTTPS certificates

**Usage:**
```bash
bash docker/scripts/prod/bootstrap.sh
```

### `update.sh`
**Update script** - Updates everything:
1. Cleans up old containers and networks
2. Pulls latest images
3. Rebuilds application images
4. Starts all services (via bootstrap)
5. Cleans up old images

**Usage:**
```bash
bash docker/scripts/prod/update.sh
```

## What Gets Started

### Application Services (docker-compose.prod.yml)
- **db**: PostgreSQL database
- **redis**: Redis cache
- **php**: Laravel API
- **queue**: Laravel queue worker
- **scheduler**: Laravel task scheduler
- **nginx**: Web server with SSL

### Monitoring Services (docker-compose.monitoring.yml)
- **prometheus**: Metrics collection
- **grafana**: Monitoring dashboards (port 3000)
- **loki**: Log aggregation
- **promtail**: Log shipper
- **node_exporter**: System metrics
- **cadvisor**: Container metrics

## Access Points

After setup, access:
- **Application**: `https://your-domain.com`
- **Grafana**: `http://your-server-ip:3000` (admin/admin)
- **Prometheus**: `http://your-server-ip:9090`

## Cleanup

The scripts automatically clean up:
- Old containers (stopped/removed)
- Unused networks
- Dangling images
- Orphaned containers

## Manual Commands

### View Logs
```bash
# Application logs
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs -f

# Monitoring logs
docker compose -f docker-compose.monitoring.yml logs -f
```

### Restart Services
```bash
# Restart application
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml restart

# Restart monitoring
docker compose -f docker-compose.monitoring.yml restart
```

### Stop Everything
```bash
# Stop application
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml down

# Stop monitoring
docker compose -f docker-compose.monitoring.yml down
```

## Troubleshooting

### Services Not Starting
1. Check logs: `docker compose logs [service-name]`
2. Verify environment files are configured
3. Check firewall allows required ports
4. Ensure Docker has enough resources

### Monitoring Not Accessible
1. Check Grafana is running: `docker compose -f docker-compose.monitoring.yml ps`
2. Verify port 3000 is open in firewall
3. Check Grafana logs for errors

### Old Containers Not Cleaning Up
Run manual cleanup:
```bash
docker container prune -f
docker network prune -f
docker image prune -f
```

