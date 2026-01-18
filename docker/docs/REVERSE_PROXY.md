# Reverse Proxy Setup

This document explains the reverse proxy architecture that routes both production and demo environments through standard ports 80/443.

## Overview

The reverse proxy provides a professional setup where:
- **`nazim.cloud`** → Production environment (via internal network)
- **`demo.nazim.cloud`** → Demo environment (via internal network)
- Both accessible on **ports 80/443** (no custom ports exposed)

## Architecture

```
Internet (ports 80/443)
    ↓
Reverse Proxy (nginx) - Only service exposing 80/443
    ├─→ nazim.cloud → nazim_prod_nginx:80/443 (internal)
    └─→ demo.nazim.cloud → nazim_demo_nginx:80/443 (internal)
```

### Key Benefits

1. **Professional URLs**: No port numbers in URLs (`demo.nazim.cloud` instead of `demo.nazim.cloud:8080`)
2. **Security**: Production and demo services are not directly exposed to the internet
3. **SSL Termination**: Centralized SSL certificate management (optional)
4. **Single Entry Point**: One service owns ports 80/443 (no conflicts)

## Quick Start

### 1. Prerequisites

- Production environment running (`nazim_network`)
- Demo environment running (`nazim_demo_network`)
- Both networks must exist before starting the proxy

### 2. Start the Reverse Proxy

```bash
# Start proxy (connects to existing networks)
docker compose -f docker-compose.proxy.yml up -d
```

### 3. Verify

```bash
# Check proxy health
curl http://localhost/healthz

# Check production routing
curl -H "Host: nazim.cloud" http://localhost/

# Check demo routing
curl -H "Host: demo.nazim.cloud" http://localhost/
```

## Configuration

### Proxy Configuration Files

- **Main nginx config**: `docker/proxy/nginx.conf`
- **Server blocks**: `docker/proxy/conf.d/proxy.conf`

### Environment Variables

Create `docker/env/compose.proxy.env` (optional):

```bash
# Proxy domain (for Let's Encrypt, if proxy manages certs)
PROXY_DOMAIN=nazim.cloud

# Let's Encrypt email
PROXY_LETSENCRYPT_EMAIL=admin@nazim.cloud
```

### Network Connectivity

The proxy connects to both networks:
- `nazim_network` (production)
- `nazim_demo_network` (demo)

This allows the proxy to reach:
- `nazim_prod_nginx` (production nginx container)
- `nazim_demo_nginx` (demo nginx container)

## SSL Certificates

### Option 1: Proxy-Managed Certificates (Recommended)

The proxy manages SSL certificates centrally:

```bash
# Initialize certificates for both domains
docker compose -f docker-compose.proxy.yml exec proxy_certbot \
  certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@nazim.cloud \
  --agree-tos --no-eff-email \
  -d nazim.cloud \
  -d www.nazim.cloud

docker compose -f docker-compose.proxy.yml exec proxy_certbot \
  certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@nazim.cloud \
  --agree-tos --no-eff-email \
  -d demo.nazim.cloud

# Reload nginx after certificates are issued
docker compose -f docker-compose.proxy.yml exec proxy nginx -s reload
```

### Option 2: Use Environment-Managed Certificates

If production/demo manage their own certificates, you can mount them:

**Update `docker-compose.proxy.yml`:**
```yaml
volumes:
  - nazim_letsencrypt:/etc/letsencrypt/prod:ro  # Production certs
  - nazim_demo_letsencrypt:/etc/letsencrypt/demo:ro  # Demo certs
```

**Update `docker/proxy/conf.d/proxy.conf`:**
```nginx
# Production HTTPS
ssl_certificate /etc/letsencrypt/prod/live/nazim.cloud/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/prod/live/nazim.cloud/privkey.pem;

# Demo HTTPS
ssl_certificate /etc/letsencrypt/demo/live/demo.nazim.cloud/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/demo/live/demo.nazim.cloud/privkey.pem;
```

## DNS Configuration

Ensure both domains point to your server:

```
A Record: nazim.cloud → YOUR_SERVER_IP
A Record: www.nazim.cloud → YOUR_SERVER_IP
A Record: demo.nazim.cloud → YOUR_SERVER_IP
```

## Production & Demo Port Changes

### Before Reverse Proxy

- Production: Exposed ports `80:80` and `443:443`
- Demo: Exposed ports `8080:80` and `8443:443`

### After Reverse Proxy

- Production: **No ports exposed** (internal network only)
- Demo: **No ports exposed** (internal network only)
- Proxy: **Only service exposing** `80:80` and `443:443`

### Migration Steps

1. **Stop production and demo** (if running):
   ```bash
   docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml down
   docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml down
   ```

2. **Update compose files** (already done - ports removed):
   - `docker-compose.prod.yml`: Ports removed
   - `docker-compose.demo.yml`: Ports removed

3. **Restart production and demo**:
   ```bash
   docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d
   docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d
   ```

4. **Start reverse proxy**:
   ```bash
   docker compose -f docker-compose.proxy.yml up -d
   ```

## Firewall Configuration

Update firewall to only allow ports 80/443 (remove 8080/8443):

```bash
# Allow HTTP/HTTPS (80/443)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Remove demo ports (no longer needed)
sudo ufw delete allow 8080/tcp
sudo ufw delete allow 8443/tcp
```

## Health Checks

### Proxy Health

```bash
curl http://localhost/healthz
# Should return: "proxy-ok"
```

### Production Health (via proxy)

```bash
curl -H "Host: nazim.cloud" http://localhost/healthz
# Should return: "ok"
```

### Demo Health (via proxy)

```bash
curl -H "Host: demo.nazim.cloud" http://localhost/healthz
# Should return: "ok"
```

## Logs

### View Proxy Logs

```bash
# All logs
docker compose -f docker-compose.proxy.yml logs -f

# Just nginx logs
docker compose -f docker-compose.proxy.yml logs -f proxy
```

### Access Logs Location

Logs are inside the container. To view:

```bash
docker compose -f docker-compose.proxy.yml exec proxy cat /var/log/nginx/access.log
docker compose -f docker-compose.proxy.yml exec proxy cat /var/log/nginx/error.log
```

## Troubleshooting

### Proxy Cannot Reach Production/Demo

**Symptom**: 502 Bad Gateway errors

**Causes**:
- Production/demo containers not running
- Networks not connected properly
- Container names mismatch

**Solutions**:
```bash
# Check networks
docker network ls | grep nazim

# Check if proxy is connected to both networks
docker inspect nazim_proxy | grep Networks

# Verify production/demo containers are running
docker ps | grep nazim

# Restart proxy to reconnect networks
docker compose -f docker-compose.proxy.yml restart proxy
```

### SSL Certificate Errors

**Symptom**: HTTPS not working or certificate errors

**Solutions**:
1. **Verify certificates exist**:
   ```bash
   docker compose -f docker-compose.proxy.yml exec proxy \
     ls -la /etc/letsencrypt/proxy/live/
   ```

2. **Check nginx configuration**:
   ```bash
   docker compose -f docker-compose.proxy.yml exec proxy nginx -t
   ```

3. **Reload nginx**:
   ```bash
   docker compose -f docker-compose.proxy.yml exec proxy nginx -s reload
   ```

### Port Already in Use

**Symptom**: `Error: bind: address already in use` when starting proxy

**Causes**:
- Another service is using ports 80/443
- Production/demo still exposing ports 80/443

**Solutions**:
```bash
# Check what's using ports 80/443
sudo netstat -tuln | grep -E ':(80|443)'

# Stop conflicting services
# Make sure production/demo don't expose ports 80/443
```

### Domain Routing Not Working

**Symptom**: Both domains show same content or wrong content

**Solutions**:
1. **Check DNS**:
   ```bash
   dig nazim.cloud
   dig demo.nazim.cloud
   ```

2. **Test with Host header**:
   ```bash
   curl -H "Host: nazim.cloud" http://localhost/
   curl -H "Host: demo.nazim.cloud" http://localhost/
   ```

3. **Verify nginx config**:
   ```bash
   docker compose -f docker-compose.proxy.yml exec proxy nginx -t
   docker compose -f docker-compose.proxy.yml exec proxy cat /etc/nginx/conf.d/proxy.conf
   ```

## Maintenance

### Restart Proxy

```bash
docker compose -f docker-compose.proxy.yml restart proxy
```

### Reload Nginx Configuration

```bash
# Test configuration
docker compose -f docker-compose.proxy.yml exec proxy nginx -t

# Reload if test passes
docker compose -f docker-compose.proxy.yml exec proxy nginx -s reload
```

### Update Proxy Configuration

1. Edit `docker/proxy/conf.d/proxy.conf`
2. Test configuration:
   ```bash
   docker compose -f docker-compose.proxy.yml exec proxy nginx -t
   ```
3. Reload:
   ```bash
   docker compose -f docker-compose.proxy.yml exec proxy nginx -s reload
   ```

### Certificate Renewal

If proxy manages certificates:

```bash
# Renew certificates
docker compose -f docker-compose.proxy.yml run --rm proxy_certbot certbot renew

# Reload nginx
docker compose -f docker-compose.proxy.yml exec proxy nginx -s reload
```

## Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Production URL | `nazim.cloud` | `nazim.cloud` |
| Demo URL | `demo.nazim.cloud:8080` | `demo.nazim.cloud` |
| Production Ports | `80:80, 443:443` | None (internal) |
| Demo Ports | `8080:80, 8443:443` | None (internal) |
| Proxy Ports | N/A | `80:80, 443:443` |
| SSL Management | Per environment | Centralized (optional) |
| Security | Direct exposure | Isolated via proxy |

## Best Practices

1. **Start proxy after production/demo**: Ensure networks exist first
2. **Use proxy-managed certificates**: Centralized management is easier
3. **Monitor proxy logs**: Central point for all traffic
4. **Keep proxy updated**: Regular nginx updates for security
5. **Test after changes**: Always test nginx config before reloading

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet (80/443)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           Reverse Proxy (nginx) - ports 80/443             │
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────┐       │
│  │ nazim.cloud         │    │ demo.nazim.cloud    │       │
│  │ server block        │    │ server block        │       │
│  └──────────┬──────────┘    └──────────┬──────────┘       │
└─────────────┼──────────────────────────┼───────────────────┘
              │                          │
              │ (internal network)       │ (internal network)
              │                          │
┌─────────────▼──────────┐    ┌─────────▼───────────────────┐
│  Production Network    │    │  Demo Network              │
│  (nazim_network)       │    │  (nazim_demo_network)      │
│                        │    │                            │
│  nazim_prod_nginx      │    │  nazim_demo_nginx          │
│  :80/:443 (internal)   │    │  :80/:443 (internal)       │
└────────────────────────┘    └────────────────────────────┘
```

