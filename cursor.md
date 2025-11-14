# Nazim School Management System - Cursor Documentation

## 🏫 Project Overview

**Nazim School Management System** is a comprehensive, modern web application designed specifically for Islamic educational institutions. It provides a complete solution for managing all aspects of school operations from student admissions to graduation.

## 🛠️ Technology Stack

### Frontend
- **React 18.3.1** - Modern React with hooks and concurrent features
- **TypeScript** - Full type safety and better developer experience
- **Vite 5.4.1** - Fast build tool with SWC compilation
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality, accessible UI components
- **TanStack Query** - Powerful data synchronization for React
- **React Router DOM v6** - Declarative routing
- **React Hook Form** - Performant forms with easy validation
- **Zod** - TypeScript-first schema validation
- **Recharts** - Composable charting library
- **Lucide React** - Beautiful & consistent icon toolkit

### Backend & Database
- **Supabase** - Backend-as-a-Service platform
- **PostgreSQL** - Robust relational database
- **Supabase Auth** - Authentication and user management
- **Supabase Storage** - File storage and management
- **Supabase Edge Functions** - Serverless functions
- **Row Level Security (RLS)** - Database-level security

### Development Tools
- **Vitest** - Fast unit testing framework
- **Testing Library** - Simple and complete testing utilities
- **ESLint** - Code linting and quality assurance
- **TypeScript ESLint** - TypeScript-specific linting rules
- **Prettier** - Code formatting
- **Husky** - Git hooks for quality gates

## 🏗️ Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui components
│   ├── admin/           # Admin-specific components
│   ├── auth/            # Authentication components
│   ├── dashboard/       # Dashboard components
│   ├── dashboards/      # Role-specific dashboards
│   ├── hifz/            # Quran memorization components
│   ├── layout/          # Layout components
│   ├── navigation/      # Navigation components
│   └── omr/             # OMR scanning components
├── hooks/               # Custom React hooks
├── integrations/        # External service integrations
│   └── supabase/        # Supabase client and types
├── lib/                 # Utility functions and configurations
├── pages/               # Page components
│   ├── academic/        # Academic management pages
│   ├── communication/   # Communication pages
│   ├── exams/           # Examination pages
│   ├── finance/         # Financial management pages
│   ├── hostel/          # Hostel management pages
│   ├── parent/          # Parent portal pages
│   ├── settings/        # Settings pages
│   └── students/        # Student management pages
├── types/               # TypeScript type definitions
└── test/                # Test utilities and setup
```

## 🎨 Design System

### Color Palette
- **Primary**: Deep Islamic Green (`hsl(158, 58%, 28%)`)
- **Secondary**: Warm Gold (`hsl(45, 85%, 58%)`)
- **Accent**: Royal Blue (`hsl(217, 71%, 53%)`)
- **Success**: Green (`hsl(142, 71%, 45%)`)
- **Warning**: Orange (`hsl(38, 92%, 50%)`)
- **Destructive**: Red (`hsl(0, 84%, 60%)`)

### Typography
- **Primary Font**: Inter (Latin scripts)
- **Arabic Font**: Noto Sans Arabic (Arabic scripts)
- **RTL Support**: Full right-to-left language support

### Components
- **40+ shadcn/ui components** with custom styling
- **Responsive design** with mobile-first approach
- **Dark/Light mode** support
- **Accessibility** features built-in
- **Custom animations** and transitions

## 🗄️ Database Schema

### Core Entities
- **Users**: `profiles`, `user_roles`, `user_security_settings`
- **Students**: `students`, `student_parents`, `admission_applications`
- **Academic**: `classes`, `subjects`, `academic_years`, `attendance`
- **Examinations**: `exams`, `exam_questions`, `exam_results`, `omr_scans`
- **Finance**: `fees`, `invoices`, `donations`, `fee_structures`
- **Communication**: `messages`, `communications`, `events`, `notifications`
- **Hostel**: `hostel_rooms`, `hostel_allocations`
- **Library**: `library_books`, `library_transactions`
- **Assets**: `assets`, `file_uploads`
- **Reports**: `generated_reports`, `report_templates`
- **Hifz**: `hifz_progress` for Quran memorization tracking

### Security Features
- **Audit Logs**: Complete action tracking
- **Auth Monitoring**: Security event logging
- **Role Management**: Multi-level permissions
- **Password Security**: Secure password policies

## 🚀 Key Features

### 1. Student Management
- Complete student lifecycle management
- Admission applications with approval workflow
- Student profiles with academic records
- Parent-student relationships
- Bulk import capabilities
- ID card generation with QR codes

### 2. Academic Management
- Class and subject management
- Timetable creation and management
- Grade-level organization
- Academic year management
- Student enrollment tracking

### 3. Attendance System
- Real-time attendance tracking
- Multiple attendance devices support
- Attendance summaries and reports
- Automated notifications
- Device integration capabilities

### 4. Examination System
- Complete exam management
- Question bank with multiple question types
- OMR (Optical Mark Recognition) scanning
- Automated result processing
- Report card generation
- Roll number assignment

### 5. Hifz Progress Tracking
- Quran memorization progress
- Daily session logging
- Teacher feedback system
- Progress analytics and reports
- Mistake tracking and improvement

### 6. Financial Management
- Fee structure management
- Payment tracking and invoicing
- Donation management
- Financial reporting
- Automated fee calculations

### 7. Communication Hub
- Announcements and notifications
- Parent-teacher messaging
- Event management
- SMS integration
- Email notifications

### 8. Hostel Management
- Room allocation and management
- Student assignments
- Hostel attendance tracking
- Fee management for hostel residents

### 9. Library System
- Book catalog management
- Issue and return tracking
- Fine management
- Student borrowing history

### 10. Asset Management
- School asset tracking
- Maintenance scheduling
- Asset assignment
- Depreciation tracking

## 👥 User Roles & Permissions

### Role Hierarchy
1. **Super Admin** - Full system access across all schools
2. **Admin** - School-level administration
3. **Teacher** - Academic management and student interaction
4. **Staff** - Operational tasks and support
5. **Student** - Personal academic information access
6. **Parent** - Child's academic information and communication

### Permission System
- **Granular permissions** for each role
- **Feature-based access control**
- **Data-level security** with RLS
- **Audit trails** for all actions

## 🔧 Development Guidelines

### Code Style
- **TypeScript strict mode** enabled
- **Functional components** with hooks
- **Custom hooks** for reusable logic
- **Proper error boundaries** implementation
- **Performance optimization** with React.memo

### File Naming
- **Components**: PascalCase (`StudentDashboard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useStudents.tsx`)
- **Utilities**: camelCase (`utils.ts`)
- **Types**: camelCase (`student.ts`)

### Component Structure
```typescript
interface ComponentProps {
  // Define all props with proper types
  title: string;
  onAction: (data: ActionData) => void;
  isLoading?: boolean;
}

export function ComponentName({ title, onAction, isLoading = false }: ComponentProps) {
  // Component logic
  return (
    <div className="proper-tailwind-classes">
      {/* JSX content */}
    </div>
  );
}
```

### Data Fetching Pattern
```typescript
// Custom hook for data fetching
export const useStudents = (params: StudentParams) => {
  return useQuery({
    queryKey: ['students', params],
    queryFn: () => fetchStudents(params),
    enabled: !!params.classId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

### Form Handling
```typescript
// React Hook Form + Zod validation
const form = useForm<StudentFormData>({
  resolver: zodResolver(studentSchema),
  defaultValues: {
    // Default values
  },
});
```

## 🧪 Testing Strategy

### Unit Tests
- **Component rendering** tests
- **User interaction** tests
- **Custom hooks** tests
- **Utility functions** tests

### Integration Tests
- **API integration** tests
- **Database operations** tests
- **Authentication flows** tests
- **Role-based access** tests

### Test Structure
```typescript
describe('StudentDashboard', () => {
  it('should render student information correctly', () => {
    // Test implementation
  });
  
  it('should handle user interactions', () => {
    // Test implementation
  });
});
```

## 🔒 Security Implementation

### Authentication
- **JWT tokens** for secure authentication
- **Role-based authorization** with granular permissions
- **Session management** with automatic refresh
- **Password policies** and security requirements

### Data Protection
- **Row Level Security (RLS)** for database access
- **Input validation** with Zod schemas
- **XSS protection** with proper sanitization
- **CSRF protection** with secure tokens

### Audit Logging
- **Complete action tracking** for all user activities
- **Security event monitoring** for suspicious activities
- **Data change logging** for compliance
- **Performance monitoring** for system health

## 🌍 Internationalization

### Multi-language Support
- **English** - Primary language
- **Urdu** - Local language support
- **Arabic** - Islamic content support
- **Pashto** - Regional language support

### RTL Support
- **Right-to-left** layout support
- **Arabic text** rendering
- **Cultural adaptations** for Islamic practices
- **Proper font** selection for different scripts

## 📱 Progressive Web App

### PWA Features
- **Offline support** for basic functionality
- **App installation** on mobile devices
- **Push notifications** for real-time updates
- **Background sync** for data synchronization

### Performance
- **Lazy loading** for all pages
- **Code splitting** for optimal bundle sizes
- **Caching strategies** for improved performance
- **Image optimization** for faster loading

## 🚀 Deployment

### Environment Configuration
```typescript
// Environment variables
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_ENV=production
```

### Build Process
- **Vite** for fast builds and hot reload
- **TypeScript** compilation with strict mode
- **Tailwind CSS** purging for optimal bundle size
- **Asset optimization** for production

### Deployment Options
- **Lovable Platform** - Primary deployment
- **Custom Domain** - Domain connection support
- **Environment Management** - Dev/prod configurations
- **Database Migrations** - Automated schema updates

## 📊 Business Model

### Pricing Tiers
- **Starter**: ₹2,999/month (up to 200 students)
- **Professional**: ₹5,999/month (up to 1000 students)
- **Enterprise**: ₹12,999/month (unlimited students)

### Feature Matrix
- **Core Features** - Available in all plans
- **Advanced Features** - Higher tier plans
- **Custom Integrations** - Enterprise only
- **Support Levels** - Varies by plan

## 🎯 Target Market

### Primary Users
- **Islamic schools** and madrasas
- **Private educational** institutions
- **International schools** with Islamic focus
- **Educational organizations** worldwide

### Geographic Focus
- **Pakistan** and South Asia
- **Middle East** and North Africa
- **Global Islamic** educational institutions
- **Multicultural** educational settings

## 🔮 Future Roadmap

### Planned Features
- **Mobile applications** (iOS/Android)
- **Advanced analytics** and AI insights
- **Third-party integrations** (payment gateways, LMS)
- **White-label solutions** for resellers
- **API marketplace** for developers

### Technical Improvements
- **Microservices architecture** for scalability
- **Advanced caching** strategies
- **Real-time collaboration** features
- **Advanced security** measures

## 🏆 Competitive Advantages

1. **Islamic-Focused Design** - Specifically designed for Islamic educational institutions
2. **Comprehensive Solution** - All-in-one platform covering every aspect of school management
3. **Modern Technology** - Latest web technologies and best practices
4. **User-Friendly Interface** - Intuitive design with role-based customization
5. **Scalable Architecture** - Handles institutions from 200 to unlimited students
6. **Enterprise Security** - Bank-grade security with complete audit trails
7. **Multilingual Support** - Support for multiple languages and RTL scripts
8. **Real-time Features** - Live updates and collaborative capabilities

## 🛠️ Development Commands

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Building
```bash
npm run build
```

### Testing
```bash
npm run test
```

### Linting
```bash
npm run lint
```

## 📚 Additional Resources

### Documentation
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest)

### Design Resources
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Lucide Icons](https://lucide.dev/)
- [Tailwind UI](https://tailwindui.com/)

### Islamic Resources
- [Islamic Calendar API](https://api.aladhan.com/)
- [Quran API](https://api.alquran.cloud/)
- [Prayer Times API](https://api.aladhan.com/)

---

**Note**: This is a production application serving real educational institutions. Always prioritize security, performance, and user experience in your development work.
