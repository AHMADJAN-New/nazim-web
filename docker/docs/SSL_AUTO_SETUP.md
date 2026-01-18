# Automated SSL Certificate Setup for Reverse Proxy

This guide explains how to automatically configure SSL certificates for the reverse proxy.

## Quick Setup

Run the automated setup script:

```bash
bash docker/scripts/proxy/setup_ssl.sh
```

This will:
1. Issue Let's Encrypt certificates for `nazim.cloud` and `demo.nazim.cloud`
2. Automatically configure nginx to enable HTTPS
3. Reload nginx to apply changes

## Prerequisites

### 1. DNS Configuration

**CRITICAL: Before running SSL setup, DNS must point to your server!**

Configure DNS records:
```
A Record: nazim.cloud → YOUR_SERVER_IP
A Record: www.nazim.cloud → YOUR_SERVER_IP (optional)
A Record: demo.nazim.cloud → YOUR_SERVER_IP
```

Verify DNS is configured:
```bash
dig nazim.cloud
dig demo.nazim.cloud
```

Both should return your server's IP address.

### 2. Proxy Must Be Running

The proxy must be running to serve the ACME challenge:

```bash
docker compose -f docker-compose.proxy.yml up -d proxy
```

### 3. Environment Variables

Create `docker/env/compose.proxy.env` (optional):

```bash
PROD_DOMAIN=nazim.cloud
DEMO_DOMAIN=demo.nazim.cloud
PROXY_LETSENCRYPT_EMAIL=admin@nazim.cloud
```

If not provided, defaults are used:
- `PROD_DOMAIN`: `nazim.cloud`
- `DEMO_DOMAIN`: `demo.nazim.cloud`
- `PROXY_LETSENCRYPT_EMAIL`: `admin@nazim.cloud`

## Automated Setup Process

### Step 1: Initialize Certificates

```bash
bash docker/scripts/proxy/https_init.sh
```

This script:
- Starts the proxy (if not running)
- Issues certificates for both domains using Let's Encrypt
- Uses webroot authentication (serves ACME challenge via proxy)

### Step 2: Configure Nginx for HTTPS

```bash
bash docker/scripts/proxy/https_configure.sh
```

This script:
- Checks if certificates exist
- Uncomments HTTPS server blocks in nginx config
- Reloads nginx to enable HTTPS

### Step 3: Verify Setup

After setup, test HTTPS:

```bash
# Test production HTTPS
curl -k https://nazim.cloud/healthz

# Test demo HTTPS
curl -k https://demo.nazim.cloud/healthz
```

**Note**: Use `-k` flag to skip certificate verification (if testing from server itself).

## Manual Setup (If Needed)

If automated setup fails, you can do it manually:

### 1. Issue Certificate for Production

```bash
docker compose -f docker-compose.proxy.yml run --rm proxy_certbot certonly \
  --webroot -w /var/www/certbot \
  -d nazim.cloud \
  --email admin@nazim.cloud \
  --agree-tos \
  --no-eff-email \
  --non-interactive
```

### 2. Issue Certificate for Demo

```bash
docker compose -f docker-compose.proxy.yml run --rm proxy_certbot certonly \
  --webroot -w /var/www/certbot \
  -d demo.nazim.cloud \
  --email admin@nazim.cloud \
  --agree-tos \
  --no-eff-email \
  --non-interactive
```

### 3. Enable HTTPS in Nginx

Edit `docker/proxy/conf.d/proxy.conf` and uncomment the HTTPS server blocks:

**Production HTTPS (lines 60-109):**
```nginx
# Remove the leading # from each line in this block
server {
    listen 443 ssl;
    http2 on;
    server_name nazim.cloud www.nazim.cloud;
    # ... rest of config
}
```

**Demo HTTPS (lines 154-201):**
```nginx
# Remove the leading # from each line in this block
server {
    listen 443 ssl;
    http2 on;
    server_name demo.nazim.cloud;
    # ... rest of config
}
```

### 4. Reload Nginx

```bash
docker compose -f docker-compose.proxy.yml exec proxy nginx -t  # Test config
docker compose -f docker-compose.proxy.yml exec proxy nginx -s reload  # Reload
```

## Certificate Renewal

Certificates are valid for 90 days and auto-renew 30 days before expiry.

### Manual Renewal

```bash
# Renew all certificates
docker compose -f docker-compose.proxy.yml run --rm proxy_certbot renew

# Reload nginx after renewal
docker compose -f docker-compose.proxy.yml exec proxy nginx -s reload
```

### Automatic Renewal (Cron)

Add to crontab for automatic renewal:

```bash
# Run daily at 2 AM
0 2 * * * cd /projects/nazim-web && docker compose -f docker-compose.proxy.yml run --rm proxy_certbot renew --quiet && docker compose -f docker-compose.proxy.yml exec proxy nginx -s reload
```

Or use the renewal script:

```bash
# Create renewal script
cat > /etc/cron.daily/proxy-cert-renewal << 'EOF'
#!/bin/bash
cd /projects/nazim-web
docker compose -f docker-compose.proxy.yml run --rm proxy_certbot renew --quiet
docker compose -f docker-compose.proxy.yml exec proxy nginx -s reload
EOF

chmod +x /etc/cron.daily/proxy-cert-renewal
```

## Troubleshooting

### DNS Not Resolved

**Symptom**: `ERR_NAME_NOT_RESOLVED` when accessing domains

**Cause**: DNS records are not configured or not propagated

**Solution**:
1. Verify DNS records point to your server:
   ```bash
   dig nazim.cloud
   dig demo.nazim.cloud
   ```
2. Wait for DNS propagation (can take up to 48 hours)
3. Test from different DNS servers: `dig @8.8.8.8 nazim.cloud`

### Certificate Issuance Fails

**Symptom**: Certbot fails with "Domain does not point to this server"

**Causes**:
- DNS not configured
- Firewall blocking port 80
- Proxy not accessible from internet

**Solution**:
1. **Verify DNS**: `dig nazim.cloud` should return your server IP
2. **Check firewall**: Port 80 must be open:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```
3. **Test ACME challenge**: 
   ```bash
   curl http://nazim.cloud/.well-known/acme-challenge/test
   ```
   Should not return 404 (even if file doesn't exist, directory should be accessible)

### Certificate File Not Found

**Symptom**: Nginx fails with "cannot load certificate"

**Cause**: Certificate doesn't exist yet or HTTPS block is not commented out

**Solution**:
1. **Check if certificate exists**:
   ```bash
   docker volume inspect nazim-web_nazim_proxy_letsencrypt
   docker run --rm -v nazim-web_nazim_proxy_letsencrypt:/certs:ro alpine ls -la /certs/live/
   ```
2. **Run certificate setup**: `bash docker/scripts/proxy/setup_ssl.sh`
3. **If certificates don't exist**: Comment out HTTPS blocks in `proxy.conf` until certificates are obtained

### Proxy Nginx Not Starting

**Symptom**: Proxy container keeps restarting

**Causes**:
- Nginx config syntax error
- Missing certificates (if HTTPS blocks are uncommented)
- Upstream hosts not resolvable

**Solution**:
1. **Check nginx config**:
   ```bash
   docker compose -f docker-compose.proxy.yml exec proxy nginx -t
   ```
2. **Check logs**:
   ```bash
   docker compose -f docker-compose.proxy.yml logs proxy
   ```
3. **Ensure HTTP blocks are active** (HTTPS blocks should be commented out if certs don't exist)

## Scripts Reference

### `docker/scripts/proxy/setup_ssl.sh`

Master script that runs both initialization and configuration.

**Usage:**
```bash
bash docker/scripts/proxy/setup_ssl.sh
```

### `docker/scripts/proxy/https_init.sh`

Initializes SSL certificates by issuing them from Let's Encrypt.

**Usage:**
```bash
bash docker/scripts/proxy/https_init.sh
```

**What it does:**
- Ensures proxy is running
- Issues certificate for production domain
- Issues certificate for demo domain

### `docker/scripts/proxy/https_configure.sh`

Configures nginx to enable HTTPS by uncommenting HTTPS blocks.

**Usage:**
```bash
bash docker/scripts/proxy/https_configure.sh
```

**What it does:**
- Checks if certificates exist
- Uncomments HTTPS blocks in nginx config
- Reloads nginx

## Security Notes

1. **Keep certificates secure**: Certificates are stored in Docker volumes
2. **Auto-renewal**: Set up cron job for automatic renewal
3. **Firewall**: Only expose ports 80 and 443
4. **DNS**: Ensure DNS is correctly configured before issuing certificates
5. **Email**: Use valid email address for Let's Encrypt notifications

## Next Steps

After SSL setup is complete:

1. ✅ Test HTTPS access: `https://nazim.cloud` and `https://demo.nazim.cloud`
2. ✅ Verify automatic HTTP → HTTPS redirect works
3. ✅ Set up certificate renewal cron job
4. ✅ Monitor certificate expiry (certificates are valid for 90 days)

