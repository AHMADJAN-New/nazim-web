# AGENTS.md

## Cursor Cloud specific instructions

### Services Overview

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| **Backend (Laravel)** | `cd backend && php artisan serve --host=0.0.0.0 --port=8000` | 8000 | API server |
| **Frontend (Vite)** | `cd frontend && npm run dev` | 5173 | Uses HTTPS (self-signed certs in `frontend/certs/`) |
| **PostgreSQL** | `sudo pg_ctlcluster 16 main start` | 5432 | User: `nazim`, DB: `nazim`, Test DB: `nazim_testing` |
| **Redis** | `sudo redis-server --daemonize yes` | 6379 | Used for cache/sessions in production; dev uses file/sync drivers |

### Starting the dev environment

1. Start PostgreSQL: `sudo pg_ctlcluster 16 main start`
2. Start Redis: `sudo redis-server --daemonize yes`
3. Start backend: `cd /workspace/backend && php artisan serve --host=0.0.0.0 --port=8000 &`
4. Start frontend: `cd /workspace/frontend && npm run dev &`

### Gotchas and caveats

- The frontend Vite dev server uses **HTTPS** with self-signed certificates (from `frontend/certs/`). When testing with `curl`, use `-k` flag. In Chrome, you must accept the certificate warning.
- The Vite dev server proxies `/api` and `/storage` requests to `http://localhost:8000` (Laravel backend).
- The backend `.env` uses `DB_HOST=127.0.0.1` (not `db` from Docker), `SESSION_DRIVER=file`, `QUEUE_CONNECTION=sync`, and `CACHE_DRIVER=file` for local development. This avoids requiring Redis for basic operation.
- The `encrypted_password` column on the `users` table stores hashed passwords (not `password` as typical Laravel). The `AuthController` checks credentials against this column.
- DB seeder creates a platform admin user: `platform-admin@nazim.app` / `admin123`. Access at `/platform/login` or the main app login at `/`.
- Backend tests require a `nazim_testing` PostgreSQL database (see `phpunit.xml`).
- Frontend lint (`npm run lint`) has pre-existing warnings/errors (not blocking).
- Frontend tests (`npx vitest run`) have some pre-existing test failures related to missing React Router context in test wrappers.
- Backend tests (`php artisan test`) have some pre-existing failures (135 pass, 30 fail out of 166 total).

### Lint, test, and build commands

See `README.md` and `package.json` / `composer.json` for standard commands:
- **Frontend lint**: `cd frontend && npm run lint`
- **Frontend test**: `cd frontend && npx vitest run`
- **Frontend build**: `cd frontend && npm run build`
- **Backend test**: `cd backend && php artisan test --compact`
- **Backend lint (Pint)**: `cd backend && vendor/bin/pint --dirty`
