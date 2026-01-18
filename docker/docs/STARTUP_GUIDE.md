# Startup Guide - Production & Demo Environments

This guide explains how to start and manage both production and demo environments automatically.

## Quick Start

### Start All Environments

```bash
bash docker/scripts/start-all.sh
```

This script will:
1. Start production environment
2. Wait for production to be healthy
3. Start demo environment
4. Wait for demo to be healthy
5. Ensure storage directories exist
6. Start reverse proxy
7. Fix certificate permissions
8. Reload nginx
9. Verify connectivity

### Stop All Environments

```bash
bash docker/scripts/stop-all.sh
```

## Manual Startup (Step by Step)

If you prefer to start manually:

### 1. Start Production

```bash
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d
```

Wait for services to be healthy:
```bash
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml ps
```

### 2. Start Demo

```bash
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d
```

Wait for services to be healthy:
```bash
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml ps
```

### 3. Start Proxy

```bash
docker compose -f docker-compose.proxy.yml up -d
```

### 4. Verify

```bash
# Test proxy health
curl http://localhost/healthz

# Test production
curl -H "Host: nazim.cloud" http://localhost/healthz

# Test demo
curl -H "Host: demo.nazim.cloud" http://localhost/healthz
```

## Startup Order

**CRITICAL**: Services must start in this order:

1. **Production/Demo databases and Redis** (start first)
2. **Production/Demo PHP** (depends on DB/Redis)
3. **Production/Demo queue and scheduler** (depends on PHP)
4. **Production/Demo nginx** (depends on PHP)
5. **Reverse proxy** (depends on production/demo networks existing)

The `start-all.sh` script handles this automatically.

## Automatic Storage Directory Creation

The PHP containers now automatically create storage directories on startup via the entrypoint script (`docker/php/entrypoint.sh`). This ensures:

- `/var/www/html/storage/logs` exists
- `/var/www/html/storage/framework/*` directories exist
- Proper permissions are set (775, www-data:www-data)

No manual intervention needed!

## Troubleshooting

### Production Not Starting

1. Check logs:
   ```bash
   docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs
   ```

2. Check container status:
   ```bash
   docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml ps
   ```

3. Ensure databases are healthy:
   ```bash
   docker ps | grep nazim_prod_db
   ```

### Demo Not Starting

Same as production, but use demo compose file:
```bash
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml logs
```

### Proxy Can't Reach Backend

1. Ensure both production and demo are running
2. Check networks:
   ```bash
   docker network ls | grep nazim
   ```

3. Restart proxy:
   ```bash
   docker compose -f docker-compose.proxy.yml restart proxy
   ```

### Storage Directory Issues

Storage directories are created automatically on container startup. If you still have issues:

1. Rebuild PHP images:
   ```bash
   docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml build php
   docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml build php
   ```

2. Restart containers:
   ```bash
   docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml restart php
   docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml restart php
   ```

## Restart After Reboot

After server reboot, simply run:

```bash
bash docker/scripts/start-all.sh
```

All services will start in the correct order automatically.

## Service Management

### View All Services

```bash
docker ps | grep nazim
```

### View Logs

```bash
# Production
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs -f

# Demo
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml logs -f

# Proxy
docker compose -f docker-compose.proxy.yml logs -f
```

### Restart Specific Service

```bash
# Production nginx
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml restart nginx

# Demo PHP
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml restart php

# Proxy
docker compose -f docker-compose.proxy.yml restart proxy
```

## Health Checks

All services have health checks configured:

- **Database**: Checks PostgreSQL readiness
- **Redis**: Checks Redis ping
- **PHP**: Checks PHP-FPM status
- **Nginx**: Checks HTTP health endpoint
- **Proxy**: Checks proxy health endpoint

Health checks ensure services start in the correct order and dependencies are met.

## Environment Variables

Ensure environment files exist:

- `docker/env/compose.prod.env` - Production Docker Compose variables
- `docker/env/compose.demo.env` - Demo Docker Compose variables
- `backend/.env` - Production Laravel environment
- `backend/.env.demo` - Demo Laravel environment (optional, can use same as production)

## Network Isolation

- **Production**: `nazim-web_nazim_network`
- **Demo**: `nazim-web_nazim_demo_network`
- **Proxy**: Connected to both networks

This ensures complete isolation between production and demo environments.

## Best Practices

1. **Always use the startup script** (`start-all.sh`) for consistent startup
2. **Check health status** before assuming services are ready
3. **Monitor logs** during startup to catch issues early
4. **Use health checks** to verify services are ready
5. **Keep environment files updated** with correct values

## See Also

- [DEMO_ENVIRONMENT.md](./DEMO_ENVIRONMENT.md) - Demo environment details
- [REVERSE_PROXY.md](./REVERSE_PROXY.md) - Reverse proxy setup
- [PROXY_TROUBLESHOOTING.md](./PROXY_TROUBLESHOOTING.md) - Proxy troubleshooting

