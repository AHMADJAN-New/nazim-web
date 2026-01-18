# Setup Verification Guide

This guide helps you verify that production, demo, and reverse proxy containers are configured correctly and can build/run.

## Quick Verification

Run the test script:

```bash
bash docker/scripts/test-setup.sh
```

This will check:
- ✅ Docker Compose configuration validity
- ✅ Required files exist
- ✅ Nginx configuration syntax (basic check)

## Manual Verification

### 1. Validate Configuration Files

```bash
# Production
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml config --quiet

# Demo
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml config --quiet

# Proxy
docker compose -f docker-compose.proxy.yml config --quiet
```

All should complete without errors.

### 2. Check for Required Files

```bash
ls -la docker/proxy/nginx.conf
ls -la docker/proxy/conf.d/proxy.conf
```

Both files should exist.

### 3. Test Building Services

#### Test Production Build

```bash
# Build PHP image
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml build php

# Build Nginx image
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml build nginx
```

#### Test Demo Build

```bash
# Build PHP image
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml build php

# Build Nginx image
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml build nginx
```

### 4. Start Services (Step by Step)

**Important**: Start production and demo FIRST (they create networks), then start the proxy.

#### Step 1: Start Production

```bash
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d
```

Verify:
```bash
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml ps
# All services should show "Up" status

# Check network
docker network inspect nazim_network | grep Name
# Should show nazim_network
```

#### Step 2: Start Demo

```bash
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d
```

Verify:
```bash
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml ps
# All services should show "Up" status

# Check network
docker network inspect nazim_demo_network | grep Name
# Should show nazim_demo_network
```

#### Step 3: Start Proxy

```bash
docker compose -f docker-compose.proxy.yml up -d
```

Verify:
```bash
docker compose -f docker-compose.proxy.yml ps
# Proxy should show "Up" status

# Check proxy health
curl http://localhost/healthz
# Should return: "proxy-ok"

# Check if proxy can reach production/demo (via networks)
docker exec nazim_proxy ping -c 1 nazim_prod_nginx
docker exec nazim_proxy ping -c 1 nazim_demo_nginx
# Both should succeed
```

## Common Issues

### Issue: "Network does not exist"

**Symptom**: Proxy fails to start with "network not found" error

**Solution**: Start production and demo first to create networks

```bash
# Create networks first
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d

# Then start proxy
docker compose -f docker-compose.proxy.yml up -d
```

### Issue: "Volume does not exist"

**Symptom**: Proxy fails with "volume not found" for `nazim_letsencrypt` or `nazim_demo_letsencrypt`

**Solution**: Volumes are created automatically when production/demo start. If they don't exist:

```bash
# Start production (creates nazim_letsencrypt volume)
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d

# Start demo (creates nazim_demo_letsencrypt volume)
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d

# Then start proxy
docker compose -f docker-compose.proxy.yml up -d
```

### Issue: "Port already in use"

**Symptom**: Proxy fails to start - port 80 or 443 already in use

**Solution**: Check what's using the ports and stop it

```bash
# Check what's using ports 80/443
sudo netstat -tuln | grep -E ':(80|443)'

# Stop any conflicting services (production/demo should not expose these ports now)
# If production/demo are still exposing ports, stop them, update compose files, restart
```

### Issue: "Cannot connect to nazim_prod_nginx"

**Symptom**: Proxy returns 502 Bad Gateway when accessing production

**Solution**: Verify production nginx is running and accessible

```bash
# Check production nginx is running
docker ps | grep nazim_prod_nginx

# Check if proxy can reach it (from inside proxy container)
docker exec nazim_proxy wget -qO- http://nazim_prod_nginx:80/healthz

# Check production nginx logs
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs nginx
```

### Issue: "Cannot connect to nazim_demo_nginx"

**Symptom**: Proxy returns 502 Bad Gateway when accessing demo

**Solution**: Verify demo nginx is running and accessible

```bash
# Check demo nginx is running
docker ps | grep nazim_demo_nginx

# Check if proxy can reach it (from inside proxy container)
docker exec nazim_proxy wget -qO- http://nazim_demo_nginx:80/healthz

# Check demo nginx logs
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml logs nginx
```

## Expected Container Status

After all services are running:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Should show:

| Container Name | Status | Ports |
|---------------|--------|-------|
| nazim_prod_db | Up | - |
| nazim_prod_redis | Up | - |
| nazim_prod_php | Up (healthy) | - |
| nazim_prod_nginx | Up (healthy) | - |
| nazim_prod_queue | Up | - |
| nazim_prod_scheduler | Up | - |
| nazim_demo_db | Up | - |
| nazim_demo_redis | Up | - |
| nazim_demo_php | Up (healthy) | - |
| nazim_demo_nginx | Up (healthy) | - |
| nazim_demo_queue | Up | - |
| nazim_demo_scheduler | Up | - |
| nazim_proxy | Up (healthy) | 0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp |

**Note**: Only the proxy should have ports 80/443 exposed. Production and demo should have no exposed ports.

## Network Verification

Verify all networks exist and proxy is connected to both:

```bash
# List networks
docker network ls | grep nazim

# Check proxy network connections
docker inspect nazim_proxy | grep -A 10 Networks
```

Should show:
- `nazim_network` (connected)
- `nazim_demo_network` (connected)

## Testing Routes

### Test Production Route

```bash
# Test via proxy (HTTP)
curl -H "Host: nazim.cloud" http://localhost/healthz
# Should return: "ok"

# Test via proxy (HTTPS - if SSL is configured)
curl -k -H "Host: nazim.cloud" https://localhost/healthz
# Should return: "ok"
```

### Test Demo Route

```bash
# Test via proxy (HTTP)
curl -H "Host: demo.nazim.cloud" http://localhost/healthz
# Should return: "ok"

# Test via proxy (HTTPS - if SSL is configured)
curl -k -H "Host: demo.nazim.cloud" https://localhost/healthz
# Should return: "ok"
```

### Test Direct Access (Internal)

```bash
# Production nginx (internal)
docker exec nazim_prod_nginx wget -qO- http://localhost/healthz
# Should return: "ok"

# Demo nginx (internal)
docker exec nazim_demo_nginx wget -qO- http://localhost/healthz
# Should return: "ok"
```

## Logs to Check

If something isn't working, check these logs:

### Production Logs

```bash
# All services
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs

# Just nginx
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs nginx

# Just PHP
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs php
```

### Demo Logs

```bash
# All services
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml logs

# Just nginx
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml logs nginx

# Just PHP
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml logs php
```

### Proxy Logs

```bash
# All logs
docker compose -f docker-compose.proxy.yml logs

# Just nginx
docker compose -f docker-compose.proxy.yml logs proxy

# Access/error logs
docker exec nazim_proxy cat /var/log/nginx/access.log
docker exec nazim_proxy cat /var/log/nginx/error.log
```

## Success Checklist

- [ ] All Docker Compose files validate (`config --quiet` passes)
- [ ] Production services start and are healthy
- [ ] Demo services start and are healthy
- [ ] Proxy starts successfully
- [ ] Networks `nazim_network` and `nazim_demo_network` exist
- [ ] Proxy is connected to both networks
- [ ] Only proxy exposes ports 80/443
- [ ] Production nginx responds to health checks (internal)
- [ ] Demo nginx responds to health checks (internal)
- [ ] Proxy routes production requests correctly
- [ ] Proxy routes demo requests correctly

## Next Steps

Once verification is complete:

1. Configure SSL certificates (see `REVERSE_PROXY.md`)
2. Update DNS records (if not already done)
3. Test full application functionality
4. Set up monitoring and logging

