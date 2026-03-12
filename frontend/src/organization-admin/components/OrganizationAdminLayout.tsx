import {
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  Languages,
  LogOut,
  Menu,
  UserRound,
  Users,
  X,
  ArrowLeft,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';

interface OrganizationAdminLayoutProps {
  children: React.ReactNode;
}

interface OrgAdminNavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  description: string;
  visible: boolean;
}

interface OrgAdminNavSection {
  name: string;
  nameKey: string;
  items: OrgAdminNavItem[];
}

function LanguageSwitcherButton() {
  const { language, setLanguage } = useLanguage();
  const languages = [
    { code: 'en' as const, name: 'English' },
    { code: 'ps' as const, name: 'پښتو' },
    { code: 'fa' as const, name: 'دری' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex-shrink-0">
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={language === lang.code ? 'bg-accent' : ''}
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function OrganizationAdminLayout({ children }: OrganizationAdminLayoutProps) {
  const { t, isRTL } = useLanguage();
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['Overview', 'HR']);

  const hasHrStaff = useHasPermission('hr_staff.read');
  const hasHrAssignments = useHasPermission('hr_assignments.read');
  const hasHrPayroll = useHasPermission('hr_payroll.read');
  const hasHrReports = useHasPermission('hr_reports.read');

  const overviewItems: OrgAdminNavItem[] = [
    {
      name: t('organizationAdmin.dashboard'),
      href: '/org-admin/dashboard',
      icon: LayoutDashboard,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/10',
      description: t('organizationAdmin.dashboardDesc'),
      visible: true,
    },
  ];

  const hrItems: OrgAdminNavItem[] = [
    {
      name: t('organizationAdmin.hrHub'),
      href: '/org-admin/hr',
      icon: Users,
      iconColor: 'text-indigo-500',
      iconBg: 'bg-indigo-500/10',
      description: t('organizationAdmin.hrHubDesc'),
      visible: hasHrStaff,
    },
    {
      name: t('organizationAdmin.hrStaff'),
      href: '/org-admin/hr/staff',
      icon: UserRound,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10',
      description: t('organizationAdmin.hrStaffDesc'),
      visible: hasHrStaff,
    },
    {
      name: t('organizationAdmin.hrAssignments'),
      href: '/org-admin/hr/assignments',
      icon: ClipboardList,
      iconColor: 'text-green-500',
      iconBg: 'bg-green-500/10',
      description: t('organizationAdmin.hrAssignmentsDesc'),
      visible: hasHrAssignments,
    },
    {
      name: t('organizationAdmin.hrPayroll'),
      href: '/org-admin/hr/payroll',
      icon: FileSpreadsheet,
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-500/10',
      description: t('organizationAdmin.hrPayrollDesc'),
      visible: hasHrPayroll,
    },
    {
      name: t('organizationAdmin.hrReports'),
      href: '/org-admin/hr/reports',
      icon: BarChart3,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-500/10',
      description: t('organizationAdmin.hrReportsDesc'),
      visible: hasHrReports,
    },
  ];

  const sections: OrgAdminNavSection[] = [
    { name: 'Overview', nameKey: 'organizationAdmin.sectionOverview', items: overviewItems },
    { name: 'HR', nameKey: 'organizationAdmin.sectionHr', items: hrItems },
  ];

  const toggleSection = (name: string) => {
    setExpandedSections((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  return (
    <div className="fixed inset-0 flex bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 z-50 w-64 border-r bg-card transition-transform duration-300 lg:translate-x-0',
          isRTL ? 'right-0' : 'left-0',
          sidebarOpen
            ? 'translate-x-0'
            : isRTL
              ? 'translate-x-full'
              : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold text-lg truncate">{t('organizationAdmin.title')}</span>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {sections.map((section) => {
              const visibleItems = section.items.filter((i) => i.visible);
              if (visibleItems.length === 0) return null;
              const isSectionExpanded = expandedSections.includes(section.name);

              return (
                <div key={section.name} className="mb-3">
                  <button
                    onClick={() => toggleSection(section.name)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>{t(section.nameKey)}</span>
                    {isSectionExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>

                  {isSectionExpanded && (
                    <div className="space-y-1 mt-1">
                      {visibleItems.map((item) => {
                        const isActive =
                          location.pathname === item.href ||
                          (item.href !== '/org-admin/dashboard' && location.pathname.startsWith(item.href));

                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                              'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                              isActive
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                            )}
                            onClick={() => setSidebarOpen(false)}
                            title={item.description}
                          >
                            <div
                              className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 transition-colors',
                                isActive ? 'bg-primary-foreground/20' : item.iconBg,
                              )}
                            >
                              <item.icon className={cn('h-4 w-4', isActive ? 'text-primary-foreground' : item.iconColor)} />
                            </div>
                            <span className="flex-1 truncate">{item.name}</span>
                            {isActive && <div className="absolute right-2 h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="border-t p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{t('organizationAdmin.title')}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('organizationAdmin.backToApp')}
              </Link>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className={cn('flex flex-1 flex-col', isRTL ? 'lg:pr-64' : 'lg:pl-64')}>
        {/* Top Bar */}
        <header
          className={cn(
            'fixed top-0 right-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6',
            isRTL ? 'left-0 lg:right-64' : 'left-0 lg:left-64',
          )}
        >
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <LanguageSwitcherButton />
            <Button variant="ghost" size="sm" asChild className="text-sm text-muted-foreground hover:text-foreground">
              <Link to="/dashboard">{t('organizationAdmin.mainApp')}</Link>
            </Button>
          </div>
        </header>

        <div className="h-16 flex-shrink-0" aria-hidden="true" />

        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          <div className="min-w-0 w-full h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
