import {
  ArrowLeft,
  ArrowRightLeft,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  FileText,
  KeyRound,
  LayoutDashboard,
  Languages,
  LogOut,
  Menu,
  School,
  Settings2,
  Shield,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrganization } from '@/hooks/useOrganizations';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission, useHasPermissionAndFeature, useUserPermissions } from '@/hooks/usePermissions';
import { canAccessOrgAdminDashboard } from '@/organization-admin/lib/access';
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
        <Button variant="ghost" size="sm" className="h-8 rounded-xl px-2.5 text-xs flex-shrink-0">
          <Languages className="h-3.5 w-3.5" />
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
  const { user, profile, signOut } = useAuth();
  const { data: organization } = useCurrentOrganization();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['Overview', 'HR', 'Finance', 'Management']);
  const { data: permissions = [] } = useUserPermissions();

  const { data: platformAdminStatus } = useQuery<{ is_platform_admin: boolean }>({
    queryKey: ['user-is-platform-admin', user?.id],
    queryFn: async () => {
      if (!user) return { is_platform_admin: false };
      try {
        const res = await apiClient.get<{ is_platform_admin: boolean }>('/auth/is-platform-admin');
        return res ?? { is_platform_admin: false };
      } catch {
        return { is_platform_admin: false };
      }
    },
    enabled: !!user,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const isPlatformAdmin = platformAdminStatus?.is_platform_admin ?? false;

  const hasHrStaff = useHasPermission('hr_staff.read');
  const hasHrAssignments = useHasPermission('hr_assignments.read');
  const hasHrPayroll = useHasPermission('hr_payroll.read');
  const hasHrReports = useHasPermission('hr_reports.read');
  const hasSchoolsRead = useHasPermission('school_branding.read');
  const hasUsersRead = useHasPermission('users.read');
  const hasRolesRead = useHasPermission('roles.read');
  const hasPermissionsRead = useHasPermission('permissions.read');
  const hasSubscriptionRead = useHasPermission('subscription.read');
  const hasOrgFinanceRead = useHasPermissionAndFeature('org_finance.read');
  // Show Finance section (including Facilities) when user has permission, so the link is visible
  // even while feature is loading or if only permission is granted (API may still enforce feature)
  const hasOrgFinancePermission = useHasPermission('org_finance.read');
  const showFinanceSection = hasOrgFinanceRead === true || hasOrgFinancePermission === true;
  const canSeeDashboard = canAccessOrgAdminDashboard(profile, permissions);

  const overviewItems: OrgAdminNavItem[] = [
    {
      name: t('organizationAdmin.dashboard'),
      href: '/org-admin/dashboard',
      icon: LayoutDashboard,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/10',
      description: t('organizationAdmin.dashboardDesc'),
      visible: canSeeDashboard,
    },
    {
      name: t('organizationAdmin.subscription'),
      href: '/org-admin/subscription',
      icon: CreditCard,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10',
      description: t('organizationAdmin.subscriptionDesc'),
      visible: true,
    },
    {
      name: t('organizationAdmin.limits'),
      href: '/org-admin/limits',
      icon: BarChart3,
      iconColor: 'text-violet-500',
      iconBg: 'bg-violet-500/10',
      description: t('organizationAdmin.limitsDesc'),
      visible: hasSubscriptionRead,
    },
  ];

  const managementItems: OrgAdminNavItem[] = [
    {
      name: t('organizationAdmin.schools'),
      href: '/org-admin/schools',
      icon: School,
      iconColor: 'text-cyan-500',
      iconBg: 'bg-cyan-500/10',
      description: t('organizationAdmin.schoolsDesc'),
      visible: hasSchoolsRead,
    },
    {
      name: t('organizationAdmin.users'),
      href: '/org-admin/users',
      icon: Users,
      iconColor: 'text-orange-500',
      iconBg: 'bg-orange-500/10',
      description: t('organizationAdmin.usersDesc'),
      visible: hasUsersRead,
    },
    {
      name: t('roles.title') ?? 'Roles',
      href: '/org-admin/roles',
      icon: Shield,
      iconColor: 'text-rose-500',
      iconBg: 'bg-rose-500/10',
      description: t('roles.subtitle') ?? 'Manage organization roles',
      visible: hasRolesRead,
    },
    {
      name: t('permissions.title') ?? 'Permissions',
      href: '/org-admin/permissions',
      icon: KeyRound,
      iconColor: 'text-fuchsia-500',
      iconBg: 'bg-fuchsia-500/10',
      description: t('permissions.subtitle') ?? 'Manage organization permissions',
      visible: hasPermissionsRead,
    },
    {
      name: t('userPermissions.title') ?? 'User Access',
      href: '/org-admin/access',
      icon: Shield,
      iconColor: 'text-teal-500',
      iconBg: 'bg-teal-500/10',
      description: t('userPermissions.subtitle') ?? 'Assign user roles and direct permissions',
      visible: hasPermissionsRead,
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

  const financeItems: OrgAdminNavItem[] = [
    {
      name: t('organizationAdmin.financeDashboard') ?? 'Finance dashboard',
      href: '/org-admin/finance',
      icon: LayoutDashboard,
      iconColor: 'text-teal-500',
      iconBg: 'bg-teal-500/10',
      description: t('organizationAdmin.financeDesc') ?? 'Organization-level overview',
      visible: showFinanceSection,
    },
    {
      name: t('organizationAdmin.financeAccounts') ?? 'Accounts',
      href: '/org-admin/finance/accounts',
      icon: Wallet,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-500/10',
      description: t('organizationAdmin.financeAccountsDesc') ?? 'Org finance accounts',
      visible: showFinanceSection,
    },
    {
      name: t('organizationAdmin.financeIncome') ?? 'Income',
      href: '/org-admin/finance/income',
      icon: TrendingUp,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-500/10',
      description: t('organizationAdmin.financeIncomeDesc') ?? 'Org income entries',
      visible: showFinanceSection,
    },
    {
      name: t('organizationAdmin.financeExpenses') ?? 'Expenses',
      href: '/org-admin/finance/expenses',
      icon: TrendingDown,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-500/10',
      description: t('organizationAdmin.financeExpensesDesc') ?? 'Org expense entries',
      visible: showFinanceSection,
    },
    {
      name: t('organizationAdmin.financeDonors') ?? 'Donors',
      href: '/org-admin/finance/donors',
      icon: Users,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-500/10',
      description: t('organizationAdmin.financeDonorsDesc') ?? 'Org donors',
      visible: showFinanceSection,
    },
    {
      name: t('organizationAdmin.financeReports') ?? 'Reports',
      href: '/org-admin/finance/reports',
      icon: FileText,
      iconColor: 'text-cyan-600',
      iconBg: 'bg-cyan-500/10',
      description: t('organizationAdmin.financeReportsDesc') ?? 'Finance reports',
      visible: showFinanceSection,
    },
    {
      name: t('organizationAdmin.financeProjects') ?? 'Projects',
      href: '/org-admin/finance/projects',
      icon: ClipboardList,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-500/10',
      description: t('organizationAdmin.financeProjectsDesc') ?? 'Org projects',
      visible: showFinanceSection,
    },
    {
      name: t('organizationAdmin.financeSettings') ?? 'Settings',
      href: '/org-admin/finance/settings',
      icon: Settings2,
      iconColor: 'text-sky-600',
      iconBg: 'bg-sky-500/10',
      description: t('organizationAdmin.financeSettingsDesc') ?? 'Currencies, categories & exchange rates',
      visible: showFinanceSection,
    },
    {
      name: t('organizationAdmin.financeTransferToSchool') ?? 'Transfer to school',
      href: '/org-admin/finance/transfers',
      icon: ArrowRightLeft,
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-500/10',
      description: t('organizationAdmin.financeTransferDesc') ?? 'Send funds from org to a school',
      visible: showFinanceSection,
    },
    {
      name: t('organizationAdmin.financeDocuments') ?? 'Documents',
      href: '/org-admin/finance/documents',
      icon: FileText,
      iconColor: 'text-slate-600',
      iconBg: 'bg-slate-500/10',
      description: t('organizationAdmin.financeDocumentsDesc') ?? 'Org-level finance documents',
      visible: showFinanceSection,
    },
    {
      name: t('organizationAdmin.facilities') ?? 'Facilities',
      href: '/org-admin/facilities',
      icon: Building2,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-500/10',
      description: t('organizationAdmin.facilitiesDesc') ?? 'Mosques & managed buildings',
      visible: showFinanceSection,
    },
  ];

  const sections: OrgAdminNavSection[] = [
    { name: 'Overview', nameKey: 'organizationAdmin.sectionOverview', items: overviewItems },
    { name: 'HR', nameKey: 'organizationAdmin.sectionHr', items: hrItems },
    { name: 'Finance', nameKey: 'organizationAdmin.sectionFinance', items: financeItems },
    { name: 'Management', nameKey: 'organizationAdmin.sectionManagement', items: managementItems },
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
          'fixed inset-y-0 z-50 w-72 border-r border-border/60 bg-gradient-to-b from-card via-card to-muted/30 shadow-sm transition-transform duration-300 lg:translate-x-0',
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
          <div className="flex h-[4.25rem] items-center justify-between border-b border-border/60 px-5">
            <div className="min-w-0 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{t('organizationAdmin.title')}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {organization?.name ?? t('organizationAdmin.mainApp')}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-3 overflow-y-auto p-3">
            {sections.map((section) => {
              const visibleItems = section.items.filter((i) => i.visible);
              if (visibleItems.length === 0) return null;
              const isSectionExpanded = expandedSections.includes(section.name);

              return (
                <div key={section.name} className="rounded-2xl border border-border/50 bg-background/80 p-2 shadow-sm">
                  <button
                    onClick={() => toggleSection(section.name)}
                    className="flex w-full items-center justify-between px-1.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span>{t(section.nameKey)}</span>
                    {isSectionExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>

                  {isSectionExpanded && (
                    <div className="mt-2 space-y-1">
                      {visibleItems.map((item) => {
                        const isActive =
                          location.pathname === item.href ||
                          (item.href !== '/org-admin/dashboard' && location.pathname.startsWith(item.href));

                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                              'group relative flex min-h-10 items-center gap-2.5 rounded-xl border px-2.5 py-2 text-[13px] font-medium transition-all',
                              isActive
                                ? 'border-primary/15 bg-primary/10 text-foreground shadow-none'
                                : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-accent/70 hover:text-foreground',
                            )}
                            onClick={() => setSidebarOpen(false)}
                            title={item.description}
                          >
                            <div
                              className={cn(
                                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                                isActive ? 'bg-primary text-primary-foreground' : item.iconBg,
                              )}
                            >
                              <item.icon className={cn('h-3.5 w-3.5', isActive ? 'text-primary-foreground' : item.iconColor)} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="block truncate">{item.name}</span>
                            </div>
                            {isActive && (
                              <div
                                className={cn(
                                  'absolute top-2.5 h-5 w-0.5 rounded-full bg-primary',
                                  isRTL ? 'left-1.5' : 'right-1.5',
                                )}
                              />
                            )}
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
          <div className="border-t border-border/60 p-3">
            <div className="rounded-2xl border border-border/60 bg-background/90 p-3 shadow-sm">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">{profile?.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{t('organizationAdmin.title')}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="h-8 w-full justify-center rounded-xl px-3 text-xs" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  {t('organizationAdmin.backToApp')}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className={cn('flex flex-1 flex-col', isRTL ? 'lg:pr-72' : 'lg:pl-72')}>
        {/* Top Bar */}
        <header
          className={cn(
            'fixed top-0 right-0 z-40 flex h-16 items-center gap-3 border-b border-border/60 bg-background/95 px-4 backdrop-blur lg:px-6',
            isRTL ? 'left-0 lg:right-72' : 'left-0 lg:left-72',
          )}
        >
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0 flex items-center gap-3">
            {organization?.name && (
              <span className="hidden truncate text-sm font-medium text-muted-foreground sm:inline" title={organization.name}>
                {organization.name}
              </span>
            )}
            {profile?.full_name && (
              <span className="hidden truncate text-sm text-muted-foreground md:inline" title={profile.full_name}>
                {profile.full_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <LanguageSwitcherButton />
            {isPlatformAdmin && (
              <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 rounded-xl px-3 text-xs">
                <Link to="/platform/dashboard">
                  <Shield className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('organizationAdmin.platformAdmin') ?? 'Platform Admin'}</span>
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild className="h-8 rounded-xl px-2.5 text-xs text-muted-foreground hover:text-foreground">
              <Link to="/dashboard">{t('organizationAdmin.mainApp')}</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-xl px-2.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => signOut()}
              aria-label={t('activityLogs.actions.logout') || 'Log out'}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('activityLogs.actions.logout') || 'Log out'}</span>
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
