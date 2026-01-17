# Production Environment Files

This document describes the production environment files used in the Nazim application.

## File Locations

### Backend
- **Active**: `backend/.env` - Current production environment (DO NOT commit)
- **Production Copy**: `backend/.env.production` - Backup/copy of production settings (DO NOT commit)
- **Example**: `docker/env/backend.env.example` - Template file (safe to commit)

### Frontend
- **Production**: `frontend/.env.production` - Production build-time variables (DO NOT commit)
- **Example**: See `docker/env/compose.prod.env.example` for VITE_* variables

### Docker Compose
- **Active**: `docker/env/compose.prod.env` - Docker Compose production variables (DO NOT commit)
- **Example**: `docker/env/compose.prod.env.example` - Template file (safe to commit)

## Environment Variables

### Backend (.env)

**Required:**
- `APP_URL` - Full application URL (e.g., `https://nazim.cloud`)
- `DB_PASSWORD` - PostgreSQL password (must match `POSTGRES_PASSWORD` in compose.prod.env)
- `APP_KEY` - Laravel encryption key (generated automatically if empty)

**Database:**
- `DB_CONNECTION=pgsql`
- `DB_HOST=db` (Docker service name)
- `DB_PORT=5432`
- `DB_DATABASE=nazim`
- `DB_USERNAME=nazim`

**Cache/Queue:**
- `CACHE_DRIVER=redis`
- `QUEUE_CONNECTION=redis`
- `SESSION_DRIVER=redis`
- `REDIS_HOST=redis` (Docker service name)
- `REDIS_PORT=6379`

**Optional (Email):**
- `MAIL_MAILER=smtp`
- `MAIL_HOST=`
- `MAIL_PORT=587`
- `MAIL_USERNAME=`
- `MAIL_PASSWORD=`
- `MAIL_ENCRYPTION=tls`
- `MAIL_FROM_ADDRESS=`
- `MAIL_FROM_NAME=`

### Frontend (.env.production)

**Build-time variables (used during `npm run build`):**

- `VITE_API_BASE_URL=/api` - API base URL (relative path for same-origin)
- `VITE_API_URL=/api` - API URL (same as VITE_API_BASE_URL for same-origin)

**Note:** These are build-time variables. They are baked into the JavaScript bundle during the build process. To change them, you must rebuild the frontend.

### Docker Compose (compose.prod.env)

**Required:**
- `DOMAIN` - Your domain name (e.g., `nazim.cloud`)
- `APP_URL` - Full application URL (e.g., `https://nazim.cloud`)
- `LETSENCRYPT_EMAIL` - Email for SSL certificate notifications
- `POSTGRES_PASSWORD` - Database password (must match `DB_PASSWORD` in backend/.env)

**Ports:**
- `HTTP_PORT=80` - HTTP port
- `HTTPS_PORT=443` - HTTPS port

**Frontend Build:**
- `VITE_API_BASE_URL=/api` - Passed to frontend build
- `VITE_API_URL=/api` - Passed to frontend build

## Creating Production Files

### Initial Setup

1. **Backend:**
   ```bash
   cp docker/env/backend.env.example backend/.env
   cp backend/.env backend/.env.production
   # Edit backend/.env with your production values
   ```

2. **Frontend:**
   ```bash
   # Create or update frontend/.env.production
   cat > frontend/.env.production << 'EOF'
   VITE_API_BASE_URL=/api
   VITE_API_URL=/api
   EOF
   ```

3. **Docker Compose:**
   ```bash
   cp docker/env/compose.prod.env.example docker/env/compose.prod.env
   # Edit docker/env/compose.prod.env with your production values
   ```

### Updating Production Files

**To update production copies from current files:**

```bash
# Backend
cp backend/.env backend/.env.production

# Frontend (if you have a .env file)
cp frontend/.env frontend/.env.production
```

## Security Notes

⚠️ **IMPORTANT:**
- **NEVER commit** `.env`, `.env.production`, or `compose.prod.env` files to git
- These files contain sensitive credentials (passwords, API keys, etc.)
- The `.env.production` files are backups for your reference
- Always use strong, unique passwords in production
- Rotate credentials regularly

## File Relationships

```
docker/env/compose.prod.env
  ├── POSTGRES_PASSWORD → must match → backend/.env (DB_PASSWORD)
  ├── APP_URL → should match → backend/.env (APP_URL)
  └── VITE_API_* → passed to → frontend build (frontend/.env.production)

backend/.env
  ├── DB_PASSWORD → must match → docker/env/compose.prod.env (POSTGRES_PASSWORD)
  └── APP_URL → should match → docker/env/compose.prod.env (APP_URL)
```

## Troubleshooting

### Database Connection Errors
- Verify `DB_PASSWORD` in `backend/.env` matches `POSTGRES_PASSWORD` in `docker/env/compose.prod.env`
- Check `DB_HOST=db` (Docker service name, not `localhost`)

### API Connection Errors (Frontend)
- Verify `VITE_API_BASE_URL` and `VITE_API_URL` are set correctly
- Rebuild frontend if you changed these values: `docker compose build nginx`

### Environment Variables Not Working
- Backend: Restart PHP container: `docker compose restart php`
- Frontend: Rebuild image: `docker compose build nginx`
- Check file permissions: `ls -la backend/.env frontend/.env.production`

