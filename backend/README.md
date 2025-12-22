# Nazim Backend - Laravel API

This is the backend API for the Nazim Islamic School Management System, built with Laravel 12.

## Quick Start

```bash
# Install dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Configure database in .env file
# Then run migrations
php artisan migrate

# Seed database (optional)
php artisan db:seed

# Install PDF letterhead dependencies (Imagick/Ghostscript)
# See INSTALL_DEPENDENCIES.md for detailed instructions
# On Ubuntu/Debian: bash scripts/install-dependencies.sh

# Start development server
php artisan serve
```

## Key Features

- **Multi-tenant Architecture**: Organization-scoped data isolation
- **Spatie Permissions**: Organization-scoped role and permission management
- **Laravel Sanctum**: API authentication with Bearer tokens
- **PostgreSQL**: UUID primary keys for all tables
- **RESTful API**: Clean, consistent API endpoints

## Project Structure

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/     # API Controllers
│   │   ├── Middleware/      # Custom Middleware
│   │   └── Requests/        # Form Request Validation
│   ├── Models/              # Eloquent Models
│   └── Services/            # Business Logic Services
├── config/                  # Configuration Files
├── database/
│   ├── migrations/          # Database Migrations
│   └── seeders/            # Database Seeders
├── routes/
│   └── api.php             # API Routes
└── storage/                # File Storage
```

## Important Notes

- **All tables use UUID primary keys** - Never use auto-incrementing IDs
- **All tenant tables require `organization_id`** - Enforced via migrations and middleware
- **Permissions are organization-scoped** - Use Spatie's team feature
- **Soft deletes are used** - Data is never permanently deleted

## PDF Letterhead Dependencies

For PDF letterhead rendering to work correctly, you need to install either:
- **Imagick PHP extension** (recommended) - Best quality and performance
- **Ghostscript** (alternative) - Works if Imagick is not available

See [INSTALL_DEPENDENCIES.md](./INSTALL_DEPENDENCIES.md) for detailed installation instructions.

## API Documentation

See the main [README.md](../README.md) for complete API documentation and usage examples.

## Development

See the main [README.md](../README.md) for development guidelines and the [.claude.md](../.claude.md) file for detailed coding standards.
