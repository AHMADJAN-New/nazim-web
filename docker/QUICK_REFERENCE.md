# Docker Environment Quick Reference

## Production vs Demo

| Command | Production | Demo |
|---------|-----------|------|
| **Setup** | `bash docker/scripts/prod/setup.sh` | `bash docker/scripts/demo/setup.sh` |
| **Start** | `docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d` | `docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d` |
| **Stop** | `docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml down` | `docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml down` |
| **Logs** | `docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs -f` | `docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml logs -f` |
| **Migrate** | `docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml exec php php artisan migrate --force` | `docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml exec php php artisan migrate --force` |
| **Domain** | `nazim.cloud` | `demo.nazim.cloud` |
| **Ports** | 80, 443 | 8080, 8443 |

## Quick Commands

### Start Both Environments
```bash
# Production
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d

# Demo
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml up -d
```

### View Status
```bash
# Production
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml ps

# Demo
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml ps
```

### Access Shell
```bash
# Production PHP
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml exec php bash

# Demo PHP
docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml exec php bash
```

## SSL Certificates

### Production
```bash
bash docker/scripts/prod/https_init.sh    # Initial setup
bash docker/scripts/prod/https_renew.sh   # Manual renewal
```

### Demo
```bash
bash docker/scripts/demo/https_init.sh    # Initial setup
bash docker/scripts/demo/https_renew.sh   # Manual renewal (if exists)
```

## Firewall

The firewall script automatically detects and allows ports for both environments:

```bash
sudo bash docker/scripts/prod/setup-firewall.sh
```

This allows:
- SSH: 22
- Production: 80, 443
- Demo: 8080, 8443 (if demo env file exists)

## For More Details

- Production: See `docker/README.md`
- Demo: See `docker/docs/DEMO_ENVIRONMENT.md`

