# Docker Setup - Quick Reference

## Quick Start

### Start Production Only

```bash
bash docker/scripts/start-production.sh
```

### Start All Environments (Production + Demo + Proxy)

```bash
bash docker/scripts/start-all.sh
```

### Stop All Environments

```bash
bash docker/scripts/stop-all.sh
```

## URLs

- **Production**: https://nazim.cloud
- **Demo**: https://demo.nazim.cloud (if started)

## Common Commands

### Start Individual Environments

```bash
# Production only
bash docker/scripts/start-production.sh
# OR
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d

# Demo only
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d

# Proxy only
docker compose -f docker-compose.proxy.yml up -d
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

### Check Status

```bash
# All containers
docker ps | grep nazim

# Production status
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml ps

# Demo status
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml ps
```

## Troubleshooting

### Fix Proxy Issues

```bash
bash docker/scripts/proxy/fix-proxy.sh
```

### Diagnose Issues

```bash
bash docker/scripts/proxy/diagnose.sh
```

### Fix Certificate Permissions

```bash
bash docker/scripts/proxy/fix-cert-permissions.sh
```

## Documentation

- [STARTUP_GUIDE.md](./docs/STARTUP_GUIDE.md) - Complete startup guide
- [DEMO_ENVIRONMENT.md](./docs/DEMO_ENVIRONMENT.md) - Demo environment details
- [REVERSE_PROXY.md](./docs/REVERSE_PROXY.md) - Reverse proxy setup
- [PROXY_TROUBLESHOOTING.md](./docs/PROXY_TROUBLESHOOTING.md) - Troubleshooting guide

## Scripts

All scripts are in `docker/scripts/`:

- `start-production.sh` - Start production only
- `start-all.sh` - Start all environments
- `stop-all.sh` - Stop all environments
- `proxy/diagnose.sh` - Diagnose proxy issues
- `proxy/fix-proxy.sh` - Fix proxy issues
- `proxy/fix-cert-permissions.sh` - Fix certificate permissions
- `demo/create-demo-user.sh` - Create demo admin user

## Architecture

```
Internet (ports 80/443)
    ↓
Reverse Proxy (nginx) - Optional, only if using proxy
    ├─→ nazim.cloud → Production (internal)
    └─→ demo.nazim.cloud → Demo (internal)
```

Production can run standalone or with the reverse proxy.
