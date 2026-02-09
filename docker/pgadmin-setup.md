# pgAdmin Setup Guide

## Overview

pgAdmin has been added to your Docker Compose setup to provide a web-based interface for managing your PostgreSQL database.

## Accessing pgAdmin

1. **Start the containers** (if not already running):
   ```bash
   docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d
   ```

2. **Access pgAdmin**:
   - Open your browser and navigate to: `http://localhost:5050`
   - Or if using a custom port: `http://localhost:${PGADMIN_PORT}`
   - Default login credentials:
     - **Email**: `admin@nazim.cloud` (or value from `PGADMIN_EMAIL` env var)
     - **Password**: `admin` (or value from `PGADMIN_PASSWORD` env var)

## Connecting to PostgreSQL Database

After logging into pgAdmin:

1. **Right-click on "Servers"** in the left sidebar
2. **Select "Register" → "Server"**
3. **Fill in the connection details**:
   - **General Tab**:
     - **Name**: `Nazim Production DB` (or any name you prefer)
   - **Connection Tab**:
     - **Host name/address**: `db` (Docker service name)
     - **Port**: `5432`
     - **Maintenance database**: `nazim` (or value from `POSTGRES_DB`)
     - **Username**: `nazim` (or value from `POSTGRES_USER`)
     - **Password**: `change_me` (or value from `POSTGRES_PASSWORD`)
     - **Save password**: ✅ (optional, for convenience)
   - **Click "Save"**

## What You Can Do with pgAdmin

- **Browse database structure**: View tables, schemas, functions, views, etc.
- **Run SQL queries**: Execute custom SQL queries and view results
- **Edit data**: Modify table data directly through the UI
- **Manage schemas**: Create, modify, and delete database objects
- **View query history**: See previously executed queries
- **Export/Import data**: Export tables to CSV, SQL, or other formats
- **Monitor database**: View database statistics and performance metrics
- **Backup/Restore**: Create and restore database backups

## Security Notes

⚠️ **Important**: pgAdmin is exposed on port 5050 by default. For production environments:

1. **Change default credentials** in `docker/env/compose.prod.env`:
   ```env
   PGADMIN_EMAIL=your-secure-email@example.com
   PGADMIN_PASSWORD=your-strong-password
   ```

2. **Consider restricting access**:
   - Use a firewall to limit access to port 5050
   - Or use a reverse proxy with authentication
   - Or only expose pgAdmin on internal networks

3. **Use environment variables** for sensitive values (never commit passwords to git)

## Environment Variables

The following environment variables can be set in `docker/env/compose.prod.env`:

- `PGADMIN_EMAIL`: Email for pgAdmin login (default: `admin@nazim.cloud`)
- `PGADMIN_PASSWORD`: Password for pgAdmin login (default: `admin`)
- `PGADMIN_PORT`: Port to expose pgAdmin on (default: `5050`)

## Troubleshooting

### pgAdmin won't start
- Check if port 5050 is already in use: `netstat -an | grep 5050`
- Check container logs: `docker logs nazim_prod_pgadmin`
- Verify environment variables are set correctly

### Can't connect to database
- Ensure the `db` container is running: `docker ps | grep nazim_prod_db`
- Verify database credentials match those in `docker/env/compose.prod.env`
- Check that both containers are on the same Docker network (`nazim_network`)

### Forgot password
- Reset by recreating the pgAdmin container (data is persisted in volume):
  ```bash
  docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml stop pgadmin
  docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml rm -f pgadmin
  docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml up -d pgadmin
  ```

## Alternative: Adminer (Lightweight Option)

If you prefer a lighter-weight alternative, you can use **Adminer** instead:

```yaml
adminer:
  image: adminer:latest
  container_name: nazim_prod_adminer
  restart: unless-stopped
  ports:
    - "${ADMINER_PORT:-8080}:8080"
  depends_on:
    db:
      condition: service_healthy
  networks:
    - nazim_network
```

Adminer is simpler but less feature-rich than pgAdmin. Access it at `http://localhost:8080` and select "PostgreSQL" as the system.
