# Nazim - Islamic School Management System

<div align="center">

![Nazim Logo](https://via.placeholder.com/150x150.png?text=Nazim)

**A comprehensive multi-tenant SaaS platform for managing Islamic schools and madrasas**

[![Laravel](https://img.shields.io/badge/Laravel-12.x-red.svg)](https://laravel.com)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Features](#features) | [Installation](#installation) | [Usage](#usage) | [Documentation](#documentation) | [Support](#support)

</div>

---

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Key Concepts](#key-concepts)
- [Usage Guide](#usage-guide)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## 📖 About

**Nazim** is a modern, full-featured school management system specifically designed for Islamic schools, madrasas, and religious educational institutions. Built with scalability and multi-tenancy in mind, Nazim helps educational institutions manage students, staff, academic programs, timetables, and comprehensive reporting—all in one unified platform.

### Why Nazim?

- **🏢 Multi-Tenant Architecture**: Supports multiple organizations with complete data isolation
- **🔒 Security First**: Organization-scoped permissions, role-based access control
- **🌍 Internationalization**: Built-in support for Arabic, English, Pashto, and Farsi
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **⚡ High Performance**: Optimized queries, caching, and lazy loading
- **🎨 Modern UI**: Beautiful, intuitive interface built with shadcn/ui

---

## ✨ Features

### 👥 Student Management

- Complete student profiles with photos and documents
- Admission management with multiple statuses
- Educational history tracking
- Discipline records management
- Guardian and emergency contact information
- Orphan status and financial aid tracking
- Advanced search and filtering
- Bulk import/export capabilities

### 👨‍🏫 Staff Management

- Comprehensive staff profiles
- Multiple staff types (teachers, admin, accountant, librarian)
- Religious and modern education background tracking
- Document management
- Assignment to schools and subjects
- Timetable preferences

### 📚 Academic Management

- Academic year management with current year tracking
- Class management with grade levels
- Subject management and curriculum planning
- Class sections with capacity management
- Teacher-subject assignments
- Room and building management
- Residency type management (day scholar, boarder)

### 📅 Timetable & Scheduling

- Flexible timetable generation
- Schedule slot management
- Teacher availability preferences
- Conflict detection and resolution
- Multiple timetable types

### 🏛️ Organization Management

- Multi-organization support
- School branding and customization
- Organization-specific settings
- User assignment to organizations
- Super admin with cross-organization access

### 📊 Reports & Analytics

- Student statistics and demographics
- Staff distribution reports
- Admission trends
- Custom report templates
- Print-ready formats with Arabic support

### 🔐 Security & Permissions

- Role-based access control (RBAC) with Spatie Laravel Permission
- Organization-scoped permissions
- JWT token-based authentication (Laravel Sanctum)
- Audit logging
- Data encryption

### 🎯 User Experience

- Dark mode support
- RTL (Right-to-Left) language support
- Keyboard shortcuts
- Context menus
- Real-time notifications
- Responsive data tables with sorting and filtering

---

## 🛠️ Tech Stack

### Backend

| Technology             | Version | Purpose                                    |
| ---------------------- | ------- | ------------------------------------------ |
| **Laravel**            | 12.x    | PHP framework for robust API development   |
| **PostgreSQL**         | 15+     | Primary database with UUID support         |
| **Sanctum**            | 4.x     | API authentication with Bearer tokens      |
| **Spatie Permissions** | 6.x     | Organization-scoped role/permission system |
| **PHP**                | 8.2+    | Server-side scripting language             |

### Frontend

| Technology         | Version | Purpose                                        |
| ------------------ | ------- | ---------------------------------------------- |
| **React**          | 18.x    | UI library for building interactive interfaces |
| **TypeScript**     | 5.x     | Type-safe JavaScript                           |
| **Vite**           | 5.x     | Fast build tool and dev server                 |
| **TanStack Query** | 5.x     | Data fetching and state management             |
| **React Router**   | 6.x     | Client-side routing                            |
| **shadcn/ui**      | Latest  | Beautiful UI components (Radix + Tailwind)     |
| **Tailwind CSS**   | 3.x     | Utility-first CSS framework                    |
| **Zod**            | 3.x     | Schema validation                              |

### DevOps & Tools

- **Git** - Version control
- **Composer** - PHP dependency manager
- **npm** - JavaScript package manager
- **Docker** (optional) - Containerization

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required

- **PHP** >= 8.2 with extensions:
  - BCMath
  - Ctype
  - cURL
  - DOM
  - Fileinfo
  - JSON
  - Mbstring
  - OpenSSL
  - PDO
  - Tokenizer
  - XML
  - pgsql

- **Composer** >= 2.6
- **Node.js** >= 18.x
- **npm** >= 9.x or **pnpm** >= 8.x
- **PostgreSQL** >= 15

### Optional but Recommended

- **Git** >= 2.x
- **Docker** & **Docker Compose** (for containerized setup)
- **Redis** (for caching and queues)

---

## 🚀 Installation

### Method 1: Manual Installation (Recommended for Development)

#### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/nazim-web.git
cd nazim-web
```

#### 2️⃣ Backend Setup (Laravel)

```bash
# Navigate to backend directory
cd backend

# Install PHP dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Configure your .env file with database credentials
# Edit .env and set:
# DB_CONNECTION=pgsql
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_DATABASE=nazim
# DB_USERNAME=postgres
# DB_PASSWORD=your_password

# Create database
# In PostgreSQL, run: CREATE DATABASE nazim;

# Run migrations
php artisan migrate

# Seed database with initial data (optional)
php artisan db:seed

# Create storage symlink
php artisan storage:link

# Start Laravel development server
php artisan serve
# Backend will run on http://localhost:8000
```

#### 3️⃣ Frontend Setup (React + Vite)

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install JavaScript dependencies
npm install
# or if using pnpm:
# pnpm install

# Copy environment file (if exists)
cp .env.example .env 2>/dev/null || true

# Start Vite development server
npm run dev
# Frontend will run on http://localhost:5173
```

#### 4️⃣ Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api

---

### Method 2: Docker Installation (Coming Soon)

```bash
# Clone repository
git clone https://github.com/yourusername/nazim-web.git
cd nazim-web

# Build and start containers
docker-compose up -d

# Run migrations
docker-compose exec backend php artisan migrate --seed

# Access application at http://localhost:3000
```

---

## ⚙️ Configuration

### Backend Configuration (Laravel)

Edit `backend/.env`:

```env
# Application
APP_NAME=Nazim
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

# Database
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=nazim
DB_USERNAME=postgres
DB_PASSWORD=your_secure_password

# CORS
FRONTEND_URL=http://localhost:5173

# Cache & Queue (Optional)
CACHE_DRIVER=file
QUEUE_CONNECTION=sync
# For production, use:
# CACHE_DRIVER=redis
# QUEUE_CONNECTION=redis

# Mail Configuration (for notifications)
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="hello@nazim.local"
MAIL_FROM_NAME="${APP_NAME}"

# File Storage
FILESYSTEM_DISK=local
# For production with S3:
# FILESYSTEM_DISK=s3
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_DEFAULT_REGION=
# AWS_BUCKET=
```

### Frontend Configuration (React/Vite)

Create `frontend/.env` (optional, uses defaults):

```env
# API Configuration
VITE_API_URL=/api  # Uses Vite proxy in development

# Feature Flags
VITE_ENABLE_PERF_MONITORING=false

# Environment
VITE_APP_ENV=development
```

### CORS Configuration

Ensure `backend/config/cors.php` includes your frontend URL:

```php
'allowed_origins' => [
    env('FRONTEND_URL', 'http://localhost:5173'),
    'http://localhost:5173',
    'http://127.0.0.1:5173',
],
```

---

## 🏃 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
php artisan serve
# Runs on http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

### Production Build

**Backend:**
```bash
cd backend
composer install --optimize-autoloader --no-dev
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force
```

**Frontend:**
```bash
cd frontend
npm run build
# Output in frontend/dist/
# Deploy dist/ folder to your web server
```

---

## 📁 Project Structure

```
nazim-web/
├── backend/                    # Laravel Backend
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/   # API Controllers
│   │   │   ├── Middleware/    # Custom Middleware
│   │   │   └── Requests/      # Form Requests
│   │   ├── Models/            # Eloquent Models
│   │   └── Services/          # Business Logic
│   ├── config/                # Configuration Files
│   ├── database/
│   │   ├── migrations/        # Database Migrations
│   │   └── seeders/           # Database Seeders
│   ├── routes/
│   │   ├── api.php           # API Routes
│   │   └── web.php           # Web Routes
│   └── storage/              # File Storage
│
├── frontend/                  # React Frontend
│   ├── public/               # Static Assets
│   ├── src/
│   │   ├── components/       # React Components
│   │   │   ├── layout/      # Layout Components
│   │   │   ├── students/    # Student Components
│   │   │   ├── staff/       # Staff Components
│   │   │   ├── settings/    # Settings Components
│   │   │   └── ui/          # UI Components (shadcn)
│   │   ├── hooks/           # Custom React Hooks
│   │   ├── lib/             # Utility Functions
│   │   │   ├── api/        # API Client
│   │   │   └── utils.ts    # Helper Functions
│   │   ├── mappers/         # API ↔ Domain Mappers
│   │   ├── pages/           # Page Components
│   │   ├── types/           # TypeScript Types
│   │   │   ├── api/        # API Types (snake_case)
│   │   │   └── domain/     # Domain Types (camelCase)
│   │   ├── App.tsx         # Main App Component
│   │   └── main.tsx        # Entry Point
│   ├── vite.config.ts       # Vite Configuration
│   └── package.json         # Dependencies
│
├── .claude.md               # AI Development Guide
└── README.md               # This File
```

---

## 🔑 Key Concepts

### Multi-Tenancy & Organization Scoping

Nazim uses **organization-based multi-tenancy** where:

- **Organizations** are the primary tenant boundary
- All data (students, staff, classes) is scoped to an organization
- Users belong to one organization
- Users can change **school** but NOT **organization**
- Super admins with `organization_id = null` can access all organizations

**Example:**
```typescript
// ✅ User can do this:
updateStudent({
  id: 'student-123',
  schoolId: 'new-school-456',  // Allowed
});

// ❌ User cannot do this:
updateStudent({
  id: 'student-123',
  organizationId: 'different-org', // Forbidden!
});
```

### Authentication Flow

1. User logs in with email/password
2. Backend returns JWT bearer token
3. Token stored in localStorage
4. Token sent with every API request in `Authorization: Bearer {token}` header
5. Backend validates token and checks organization access

### Role-Based Permissions

Nazim uses Spatie Laravel Permission with organization scoping:

- **super_admin**: Access to all organizations
- **admin**: Organization administrator
- **teacher**: Teaching staff with limited access
- **accountant**: Financial data access
- **librarian**: Library management

Each permission is scoped to an organization for data isolation.

---

## 📖 Usage Guide

### First Time Setup

#### 1. Create Your Organization

After installation, you need to create your first organization:

```bash
# Using Laravel Tinker
cd backend
php artisan tinker

# Create organization
$org = \App\Models\Organization::create([
    'name' => 'مدرسة الناظم', // Your school name
    'slug' => 'nazim-school',
    'settings' => [],
]);

# Create super admin user
$user = \App\Models\User::create([
    'id' => \Illuminate\Support\Str::uuid(),
    'email' => 'admin@nazim.local',
    'password' => bcrypt('password'),
]);

# Create profile
$profile = \App\Models\Profile::create([
    'id' => $user->id,
    'organization_id' => null, // null for super admin
    'role' => 'super_admin',
    'full_name' => 'Super Administrator',
    'email' => 'admin@nazim.local',
    'is_active' => true,
]);

exit
```

#### 2. Login to the Application

1. Navigate to http://localhost:5173
2. Click **Login**
3. Enter credentials:
   - Email: `admin@nazim.local`
   - Password: `password`
4. You'll be redirected to the dashboard

#### 3. Configure Your School

1. Go to **Settings** → **Schools Management**
2. Click **Add School**
3. Fill in school details:
   - School name (Arabic, English, Pashto)
   - Contact information
   - Logo and branding
   - Calendar preferences

#### 4. Set Up Academic Year

1. Go to **Settings** → **Academic Years**
2. Click **Add Academic Year**
3. Enter year details:
   - Name (e.g., "2024-2025")
   - Start date
   - End date
   - Mark as current year

#### 5. Create Classes

1. Go to **Settings** → **Classes Management**
2. Click **Add Class**
3. Create classes (e.g., Grade 1, Grade 2, etc.)
4. Assign classes to the current academic year

#### 6. Add Staff

1. Go to **Staff** → **Staff List**
2. Click **Add Staff Member**
3. Fill in staff details:
   - Personal information
   - Staff type (teacher, admin, etc.)
   - Educational background
   - Upload photo and documents

#### 7. Enroll Students

1. Go to **Students**
2. Click **Add Student**
3. Fill in student information:
   - Personal details
   - Guardian information
   - Admission number
   - Upload photo
4. After creating, go to **Admissions** to enroll in classes

### Common Tasks

#### Adding a New Student

1. Navigate to Students page
2. Click "Add Student" button
3. Fill in required fields:
   - Full name (Arabic)
   - Father's name
   - Admission number (unique)
   - Gender
   - Birth date
4. Fill in optional fields:
   - Guardian information
   - Address details
   - Previous school
5. Upload student photo
6. Click "Save"
7. Navigate to Admissions to enroll in class

#### Creating a Timetable

1. Ensure you have:
   - Academic year set up
   - Classes created and assigned to year
   - Subjects created
   - Teachers added
   - Schedule slots defined
2. Go to Timetable Generation
3. Select academic year and class
4. Assign subjects to teachers
5. Assign schedule slots
6. Click "Generate Timetable"
7. Review and save

#### Generating Reports

1. Go to Reports section
2. Select report type:
   - Student list
   - Staff list
   - Attendance report
   - Academic performance
3. Choose filters:
   - Academic year
   - Class/section
   - Date range
4. Select format (PDF, Excel)
5. Click "Generate Report"
6. Download or print

---

## 💻 Development

### Code Style

**Backend (PHP/Laravel):**
- Follow PSR-12 coding standards
- Use type hints for all parameters and return types
- Use dependency injection
- Write descriptive method and variable names

**Frontend (TypeScript/React):**
- Use TypeScript for all components
- Follow React hooks best practices
- Use functional components with hooks
- Implement proper error boundaries

### API Conventions

**Endpoints:**
```
GET    /api/students              # List all students
GET    /api/students/{id}         # Get single student
POST   /api/students              # Create student
PUT    /api/students/{id}         # Update student
DELETE /api/students/{id}         # Delete student
GET    /api/students/stats        # Get statistics
```

**Request/Response Format:**

Request (snake_case):
```json
{
  "full_name": "محمد أحمد",
  "father_name": "أحمد علي",
  "admission_no": "2024001",
  "organization_id": "uuid-here"
}
```

Response (snake_case):
```json
{
  "id": "uuid",
  "full_name": "محمد أحمد",
  "father_name": "أحمد علي",
  "admission_no": "2024001",
  "organization_id": "uuid-here",
  "created_at": "2024-01-01T00:00:00.000000Z",
  "updated_at": "2024-01-01T00:00:00.000000Z"
}
```

### Adding a New Feature

See [`.claude.md`](.claude.md) for detailed instructions on:
- Creating new modules
- Backend controller patterns
- Frontend hook patterns
- Type mapping between API and domain models
- Testing guidelines

### Running Tests

**Backend Tests:**
```bash
cd backend

# Run all tests
php artisan test

# Run specific test suite
php artisan test --testsuite=Feature

# Run with coverage
php artisan test --coverage
```

**Frontend Tests:**
```bash
cd frontend

# Run tests
npm run test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Database Migrations

**Creating a migration:**
```bash
cd backend
php artisan make:migration create_students_table
```

**Migration template:**
```php
Schema::create('students', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
    $table->uuid('organization_id')->index();
    $table->string('full_name');
    $table->timestamps();
    $table->softDeletes();

    $table->foreign('organization_id')
          ->references('id')
          ->on('organizations')
          ->onDelete('cascade');
});
```

---

## 📡 API Documentation

### Authentication

**Login:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}

Response:
{
  "user": { "id": "uuid", "email": "user@example.com" },
  "token": "jwt-token-here"
}
```

**Get User:**
```http
GET /api/auth/user
Authorization: Bearer {token}

Response:
{
  "user": { "id": "uuid", "email": "user@example.com" },
  "profile": { "id": "uuid", "organization_id": "uuid", "role": "admin", ... }
}
```

**Logout:**
```http
POST /api/auth/logout
Authorization: Bearer {token}
```

### Students

**List Students:**
```http
GET /api/students?organization_id={uuid}&search=محمد
Authorization: Bearer {token}
```

**Create Student:**
```http
POST /api/students
Authorization: Bearer {token}
Content-Type: application/json

{
  "full_name": "محمد أحمد",
  "father_name": "أحمد علي",
  "admission_no": "2024001",
  "gender": "male",
  "school_id": "uuid"
}
```

**Update Student:**
```http
PUT /api/students/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "school_id": "new-school-uuid"
}
```

For complete API documentation, visit `/api/documentation` (coming soon with Swagger/OpenAPI).

---

## 🔧 Troubleshooting

### Backend Issues

#### Issue: "Connection refused" when accessing API

**Solution:**
```bash
# Check if Laravel is running
cd backend
php artisan serve

# Check if database is accessible
php artisan db:show
```

#### Issue: "SQLSTATE[08006] Connection to database failed"

**Solution:**
```bash
# Verify PostgreSQL is running
# Windows:
services.msc  # Check PostgreSQL service

# Linux/Mac:
sudo systemctl status postgresql

# Check .env database credentials
cat backend/.env | grep DB_
```

#### Issue: "Class not found" or autoload errors

**Solution:**
```bash
cd backend
composer dump-autoload
php artisan clear-compiled
php artisan cache:clear
php artisan config:clear
```

### Frontend Issues

#### Issue: "Request blocked by DevTools"

**Solution:**
1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Click "Request blocking" icon
4. Disable all blocking rules
5. Refresh page

#### Issue: "Network error: Unable to connect"

**Solution:**
```bash
# Ensure backend is running on port 8000
curl http://localhost:8000/api/organizations

# Check Vite proxy configuration in vite.config.ts
# Should proxy /api to http://localhost:8000
```

#### Issue: "Module not found" errors

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### Issue: Pages loading slowly

**Solution:**
- Disable browser extensions (especially ad blockers)
- Check DevTools Network tab for slow requests
- Clear browser cache (Ctrl+Shift+Delete)
- Ensure `refetchOnWindowFocus: false` in React Query hooks

### Common Errors

#### "Unauthenticated" (401)

**Causes:**
- Token expired or invalid
- Token not sent in Authorization header
- User account disabled

**Solution:**
```typescript
// Check token in localStorage
console.log(localStorage.getItem('api_token'));

// If invalid, clear and re-login
localStorage.removeItem('api_token');
// Navigate to login page
```

#### "Organization not found" (404)

**Causes:**
- User not assigned to organization
- Organization was deleted
- Cross-organization access attempt

**Solution:**
```sql
-- Check user's profile in database
SELECT * FROM profiles WHERE id = 'user-uuid';

-- Assign user to organization
UPDATE profiles
SET organization_id = 'org-uuid'
WHERE id = 'user-uuid';
```

#### CORS Errors

**Causes:**
- CORS middleware not configured
- Frontend URL not in allowed origins

**Solution:**
```php
// In backend/config/cors.php
'allowed_origins' => [
    env('FRONTEND_URL', 'http://localhost:5173'),
    'http://localhost:5173',
],

// In backend/.env
FRONTEND_URL=http://localhost:5173
```

### Performance Issues

If the application is slow:

1. **Enable caching:**
```bash
cd backend
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

2. **Check database queries:**
```bash
# Enable query logging in .env
DB_LOG_QUERIES=true

# Check logs
tail -f backend/storage/logs/laravel.log
```

3. **Optimize frontend:**
```bash
cd frontend
npm run build  # Production build with optimizations
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following our coding standards
4. Write/update tests
5. Commit your changes: `git commit -m 'feat: add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add student photo upload
fix: resolve organization scoping issue
docs: update API documentation
style: format code with prettier
refactor: simplify authentication logic
test: add tests for student creation
chore: update dependencies
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Laravel](https://laravel.com) - PHP Framework
- [React](https://reactjs.org) - UI Library
- [shadcn/ui](https://ui.shadcn.com) - UI Components
- [TanStack Query](https://tanstack.com/query) - Data Fetching
- [Tailwind CSS](https://tailwindcss.com) - CSS Framework

---

## 💬 Support

### Documentation
- [Installation Guide](#installation)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Development Guide](.claude.md)

### Community
- GitHub Issues: [Report a Bug](https://github.com/yourusername/nazim-web/issues)
- Discussions: [Ask Questions](https://github.com/yourusername/nazim-web/discussions)

### Contact
- Email: support@nazim.local
- Website: https://nazim.local

---

<div align="center">

**Made with ❤️ for Islamic Educational Institutions**

[![GitHub stars](https://img.shields.io/github/stars/yourusername/nazim-web?style=social)](https://github.com/yourusername/nazim-web)
[![GitHub forks](https://img.shields.io/github/forks/yourusername/nazim-web?style=social)](https://github.com/yourusername/nazim-web)

</div>
