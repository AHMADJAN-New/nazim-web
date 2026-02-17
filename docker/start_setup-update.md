# Docker Setup & Update Guide

Standard workflow for setting up, updating, and running the production environment.

---

## 🟢 Initial Setup (First Time Only)

Run once when deploying for the very first time. Prepares the environment, creates folders, and initializes all services.

```bash
sudo bash docker/scripts/prod/setup.sh
```

**Or step-by-step:**
```bash
bash docker/scripts/prod/preflight.sh
bash docker/scripts/prod/bootstrap.sh
bash docker/scripts/maintenance/smoke_test.sh
```

---

## 🔄 Updates (After First Deploy)

### App-only update (recommended for routine deploys)

Use for bug fixes, small changes, and regular deploys. Keeps database, Redis, and other services running.

**What it does:**
- Pulls latest code
- Installs frontend dependencies (npm ci)
- Builds PHP image (composer install)
- Builds Nginx image (frontend: npm ci + npm run build)
- Restarts php, queue, scheduler, nginx only
- Installs composer deps for bind-mounted code
- Runs migrations and optimize
- Syncs default role permissions

```bash
bash docker/scripts/maintenance/update-app.sh
```

### Full update (use sparingly)

Use when changing Dockerfiles, infrastructure, or doing a clean redeploy. Stops and removes all containers, rebuilds everything with `--no-cache`.

```bash
bash docker/scripts/prod/update.sh
```

---

## 🚀 Build and Start (Full Stack)

Start the full production stack. Run after initial setup or after a full update.

```bash
bash docker/scripts/prod/bootstrap.sh
```

**Note:** After `update-app.sh`, you do **not** need bootstrap — app services are already restarted.

---

## Quick Reference

| Situation | Command |
|-----------|---------|
| First deploy | `sudo bash docker/scripts/prod/setup.sh` |
| Routine fix / small deploy | `bash docker/scripts/maintenance/update-app.sh` |
| Infra change / full rebuild | `bash docker/scripts/prod/update.sh` |
| Start stack (after full update) | `bash docker/scripts/prod/bootstrap.sh` |

---

## Common Tasks

### Sync role permissions manually

```bash
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml exec php sh -lc 'php artisan permissions:sync-default-roles'
```

Add `--dry-run` before the command to preview changes without applying.

**If users with accountant/staff roles get 403 on organizations, buildings, schools:**
1. Deploy latest backend (PermissionSeeder, SyncDefaultRolesPermissions).
2. Run the sync on the production environment (see above).
3. Have affected users log out and log back in.

### Rebuild frontend after env var changes

If you change `VITE_*` in `docker/env/compose.prod.env`, rebuild the Nginx image so the frontend gets new build-time values:

```bash
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml build nginx
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d nginx
```

Or run `bash docker/scripts/maintenance/update-app.sh`.

### Old frontend bundle (debug output in console)

If you see `[AppHeader DEBUG] Features:` in the browser console, the frontend bundle is outdated. Rebuild:
`bash docker/scripts/maintenance/update-app.sh` or `bash docker/scripts/prod/update.sh`.

---

## Troubleshooting

### 413 Request Entity Too Large on desktop uploads

Nginx and PHP limits must allow at least 500 MB. The repo sets `client_max_body_size 512M` and `post_max_size`/`upload_max_filesize 512M`. Rebuild or restart nginx and php after changing limits.

### Slow desktop release downloads (~70 KB/s)

1. **X-Accel-Redirect:** Stack uses X-Accel-Redirect so nginx serves files directly. Ensure nginx config has `internal-desktop-files/` location and `DESKTOP_USE_X_ACCEL_REDIRECT=true` in backend `.env`.
2. **Nginx tuning:** Config uses `sendfile on` and tcp options for throughput. Rebuild or restart nginx after changes.
3. **CDN:** If behind Cloudflare, downloads may be throttled. Use a subdomain that bypasses CDN or whitelist `/api/desktop/`.
4. **Bandwidth:** Check hosting provider limits.

---

## What Runs Automatically

When you run the commands above:

- Latest Docker images are pulled (or built)
- Services are built and started in dependency order
- Database migrations run
- Seeders apply (if configured)
- pgAdmin starts for database management
- Health checks run

---

## Result

- All services running
- Database up to date
- Environment consistent and reproducible
- Ready for production

### pgAdmin access

- **URL:** `http://localhost:5050` (or `PGADMIN_PORT`)
- **Email:** value from `PGADMIN_EMAIL` (default `admin@nazim.cloud`)
- **Password:** value from `PGADMIN_PASSWORD` (default `admin`)

**Connect to PostgreSQL:**
1. Login to pgAdmin
2. Right-click "Servers" → "Register" → "Server"
3. Host: `db`, Port: `5432`, Database: `nazim`, Username: `nazim`, Password: `POSTGRES_PASSWORD`

See `docker/pgadmin-setup.md` for details.
