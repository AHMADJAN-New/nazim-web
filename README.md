# Nazim School Management System - Web Application

A modern, clean startup web application for school management, built with React and TypeScript. This is a clean foundation ready for translating logic from the PyQt5 desktop application.

## 📋 Project Overview

**Nazim Web** is a comprehensive school management system designed for Islamic religious schools (madrasas). This web application provides a clean, modular foundation with a beautiful UI, ready for feature development.

### Current Status: Clean Startup App

This repository contains a **clean startup application** with:
- ✅ **Sidebar design** - Fully functional navigation sidebar ready for new menu items
- ✅ **Translation system** - Complete i18n support (English, Pashto, Dari, Arabic)
- ✅ **Dashboard** - Main dashboard page with role-based views
- ✅ **Authentication** - Login, password reset, and pending approval flows
- ✅ **Core layout** - Persistent layout with header and sidebar
- ✅ **UI Components** - Complete shadcn-ui component library
- ✅ **All feature pages removed** - Clean slate for building from scratch

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- Git
- Docker Desktop - [Download Docker Desktop](https://www.docker.com/get-started/) (Required for local Supabase)
- Supabase CLI - See installation instructions below

### Local Supabase Setup

This project uses Supabase for backend services. To run Supabase locally:

#### 1. Install Supabase CLI

**Windows (using Scoop - Recommended):**
```powershell
# Install Scoop if not already installed
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Add Supabase bucket and install CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Alternative methods:**
- Download from [Supabase CLI Releases](https://github.com/supabase/cli/releases)
- Use `npx supabase` for one-time commands (slower)

#### 2. Start Docker Desktop

Ensure Docker Desktop is running before starting Supabase services.

#### 3. Start Local Supabase

```bash
# Navigate to project directory
cd nazim-school-manager-pro

# Start Supabase services (this will start all containers)
supabase start
```

This command will:
- Start PostgreSQL database
- Start Supabase Studio (dashboard)
- Start Auth service
- Start Storage service
- Apply all migrations from `supabase/migrations/`

#### 4. Get Local Credentials

After starting Supabase, you'll see output with local credentials. Save these to your `.env` file:

```bash
# Get the local credentials
supabase status
```

The output will include:
- `API URL`: `http://localhost:54321`
- `anon key`: Your anonymous key
- `service_role key`: Your service role key
- `DB URL`: PostgreSQL connection string

#### 5. Configure Environment Variables

Create or update your `.env` file in the project root:

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

#### 6. Access Supabase Studio

Once Supabase is running, access the local dashboard at:
- **Studio URL**: http://localhost:54323

#### 7. Seed Super Admin User

For local development, you need a super admin user to access the application:

```bash
# Method 1: Using SQL migration (Recommended)
Get-Content supabase\migrations\20250128000000_seed_super_admin.sql | docker exec -i supabase_db_wkrzoelctjwpiwdswmdj psql -U postgres -d postgres

# Method 2: Using npm script (requires tsx)
npm run seed:admin
```

**Default Admin Credentials:**
- **Email:** `admin@nazim.local`
- **Password:** `Admin123!@#`
- **Role:** `super_admin`

> ⚠️ **Warning:** This seed script is for development only. Never run it in production!

#### Useful Supabase Commands

```bash
# Start Supabase services
supabase start

# Stop Supabase services
supabase stop

# Check status and get credentials
supabase status

# Reset database (applies all migrations and seed data)
supabase db reset

# View logs
supabase logs

# Stop and remove all containers (clean slate)
supabase stop --no-backup
```

### Installation

```sh
# Step 1: Clone the repository
git clone https://github.com/AHMADJAN-New/nazim-web.git

# Step 2: Navigate to the project directory
cd nazim-web

# Step 3: Install dependencies
npm install

# Step 4: Copy the example environment file and update the values
cp .env.example .env

# Step 5: Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`

## 🛠️ Available Scripts

```sh
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Preview production build
npm run preview

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Run tests
npm test
```

## 🏗️ Technology Stack

This project is built with modern web technologies:

- **Vite** - Next-generation frontend tooling
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **React Router** - Client-side routing
- **shadcn-ui** - Beautiful, accessible component library
- **Tailwind CSS** - Utility-first CSS framework
- **TanStack Query** - Powerful data synchronization
- **Supabase** - Backend as a service (database, auth, storage)
- **Recharts** - Composable charting library
- **React Hook Form** - Performant forms with easy validation
- **Zod** - TypeScript-first schema validation

## 🌐 Internationalization

The application supports multiple languages:
- English (en)
- Pashto (ps)
- Dari/Farsi (fa)
- Arabic (ar)

Translation system is fully implemented and ready for use. RTL (Right-to-Left) support is included for Arabic, Pashto, and Dari.

## 📁 Project Structure

```
nazim-web/
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # shadcn-ui components
│   │   ├── layout/       # Layout components (Sidebar, Header)
│   │   └── navigation/   # Navigation components
│   ├── pages/            # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Index.tsx     # Landing page
│   │   ├── AuthPage.tsx
│   │   └── ...
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries (i18n, etc.)
│   ├── integrations/     # External service integrations
│   └── types/            # TypeScript type definitions
├── public/               # Static assets
└── supabase/            # Supabase migrations and configs
```

## 🔐 Authentication & Demo Accounts

The application uses Supabase for authentication. To set up demo accounts:

```sh
# Reset database with migrations and seed data
supabase db reset
```

This creates demo accounts:
- `super.admin@greenvalley.edu` - Super Admin
- `admin@greenvalley.edu` - Admin
- `teacher@greenvalley.edu` - Teacher
- `student@greenvalley.edu` - Student
- `parent@greenvalley.edu` - Parent
- `staff@greenvalley.edu` - Staff
- `pending@greenvalley.edu` - Pending Approval

**Default password for all demo accounts:** `admin123`

## 🎨 UI/UX Features

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark Mode Support** - Built-in theme switching
- **Accessible** - WCAG compliant components
- **RTL Support** - Full right-to-left language support
- **Modern Sidebar** - Collapsible, icon-based navigation
- **Beautiful Components** - shadcn-ui component library

## 📦 Development Workflow

### Adding New Features

1. Create new page components in `src/pages/`
2. Add routes in `src/App.tsx`
3. Add navigation items to sidebar in `src/components/layout/AppSidebar.tsx` or `src/components/navigation/SmartSidebar.tsx`
4. Add translations in `src/lib/i18n.ts`
5. Implement feature logic

### Code Style

- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for code formatting
- Follow existing component patterns

## 🚢 Deployment

### Build for Production

```sh
npm run build
```

The production build will be in the `dist/` directory.

### Deploy Options

- **Vercel** - Recommended for Vite + React apps
- **Netlify** - Easy deployment with continuous integration
- **GitHub Pages** - Free hosting for static sites
- **Any static hosting service** - The app builds to static files

## 🤝 Contributing

This is a clean startup application ready for development. When contributing:

1. Follow the existing code structure
2. Use TypeScript for all new code
3. Add translations for all user-facing text
4. Maintain RTL support for Arabic/Pashto/Dari
5. Write clean, documented code

## 📝 License

[Add your license here]

## 🔗 Links

- **Repository**: https://github.com/AHMADJAN-New/nazim-web
- **Issues**: https://github.com/AHMADJAN-New/nazim-web/issues

## 📧 Contact

[Add contact information]

---

**Note**: This is a clean startup application. All feature pages have been removed to provide a clean foundation for building features from scratch, translating logic from the PyQt5 desktop application.
