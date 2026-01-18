# Reverse Proxy Quick Reference

## Quick Start

```bash
# 1. Ensure production and demo are running (networks must exist)
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d

# 2. Start the reverse proxy
docker compose -f docker-compose.proxy.yml up -d

# 3. Verify
curl http://localhost/healthz  # Should return "proxy-ok"
```

## URLs

- **Production**: `https://nazim.cloud` (or `http://nazim.cloud` before SSL)
- **Demo**: `https://demo.nazim.cloud` (or `http://demo.nazim.cloud` before SSL)

## Architecture

```
Internet → Reverse Proxy (80/443) → Production/Demo (internal)
```

## Configuration Files

- **Main config**: `docker/proxy/nginx.conf`
- **Server blocks**: `docker/proxy/conf.d/proxy.conf`
- **Docker Compose**: `docker-compose.proxy.yml`

## Common Commands

```bash
# Start proxy
docker compose -f docker-compose.proxy.yml up -d

# Stop proxy
docker compose -f docker-compose.proxy.yml down

# View logs
docker compose -f docker-compose.proxy.yml logs -f proxy

# Reload nginx config
docker compose -f docker-compose.proxy.yml exec proxy nginx -t  # Test
docker compose -f docker-compose.proxy.yml exec proxy nginx -s reload  # Reload

# Check health
curl http://localhost/healthz
```

## Troubleshooting

See full documentation in `docker/docs/REVERSE_PROXY.md`.

