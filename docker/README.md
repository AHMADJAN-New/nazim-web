# Docker Development Environment

This directory contains Docker configuration files for the Nazim Web development environment.

> **📁 Directory Structure**: See [`STRUCTURE.md`](./STRUCTURE.md) for a complete overview of the organized directory structure.

## Prerequisites

### Installing Docker on Ubuntu

If Docker is not installed, run the installation script:

```bash
./docker/scripts/setup/install-docker.sh
```

After installation, **log out and log back in** (or restart your computer) for the Docker group changes to take effect.

### Verify Installation

After logging back in, verify Docker is installed:

```bash
docker --version
docker compose version
```

### Installing Docker on Windows

1. Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. Install and restart your computer
3. Verify installation:
   ```powershell
   docker --version
   docker compose version
   ```

## Quick Start

1. **Copy environment file** (if not already done):
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Start all services**:
   ```bash
   docker compose up -d --build
   ```

3. **Install Composer dependencies**:
   ```bash
   docker compose exec backend composer install
   ```

4. **Generate Laravel key**:
   ```bash
   docker compose exec backend php artisan key:generate
   ```

5. **Run migrations**:
   ```bash
   docker compose exec backend php artisan migrate
   ```

## Services

- **Backend (Laravel)**: http://localhost:8080
- **Frontend (Vite)**: http://localhost:5173
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Useful Commands

### Start services
```bash
docker compose up -d
```

### Stop services
```bash
docker compose down
```

### View logs
```bash
docker compose logs -f
```

### Execute commands in containers
```bash
# Backend (Laravel)
docker compose exec backend php artisan migrate
docker compose exec backend php artisan tinker
docker compose exec backend composer install

# Frontend
docker compose exec frontend npm install
docker compose exec frontend npm run build
```

### Verify Imagick installation
```bash
docker compose exec backend php -m | grep imagick
docker compose exec backend gs --version
```

### Access database
```bash
docker compose exec db psql -U nazim -d nazim
```

## Troubleshooting

### Permission Issues (Linux)
If you get permission denied errors, make sure you're in the docker group:
```bash
groups  # Should include 'docker'
```

If not, add yourself and log out/in:
```bash
sudo usermod -aG docker $USER
```

### Port Already in Use
If ports 8080, 5173, 5432, or 6379 are already in use, stop the conflicting services or modify ports in `docker-compose.yml`.

### Database Connection Issues
Make sure the `.env` file in `backend/` has the correct Docker database settings:
- `DB_HOST=db`
- `DB_DATABASE=nazim`
- `DB_USERNAME=nazim`
- `DB_PASSWORD=secret`

### Clear Everything and Start Fresh
```bash
docker compose down -v  # Removes volumes (deletes database data!)
docker compose up -d --build
```

## Production Deployment

### Quick Start (Recommended)

For new server deployments, use the master setup script:

```bash
sudo bash docker/scripts/prod/setup.sh
```

This single command will:
- Check prerequisites
- Setup environment files
- Run preflight checks
- Configure firewall
- Build and start all services
- Run database migrations
- Optionally seed the database

See `docker/scripts/prod/QUICK_START.md` for detailed instructions.

### Manual Setup Steps

If you prefer step-by-step setup:

1. **Install Docker** (if not installed):
   ```bash
   bash docker/scripts/setup/install-docker.sh
   ```

2. **Setup environment files**:
   ```bash
   cp docker/env/compose.prod.env.example docker/env/compose.prod.env
   cp docker/env/backend.env.example backend/.env
   # Edit both files with your configuration
   ```

3. **Run preflight checks**:
   ```bash
   bash docker/scripts/prod/preflight.sh
   ```

4. **Configure firewall**:
   ```bash
   sudo bash docker/scripts/prod/setup-firewall.sh
   ```

5. **Bootstrap services**:
   ```bash
   bash docker/scripts/prod/bootstrap.sh
   ```

6. **Seed database** (optional):
   ```bash
   docker compose --env-file docker/env/compose.prod.env -f docker-compose.prod.yml exec php php artisan db:seed --force
   ```

### Firewall Configuration

For production deployments, you need to configure the firewall to allow HTTP (port 80) and HTTPS (port 443) traffic.

#### Automatic Firewall Setup

Run the firewall setup script (requires sudo):

```bash
sudo bash docker/scripts/prod/setup-firewall.sh
```

This script will:
- Install UFW (Uncomplicated Firewall) if not already installed
- Configure firewall rules to allow:
  - SSH (port 22) - to prevent locking yourself out
  - HTTP (port 80) - for web traffic
  - HTTPS (port 443) - for secure web traffic
- Enable UFW firewall

#### Manual Firewall Configuration

If you prefer to configure the firewall manually:

```bash
# Install UFW (if not installed)
sudo apt-get update
sudo apt-get install -y ufw

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (CRITICAL: Do this first!)
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

#### Firewall Ports

The production Docker setup exposes the following ports:
- **Port 80**: HTTP traffic (redirects to HTTPS)
- **Port 443**: HTTPS traffic (main web application)
- **Port 22**: SSH (should already be configured on your server)

**Note**: Internal Docker ports (PostgreSQL 5432, Redis 6379, PHP-FPM 9000) are not exposed externally and don't need firewall rules.

#### Verifying Firewall Configuration

Check if firewall is active and ports are allowed:

```bash
sudo ufw status verbose
```

You should see entries for ports 22, 80, and 443.

#### Troubleshooting Firewall

**Firewall blocking Docker containers:**
- Docker containers communicate via bridge networks internally
- Only the host ports (80, 443) need firewall rules
- The firewall setup script handles this correctly

**Can't access the application:**
1. Check if firewall is active: `sudo ufw status`
2. Verify ports are allowed: `sudo ufw status | grep -E "(80|443)"`
3. Check if Docker containers are running: `docker compose ps`
4. Verify nginx is listening: `sudo netstat -tlnp | grep -E "(80|443)"`

**Locked out of SSH:**
- If you accidentally blocked SSH, you may need console access to fix it
- Always allow SSH (port 22) before enabling the firewall
- The setup script automatically allows SSH first

