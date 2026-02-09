
## How to Use

This section explains the standard workflow for setting up, updating, and running the production environment.

---

### 🟢 Initial Setup (First Time Only)

Run this once when deploying the project for the very first time.  
It prepares the environment, creates required folders, and initializes core services.

```bash
docker/scripts/prod/setup.sh
````

---

### 🔄 Update Everything

Use this whenever you pull new changes from the repository or want to refresh all services.

This step will update code, images, and dependencies.

```bash
docker/scripts/prod/update.sh
```

This also runs **permissions:sync-default-roles** (adds missing staff finance/fees read permissions and creates the accountant role for existing organizations).

**Run sync manually** (e.g. after first deploy of the roles/permissions changes):

```bash
docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml exec php sh -lc 'php artisan permissions:sync-default-roles'
```

Or with dry-run: add `--dry-run` before the command string to see what would be done.

**If users with accountant/staff/other roles still get 403 on organizations, buildings, schools, etc.:**

1. Ensure the **latest backend** is deployed (PermissionSeeder and SyncDefaultRolesPermissions with base permissions for all roles).
2. Run the sync **on the same environment** where the API runs (e.g. production Docker):
   ```bash
   docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml exec php sh -lc 'php artisan permissions:sync-default-roles'
   ```
3. Have affected users **log out and log back in** (or wait for cache expiry) so permissions are rechecked.

**If you still see `[AppHeader DEBUG] Features:` in the browser console:** the frontend bundle is old. Rebuild and redeploy the frontend (e.g. run your build/deploy script or `docker/scripts/prod/update.sh` and ensure the frontend is rebuilt).

---

### 🚀 Build and Start

Build all Docker images and start the full production stack.

Run this after setup or update.

```bash
docker/scripts/prod/bootstrap.sh
```

---
ebuild the frontend (and Nginx image) so the new env vars are baked in:
   docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml build 
Or run your usual deploy/update script.
## What Happens Automatically

When you run the above commands, the system will automatically:

* Pull the latest Docker images
* Build all required services
* Create and configure Docker networks
* Create and mount persistent volumes
* Run database migrations
* Apply database seeders (if configured)
* Start all containers in the correct dependency order (including pgAdmin for database management)
* Perform basic health checks

---

## Result

After completion:

* All services are running
* The database is up-to-date
* The environment is consistent and reproducible
* The system is ready for production use
* **pgAdmin is available** for database administration at `http://localhost:5050` (default port)

### Accessing pgAdmin

After setup/update, you can access pgAdmin (database administration tool) at:

- **URL**: `http://localhost:5050` (or the port specified in `PGADMIN_PORT` env var)
- **Email**: `admin@nazim.cloud` (or value from `PGADMIN_EMAIL` env var)
- **Password**: `admin` (or value from `PGADMIN_PASSWORD` env var)

**To connect to your PostgreSQL database in pgAdmin:**
1. Login to pgAdmin
2. Right-click "Servers" → "Register" → "Server"
3. Use these connection details:
   - **Host**: `db` (Docker service name)
   - **Port**: `5432`
   - **Database**: `nazim` (or value from `POSTGRES_DB`)
   - **Username**: `nazim` (or value from `POSTGRES_USER`)
   - **Password**: Your `POSTGRES_PASSWORD` value

See `docker/pgadmin-setup.md` for detailed instructions.

This workflow guarantees a **stable, repeatable, and production-safe deployment process**.

```
