# Proxy Troubleshooting Guide

This guide helps diagnose and fix common proxy issues causing 500/502 errors.

## Common Issues

### Issue 1: SSL Certificate Permission Denied

**Symptoms:**
```
stat() "/etc/letsencrypt/proxy/live/demo.nazim.cloud/fullchain.pem" failed (13: Permission denied)
```

**Causes:**
- SSL certificates don't exist yet
- Certificate files have wrong permissions
- Nginx user can't read certificate files

**Solutions:**

1. **Check if certificates exist:**
   ```bash
   docker exec nazim_proxy ls -la /etc/letsencrypt/proxy/live/
   ```

2. **If certificates don't exist, initialize them:**
   ```bash
   bash docker/scripts/proxy/https_init.sh
   ```

3. **If certificates exist but have wrong permissions, fix them:**
   ```bash
   docker exec nazim_proxy chmod 644 /etc/letsencrypt/proxy/live/*/fullchain.pem
   docker exec nazim_proxy chmod 644 /etc/letsencrypt/proxy/live/*/privkey.pem
   docker exec nazim_proxy chown -R nginx:nginx /etc/letsencrypt/proxy/live/
   ```

4. **Reload nginx:**
   ```bash
   docker exec nazim_proxy nginx -s reload
   ```

### Issue 2: DNS Resolution Failure

**Symptoms:**
```
nazim_demo_nginx could not be resolved (2: Server failure)
```

**Causes:**
- Backend containers aren't running
- Proxy isn't connected to the correct networks
- Container names don't match

**Solutions:**

1. **Check if backend containers are running:**
   ```bash
   docker ps | grep -E "nazim_prod_nginx|nazim_demo_nginx"
   ```

2. **If containers aren't running, start them:**
   ```bash
   # Start production
   docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d
   
   # Start demo
   docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d
   ```

3. **Check if proxy is connected to networks:**
   ```bash
   docker network inspect nazim-web_nazim_network | grep nazim_proxy
   docker network inspect nazim-web_nazim_demo_network | grep nazim_proxy
   ```

4. **If proxy isn't connected, restart it:**
   ```bash
   docker compose -f docker-compose.proxy.yml restart proxy
   ```

5. **Test DNS resolution from proxy:**
   ```bash
   docker exec nazim_proxy nslookup nazim_prod_nginx
   docker exec nazim_proxy nslookup nazim_demo_nginx
   ```

### Issue 3: 502 Bad Gateway

**Symptoms:**
- All requests return 502 Bad Gateway
- Browser shows "502 Bad Gateway" error

**Causes:**
- Backend containers aren't running
- Proxy can't reach backend containers
- SSL certificate issues preventing HTTPS from working
- Network connectivity problems

**Solutions:**

1. **Run the diagnostic script:**
   ```bash
   bash docker/scripts/proxy/diagnose.sh
   ```

2. **Run the fix script:**
   ```bash
   bash docker/scripts/proxy/fix-proxy.sh
   ```

3. **Check proxy logs:**
   ```bash
   docker compose -f docker-compose.proxy.yml logs -f proxy
   ```

4. **Check backend container logs:**
   ```bash
   # Production
   docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs -f nginx
   
   # Demo
   docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml logs -f nginx
   ```

5. **Test HTTP connectivity from proxy:**
   ```bash
   docker exec nazim_proxy wget -qO- http://nazim_prod_nginx:80/healthz
   docker exec nazim_proxy wget -qO- http://nazim_demo_nginx:80/healthz
   ```

## Quick Fix Script

Run the comprehensive fix script:

```bash
bash docker/scripts/proxy/fix-proxy.sh
```

This script will:
1. Ensure production containers are running
2. Ensure demo containers are running
3. Restart proxy to reconnect networks
4. Fix certificate permissions
5. Test nginx configuration
6. Reload nginx
7. Test connectivity

## Step-by-Step Recovery

If you're experiencing 502 errors, follow these steps:

### Step 1: Check Container Status

```bash
# Check all containers
docker ps -a | grep nazim

# Check proxy
docker ps | grep nazim_proxy

# Check production
docker ps | grep nazim_prod

# Check demo
docker ps | grep nazim_demo
```

### Step 2: Start Missing Containers

```bash
# Start production (if not running)
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d

# Start demo (if not running)
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d

# Start proxy (if not running)
docker compose -f docker-compose.proxy.yml up -d
```

### Step 3: Verify Networks

```bash
# Check networks exist
docker network ls | grep nazim

# Check proxy is connected
docker network inspect nazim-web_nazim_network --format '{{range .Containers}}{{.Name}} {{end}}'
docker network inspect nazim-web_nazim_demo_network --format '{{range .Containers}}{{.Name}} {{end}}'
```

### Step 4: Initialize SSL Certificates (if needed)

```bash
# Initialize certificates
bash docker/scripts/proxy/https_init.sh

# Reload nginx
docker exec nazim_proxy nginx -s reload
```

### Step 5: Test Connectivity

```bash
# Test proxy health
curl http://localhost/healthz

# Test production routing
curl -H "Host: nazim.cloud" http://localhost/healthz

# Test demo routing
curl -H "Host: demo.nazim.cloud" http://localhost/healthz
```

## SSL Certificate Issues

### Certificates Don't Exist

If certificates don't exist, nginx will fail to start HTTPS server blocks. The HTTP blocks should still work.

**Solution:**
```bash
# Initialize certificates
bash docker/scripts/proxy/https_init.sh

# Reload nginx
docker exec nazim_proxy nginx -s reload
```

### Certificate Permission Issues

If certificates exist but nginx can't read them:

```bash
# Fix permissions
docker exec nazim_proxy chmod 644 /etc/letsencrypt/proxy/live/*/fullchain.pem
docker exec nazim_proxy chmod 644 /etc/letsencrypt/proxy/live/*/privkey.pem

# Fix ownership (if needed)
docker exec nazim_proxy chown -R nginx:nginx /etc/letsencrypt/proxy/live/

# Reload nginx
docker exec nazim_proxy nginx -s reload
```

### Temporary Workaround: HTTP Only

If you need to get the system working immediately without SSL:

1. Comment out HTTPS server blocks in `docker/proxy/conf.d/proxy.conf`
2. Reload nginx: `docker exec nazim_proxy nginx -s reload`
3. Access via HTTP: `http://nazim.cloud` and `http://demo.nazim.cloud`

**Note:** This is only for temporary troubleshooting. Always use HTTPS in production.

## Network Issues

### Proxy Can't Reach Backend

If the proxy can't resolve backend container names:

1. **Verify containers are running:**
   ```bash
   docker ps | grep -E "nazim_prod_nginx|nazim_demo_nginx"
   ```

2. **Verify networks exist:**
   ```bash
   docker network ls | grep nazim
   ```

3. **Restart proxy to reconnect:**
   ```bash
   docker compose -f docker-compose.proxy.yml restart proxy
   ```

4. **Test DNS resolution:**
   ```bash
   docker exec nazim_proxy nslookup nazim_prod_nginx
   docker exec nazim_proxy nslookup nazim_demo_nginx
   ```

### Network Doesn't Exist

If you get "network not found" errors:

1. **Start production/demo first to create networks:**
   ```bash
   docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d
   docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d
   ```

2. **Then start proxy:**
   ```bash
   docker compose -f docker-compose.proxy.yml up -d
   ```

## Testing

### Test Proxy Health

```bash
curl http://localhost/healthz
# Should return: "proxy-ok"
```

### Test Production Routing

```bash
curl -H "Host: nazim.cloud" http://localhost/healthz
# Should return: "ok"
```

### Test Demo Routing

```bash
curl -H "Host: demo.nazim.cloud" http://localhost/healthz
# Should return: "ok"
```

### Test HTTPS (if certificates exist)

```bash
curl -k https://nazim.cloud/healthz
curl -k https://demo.nazim.cloud/healthz
```

## Logs

### View Proxy Logs

```bash
# All logs
docker compose -f docker-compose.proxy.yml logs -f proxy

# Error log only
docker exec nazim_proxy tail -f /var/log/nginx/error.log

# Access log
docker exec nazim_proxy tail -f /var/log/nginx/access.log
```

### View Backend Logs

```bash
# Production nginx
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs -f nginx

# Demo nginx
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml logs -f nginx
```

## Prevention

To prevent these issues:

1. **Always start production/demo before proxy** (networks must exist)
2. **Initialize SSL certificates before accessing HTTPS**
3. **Use the fix script after any container restarts**
4. **Monitor container health regularly**

## Emergency Recovery

If everything is broken:

```bash
# 1. Stop everything
docker compose -f docker-compose.proxy.yml down
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml down
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml down

# 2. Start production
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d

# 3. Start demo
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d

# 4. Wait for networks to be ready
sleep 5

# 5. Start proxy
docker compose -f docker-compose.proxy.yml up -d

# 6. Run fix script
bash docker/scripts/proxy/fix-proxy.sh
```

