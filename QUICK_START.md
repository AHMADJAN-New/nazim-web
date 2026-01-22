# Quick Start Guide - Production Deployment

## One-Command Setup

For a **new server**, run:

```bash
bash docker/scripts/prod/setup.sh
```

This will:
1. ✅ Check prerequisites
2. ✅ Create environment files
3. ✅ Configure firewall
4. ✅ Build and start **all services** (including monitoring)
5. ✅ Run migrations
6. ✅ Set up SSL certificates

## Update Existing Deployment

To **update** your application:

```bash
bash docker/scripts/prod/update.sh
```

This will:
1. ✅ Clean up old containers
2. ✅ Pull latest images
3. ✅ Rebuild application
4. ✅ Start everything (including monitoring)
5. ✅ Clean up old images

## What Gets Started

### Application Services
- PostgreSQL database
- Redis cache
- Laravel API
- Queue workers
- Task scheduler
- Nginx with SSL

### Monitoring Services (Automatic)
- **Grafana** - Dashboards (port 3000)
- **Prometheus** - Metrics (port 9090)
- **Loki** - Log aggregation (port 3100)
- **Promtail** - Log shipper
- **Node Exporter** - System metrics
- **cAdvisor** - Container metrics

## Access Points

After setup:
- **Application**: `https://your-domain.com`
- **Grafana**: `http://your-server-ip:3000` (admin/admin)
- **Prometheus**: `http://your-server-ip:9090`

## Cleanup

All scripts automatically clean up:
- ✅ Old/stopped containers
- ✅ Unused networks
- ✅ Dangling images
- ✅ Orphaned containers

## Manual Commands

### View Logs
```bash
# Application
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs -f

# Monitoring
docker compose -f docker-compose.monitoring.yml logs -f
```

### Restart Services
```bash
# Application
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml restart

# Monitoring
docker compose -f docker-compose.monitoring.yml restart
```

### Stop Everything
```bash
# Application
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml down

# Monitoring
docker compose -f docker-compose.monitoring.yml down
```

## Troubleshooting

See `docker/scripts/prod/README.md` for detailed troubleshooting guide.

