# Docker Setup Analysis & Plan for Nazim Web Application

## Current Server Setup Analysis

### Technologies Identified

1. **Backend (Laravel 12)**
   - PHP 8.3.6 (server) / PHP 8.3 (Dockerfile)
   - Laravel Framework 12.0
   - PostgreSQL 16.11 (server) / PostgreSQL 18 (docker-compose)
   - Redis (for cache/sessions)
   - ImageMagick + Ghostscript (image/PDF processing)
   - Browsershot (PDF generation - requires Node.js)
   - Queue system (currently sync, but supports Redis)

2. **Frontend (React + Vite)**
   - Node.js 20.20.0
   - React 18.3.1
   - Vite 5.4.1
   - TypeScript 5.5.3

3. **Web Server**
   - Nginx (serves Laravel public directory)

4. **Storage Requirements**
   - `backend/storage/app/private/` - Private file storage (organization-scoped)
   - `backend/storage/app/public/` - Public file storage
   - `backend/storage/logs/` - Application logs
   - `backend/storage/framework/` - Framework cache/sessions

### Current Docker Setup Issues

1. ❌ **Missing Queue Worker Service** - Laravel needs a queue worker for async jobs (reports, emails, etc.)
2. ❌ **Missing Node.js for Browsershot** - PDF generation requires Node.js/Puppeteer
3. ❌ **No Production Build** - Frontend only runs in dev mode
4. ❌ **No Health Checks** - Services can fail silently
5. ❌ **Storage Volumes Not Properly Managed** - Storage files not persisted
6. ❌ **Environment Variables** - No centralized .env management
7. ❌ **No Scheduler** - Laravel cron jobs not running
8. ❌ **Port Conflicts** - Hardcoded ports may conflict

## Proposed Docker Compose Architecture

### Services Required

1. **backend** (Laravel PHP-FPM)
   - PHP 8.3 with all required extensions
   - Composer for dependencies
   - ImageMagick, Ghostscript
   - Redis extension
   - PostgreSQL extension

2. **nginx** (Web Server)
   - Serves Laravel public directory
   - Proxies API requests
   - Serves static frontend files in production

3. **db** (PostgreSQL)
   - PostgreSQL 18 (or match server version)
   - Persistent volume for data
   - Health checks

4. **redis** (Cache/Sessions)
   - Redis Alpine
   - Persistent volume (optional)
   - Health checks

5. **frontend** (Node.js - Development)
   - Node.js 20
   - Vite dev server
   - Hot module replacement

6. **frontend-builder** (Node.js - Production Build)
   - Builds frontend static files
   - Outputs to nginx-served directory

7. **queue-worker** (Laravel Queue)
   - Runs `php artisan queue:work`
   - Processes async jobs
   - Auto-restarts on failure

8. **scheduler** (Laravel Cron)
   - Runs `php artisan schedule:run` every minute
   - Handles scheduled tasks

9. **browsershot-node** (Node.js for PDF Generation)
   - Node.js with Puppeteer
   - Used by Browsershot for PDF generation
   - Can be accessed via network

### Volume Strategy

1. **Database Data**: `nazim_pg_data` (persistent)
2. **Redis Data**: `nazim_redis_data` (optional, for persistence)
3. **Backend Storage**: `./backend/storage` (bind mount for persistence)
4. **Backend Vendor**: `nazim_backend_vendor` (optional, for faster rebuilds)
5. **Frontend Node Modules**: `nazim_frontend_node_modules` (for dev)
6. **Frontend Build**: `./frontend/dist` (production build output)

### Network Strategy

- **Single Network**: `nazim_network` (bridge)
- All services can communicate via service names
- Frontend can access backend via `http://nginx:80` or `http://backend:9000`

### Environment Variables Strategy

1. **Root `.env` file** - Docker Compose variables
2. **`backend/.env`** - Laravel environment (generated from template)
3. **`frontend/.env`** - Frontend environment (Vite variables)
4. **Environment-specific files**:
   - `.env.development`
   - `.env.production`
   - `.env.example` (template)

## Implementation Plan

### Phase 1: Enhanced Docker Compose File

**File**: `docker-compose.yml`

**Features**:
- All 9 services defined
- Health checks for all services
- Proper volume management
- Environment variable support
- Development and production profiles
- Restart policies

### Phase 2: Dockerfile Improvements

**Files**:
- `docker/php/Dockerfile` (enhanced)
- `docker/node/Dockerfile` (new - for Browsershot)
- `docker/nginx/Dockerfile` (optional - for custom nginx config)

**Improvements**:
- Multi-stage builds for optimization
- Proper layer caching
- Security best practices
- Node.js installation in PHP container (or separate service)

### Phase 3: Environment Configuration

**Files**:
- `.env.docker` (root level)
- `backend/.env.docker.example`
- `frontend/.env.docker.example`
- `docker-compose.override.yml.example`

**Features**:
- Default development values
- Production-ready defaults
- Easy customization

### Phase 4: Helper Scripts

**Files**:
- `docker/scripts/init.sh` - Initial setup
- `docker/scripts/build.sh` - Build all services
- `docker/scripts/start.sh` - Start services
- `docker/scripts/stop.sh` - Stop services
- `docker/scripts/clean.sh` - Clean volumes/images
- `docker/scripts/migrate.sh` - Run migrations
- `docker/scripts/seed.sh` - Seed database
- `docker/scripts/logs.sh` - View logs

### Phase 5: Production Optimizations

**Features**:
- Production docker-compose file
- Frontend build in Docker
- Optimized PHP-FPM settings
- Nginx production config
- SSL/TLS support (optional)
- Backup scripts

### Phase 6: Documentation

**Files**:
- `DOCKER_README.md` - Complete Docker guide
- `DOCKER_TROUBLESHOOTING.md` - Common issues
- `DOCKER_PRODUCTION.md` - Production deployment guide

## Key Decisions

### 1. Node.js for Browsershot
**Option A**: Install Node.js in PHP container
- Pros: Simpler, fewer services
- Cons: Larger image, mixing concerns

**Option B**: Separate Node.js service
- Pros: Separation of concerns, can scale independently
- Cons: More services, network communication needed

**Recommendation**: Option A (simpler for now, can refactor later)

### 2. Frontend Build Strategy
**Option A**: Build in Docker during image build
- Pros: Consistent builds, no local Node.js needed
- Cons: Slower rebuilds, larger images

**Option B**: Build locally, copy to container
- Pros: Faster development, smaller images
- Cons: Requires local Node.js

**Option C**: Separate build service
- Pros: Flexible, can build on-demand
- Cons: More complex

**Recommendation**: Option C (separate service for flexibility)

### 3. Storage Persistence
**Strategy**: Bind mounts for `backend/storage` (development) or named volumes (production)
- Development: Bind mount for easy access
- Production: Named volume for isolation

### 4. Queue Connection
**Strategy**: Use Redis for queues in Docker (better than sync)
- Enables async processing
- Better for production
- Requires Redis service

## Port Mapping Strategy

### Development Ports
- **Nginx**: `8080:80` (main app)
- **Frontend Dev**: `5173:5173` (Vite HMR)
- **PostgreSQL**: `5432:5432` (database access)
- **Redis**: `6379:6379` (cache access)

### Production Ports (Optional)
- **Nginx**: `80:80`, `443:443` (with SSL)
- **PostgreSQL**: Not exposed (internal only)
- **Redis**: Not exposed (internal only)

## Security Considerations

1. **Database Credentials**: Use strong passwords, never commit
2. **Environment Variables**: Use secrets management
3. **Network Isolation**: Services only communicate internally
4. **File Permissions**: Proper ownership (www-data)
5. **SSL/TLS**: Add in production
6. **Firewall**: Only expose necessary ports

## Migration Path

1. **Keep existing setup working** (current docker-compose.yml)
2. **Create new enhanced setup** (docker-compose.enhanced.yml)
3. **Test in parallel**
4. **Switch when ready**
5. **Remove old setup**

## Next Steps

1. ✅ Analysis complete
2. ⏳ Create enhanced docker-compose.yml
3. ⏳ Enhance Dockerfiles
4. ⏳ Create environment templates
5. ⏳ Create helper scripts
6. ⏳ Write documentation
7. ⏳ Test locally
8. ⏳ Deploy to server

## Estimated File Structure

```
nazim-web/
├── docker-compose.yml (enhanced)
├── docker-compose.prod.yml (production)
├── docker-compose.override.yml.example
├── .env.docker (root level)
├── .env.docker.example
├── docker/
│   ├── php/
│   │   └── Dockerfile (enhanced)
│   ├── node/
│   │   └── Dockerfile (new)
│   ├── nginx/
│   │   ├── default.conf
│   │   └── default.prod.conf
│   └── scripts/
│       ├── init.sh
│       ├── build.sh
│       ├── start.sh
│       ├── stop.sh
│       ├── clean.sh
│       ├── migrate.sh
│       ├── seed.sh
│       └── logs.sh
├── DOCKER_README.md
├── DOCKER_TROUBLESHOOTING.md
└── DOCKER_PRODUCTION.md
```

## Questions to Resolve

1. **Browsershot Node.js**: Separate service or in PHP container?
2. **Production Build**: When/how to build frontend?
3. **Storage Backup**: How to backup storage volumes?
4. **SSL Certificates**: Use Let's Encrypt or self-signed?
5. **Monitoring**: Add health check endpoints?
6. **Logging**: Centralized logging solution?

---

**Status**: Analysis Complete ✅
**Next**: Awaiting approval to proceed with implementation
