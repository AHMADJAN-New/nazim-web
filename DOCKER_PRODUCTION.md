## Production Docker Deployment (New VPS)

This setup matches the audited production topology:
- **Nginx** serves the built frontend at `/`
- **Laravel API** is served under `/api/*` via PHP-FPM
- **Public files** are served from `/storage/*` (Laravel public disk)
- **Private files** are served via `/api/storage/download/*`

### Files added
- `docker-compose.prod.yml`
- `docker/nginx/Dockerfile.prod` + `docker/nginx/default.prod.conf`
- `docker/php/Dockerfile.prod` + `docker/php/nazim.ini`
- `docker/postgres/init/01-extensions.sql` (enables `pgcrypto` for `gen_random_uuid()`)
- `docker/env/compose.prod.env.example` + `docker/env/backend.env.example`
- `docker/scripts/prod/setup.sh` (master setup script - recommended)
- `docker/scripts/prod/bootstrap.sh` (first-time setup)
- `docker/scripts/maintenance/update.sh` (full update/redeploy)
- `docker/scripts/maintenance/update-app.sh` (app-only: frontend + PHP, no db/redis teardown)
- `docker/scripts/backup/backup_db.sh`, `docker/scripts/backup/restore_db.sh`

### 1) On a new VPS

- **Install Docker** + Docker Compose plugin
- **Clone repo** to e.g. `/opt/nazim/nazim-web`
- **DNS**: point `nazim.cloud` (A record) to `168.231.125.153`

### 2) Create env files (DO NOT COMMIT)

- Copy compose env:

```bash
cp docker/env/compose.prod.env.example docker/env/compose.prod.env
```

- Copy backend env:

```bash
cp docker/env/backend.env.example backend/.env
```

- Edit both files:
  - **Required**: `APP_URL`, `POSTGRES_PASSWORD`, `DB_PASSWORD` (keep them consistent)
  - Optional: `MAIL_*`

### 3) Bootstrap

```bash
# Option 1: Master setup (recommended - does everything)
sudo bash docker/scripts/prod/setup.sh

# Option 2: Manual step-by-step
bash docker/scripts/prod/preflight.sh
bash docker/scripts/prod/bootstrap.sh
bash docker/scripts/maintenance/smoke_test.sh
```

### HTTPS (Let's Encrypt)

Bootstrap automatically issues a Let's Encrypt certificate (webroot method) using:
- `DOMAIN` from `docker/env/compose.prod.env`
- `LETSENCRYPT_EMAIL` from `docker/env/compose.prod.env`

Manual issue (if needed):

```bash
bash docker/scripts/prod/https_init.sh
```

Renew (run via host cron, recommended daily):

```bash
bash docker/scripts/prod/https_renew.sh
```

If you use a **wildcard** cert for subdomains (e.g. `*.nazim.cloud`), it was issued with `https_init_wildcard.sh` and does not auto-renew. Renew it manually before expiry by running `bash docker/scripts/prod/https_init_wildcard.sh` again and adding the TXT record when prompted. See WEBSITE_PORTAL_SETUP.md for details.

### 4) Update (future deploys)

**App-only update** (recommended for routine fixes and small deploys):

- Pulls latest code
- Builds PHP image (composer install)
- Builds Nginx image (frontend: npm ci + npm run build)
- Restarts php, queue, scheduler, nginx only (keeps db, redis, certbot, pgadmin running)
- Installs composer deps for bind-mounted code
- Runs migrations and optimize

```bash
bash docker/scripts/maintenance/update-app.sh
```

**Full update** (use when changing infra, Dockerfiles, or doing a clean redeploy):

```bash
bash docker/scripts/maintenance/update.sh
```

### 5) Logs

```bash
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml logs -f
```

### 6) Backups

```bash
bash docker/scripts/backup/backup_db.sh
```

Restore:

```bash
bash docker/scripts/backup/restore_db.sh backups/db_YYYYMMDD_HHMMSS.sql.gz
```

Storage backup (uploads, private docs, cached reports, etc.):

```bash
bash docker/scripts/backup/backup_storage.sh
```

Restore:

```bash
bash docker/scripts/backup/restore_storage.sh backups/storage_YYYYMMDD_HHMMSS.tar.gz
```

