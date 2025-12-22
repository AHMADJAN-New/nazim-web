# Docker Development Environment

This directory contains Docker configuration files for the Nazim Web development environment.

## Prerequisites

### Installing Docker on Ubuntu

If Docker is not installed, run the installation script:

```bash
./docker/install-docker.sh
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

