import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  Building2,
  CalendarDays,
  DollarSign,
  GraduationCap,
  LayoutDashboard,
  School,
  Users,
} from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { StatsCard } from '@/components/dashboard/StatsCard';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ChartSkeleton,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from '@/components/charts/LazyChart';
import { PageHeader } from '@/components/layout/PageHeader';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSchoolContext } from '@/contexts/SchoolContext';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useOrganizationDashboardOverview } from '@/hooks/useOrganizationDashboardOverview';
import { useUserPermissions } from '@/hooks/usePermissions';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { canAccessOrgAdminDashboard } from '@/organization-admin/lib/access';

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat().format(value || 0);
};

const formatPercentage = (value: number): string => {
  return `${(value || 0).toFixed(1)}%`;
};

export default function OrganizationDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { profile, loading, profileLoading } = useAuth();
  const { setSelectedSchoolId } = useSchoolContext();
  const { data: permissions = [], isLoading: permissionsLoading } = useUserPermissions();
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'finance'>('overview');

  const isAccessCheckLoading = loading || profileLoading || permissionsLoading;

  const canAccessOrganizationDashboard = useMemo(() => {
    return canAccessOrgAdminDashboard(profile, permissions);
  }, [permissions, profile]);

  const {
    data: overview,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useOrganizationDashboardOverview(!isAccessCheckLoading && canAccessOrganizationDashboard);

  useEffect(() => {
    if (!isAccessCheckLoading && !canAccessOrganizationDashboard) {
      navigate('/dashboard', { replace: true });
    }
  }, [canAccessOrganizationDashboard, isAccessCheckLoading, navigate]);

  if (isAccessCheckLoading || (!canAccessOrganizationDashboard && !isAccessCheckLoading)) {
    return (
      <MainLayout title={t('organizationAdmin.orgDashboardTitle')}>
        <LoadingSpinner text={isAccessCheckLoading ? t('organizationAdmin.checkingAccess') : t('organizationAdmin.redirecting')} />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title={t('organizationAdmin.orgDashboardTitle')}>
        <Card>
          <CardHeader>
            <CardTitle>{t('organizationAdmin.loadErrorTitle')}</CardTitle>
            <CardDescription>{t('organizationAdmin.loadErrorDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} disabled={isFetching}>
              {t('organizationAdmin.retry')}
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  if (isLoading || !overview) {
    return (
      <MainLayout title={t('organizationAdmin.orgDashboardTitle')}>
        <LoadingSpinner text={t('organizationAdmin.loadingOverview')} />
      </MainLayout>
    );
  }

  const summary = overview.summary;
  const schools = overview.schools;

  const statsCards = [
    {
      title: t('organizationAdmin.totalStudents'),
      value: formatNumber(summary.total_students),
      icon: Users,
      description: t('organizationAdmin.totalStudentsDesc'),
      color: 'blue' as const,
      onClick: '/students',
      buttonText: t('organizationAdmin.viewStudents'),
    },
    {
      title: t('organizationAdmin.totalStaff'),
      value: formatNumber(summary.total_staff),
      icon: GraduationCap,
      description: t('organizationAdmin.totalStaffDesc'),
      color: 'green' as const,
      onClick: '/staff',
      buttonText: t('organizationAdmin.viewStaff'),
    },
    {
      title: t('organizationAdmin.totalSchools'),
      value: formatNumber(summary.total_schools),
      icon: School,
      description: `${formatNumber(summary.active_schools)} ${t('organizationAdmin.totalSchoolsDesc')}`,
      color: 'purple' as const,
      onClick: '/settings/schools',
      buttonText: t('organizationAdmin.viewSchools'),
    },
    {
      title: t('organizationAdmin.totalClasses'),
      value: formatNumber(summary.total_classes),
      icon: BookOpen,
      description: t('organizationAdmin.totalClassesDesc'),
      color: 'amber' as const,
      onClick: '/settings/classes',
      buttonText: t('organizationAdmin.viewClasses'),
    },
    {
      title: t('organizationAdmin.todaysAttendance'),
      value: formatPercentage(summary.today_attendance.rate),
      icon: CalendarDays,
      description: `${formatNumber(summary.today_attendance.present)} / ${formatNumber(summary.today_attendance.total)} ${t('organizationAdmin.todaysAttendanceDesc')}`,
      color: 'emerald' as const,
      onClick: '/attendance/reports',
      buttonText: t('organizationAdmin.viewAttendance'),
    },
    {
      title: t('organizationAdmin.buildingsRooms'),
      value: `${formatNumber(summary.total_buildings)} / ${formatNumber(summary.total_rooms)}`,
      icon: Building2,
      description: t('organizationAdmin.buildingsRoomsDesc'),
      color: 'orange' as const,
      onClick: '/settings/buildings',
      buttonText: t('organizationAdmin.viewBuildings'),
    },
  ];

  const quickActions = [
    { label: t('organizationAdmin.schools'), href: '/settings/schools', icon: School },
    { label: t('organizationAdmin.studentsLabel'), href: '/students', icon: Users },
    { label: t('organizationAdmin.staffLabel'), href: '/staff', icon: GraduationCap },
    { label: t('organizationAdmin.classesLabel'), href: '/settings/classes', icon: BookOpen },
    { label: t('organizationAdmin.subscription'), href: '/subscription', icon: DollarSign },
  ];

  const handleOpenSchoolDashboard = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    navigate('/dashboard');
  };

  return (
    <MainLayout title={t('organizationAdmin.orgDashboardTitle')}>
      <div className="container mx-auto max-w-7xl space-y-6 overflow-x-hidden p-4 md:p-6">
        <PageHeader
          title={t('organizationAdmin.orgDashboardTitle')}
          description={t('organizationAdmin.orgDashboardSubtitle')}
          icon={<LayoutDashboard className="h-5 w-5" />}
        />

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'attendance' | 'finance')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">{t('organizationAdmin.tabOverview')}</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">{t('organizationAdmin.tabAttendance')}</span>
            </TabsTrigger>
            <TabsTrigger value="finance" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">{t('organizationAdmin.tabFinance')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {statsCards.map((stat) => (
                <StatsCard
                  key={stat.title}
                  title={stat.title}
                  value={stat.value}
                  icon={stat.icon}
                  description={stat.description}
                  color={stat.color}
                  showButton={true}
                  buttonText={stat.buttonText}
                  onClick={() => navigate(stat.onClick)}
                />
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('organizationAdmin.schoolsOverview')}</CardTitle>
                <CardDescription>{t('organizationAdmin.schoolsOverviewDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('organizationAdmin.school')}</TableHead>
                      <TableHead>{t('organizationAdmin.status')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('organizationAdmin.totalStudents')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('organizationAdmin.totalStaff')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('organizationAdmin.totalClasses')}</TableHead>
                      <TableHead>{t('organizationAdmin.todaysAttendance')}</TableHead>
                      <TableHead className="text-right">{t('organizationAdmin.action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schools.map((school) => (
                      <TableRow key={school.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenSchoolDashboard(school.id)}>
                        <TableCell className="font-medium">
                          <div>{school.name}</div>
                          {school.slug ? <div className="text-xs text-muted-foreground">{school.slug}</div> : null}
                        </TableCell>
                        <TableCell>
                          <Badge variant={school.is_active ? 'default' : 'secondary'}>
                            {school.is_active ? t('organizationAdmin.active') : t('organizationAdmin.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{formatNumber(school.students_count)}</TableCell>
                        <TableCell className="hidden md:table-cell">{formatNumber(school.staff_count)}</TableCell>
                        <TableCell className="hidden lg:table-cell">{formatNumber(school.classes_count)}</TableCell>
                        <TableCell>
                          {formatNumber(school.today_attendance.present)} / {formatNumber(school.today_attendance.total)} ({formatPercentage(school.today_attendance.rate)})
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpenSchoolDashboard(school.id);
                            }}
                            aria-label={t('organizationAdmin.open')}
                          >
                            {t('organizationAdmin.open')} <ArrowUpRight className="h-4 w-4 ml-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('organizationAdmin.studentsBySchool')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<ChartSkeleton />}>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overview.charts.students_by_school}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={70} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Suspense>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('organizationAdmin.staffBySchool')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<ChartSkeleton />}>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overview.charts.staff_by_school}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={70} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Suspense>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>{t('organizationAdmin.quickActions')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {quickActions.map((action) => (
                      <Button
                        key={action.label}
                        variant="outline"
                        className="h-20 flex-col gap-2"
                        onClick={() => navigate(action.href)}
                      >
                        <action.icon className="h-5 w-5" />
                        <span className="text-xs sm:text-sm">{action.label}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('organizationAdmin.todaySummary')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">{t('organizationAdmin.upcomingExams')}</div>
                    <div className="text-xl font-semibold">{formatNumber(overview.today_summary.upcoming_exams_count)}</div>
                  </div>

                  {overview.today_summary.alerts.length > 0 && (
                    <div className="space-y-2">
                      {overview.today_summary.alerts.map((alert, index) => (
                        <div key={`${alert.type}-${index}`} className="flex items-start gap-2 text-sm p-2 rounded-md bg-amber-50 text-amber-700">
                          <AlertTriangle className="h-4 w-4 mt-0.5" />
                          <span>{alert.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {overview.today_summary.upcoming_exams.slice(0, 3).map((exam) => (
                    <div key={exam.id} className="text-sm border rounded-md p-2">
                      <div className="font-medium">{exam.name}</div>
                      <div className="text-muted-foreground">{exam.school_name}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {overview.today_summary.recent_activity.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('organizationAdmin.recentActivity')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {overview.today_summary.recent_activity.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="flex items-start justify-between gap-4 border-b last:border-b-0 pb-3 last:pb-0">
                      <div>
                        <p className="text-sm font-medium">
                          {activity.description || activity.event || t('organizationAdmin.activityUpdate')}
                        </p>
                        {activity.subject_type ? (
                          <p className="text-xs text-muted-foreground">{activity.subject_type}</p>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {activity.created_at ? formatDateTime(activity.created_at) : ''}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="attendance" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsCard
                title={t('organizationAdmin.presentToday')}
                value={formatNumber(summary.today_attendance.present)}
                icon={Users}
                color="green"
                description={t('organizationAdmin.presentTodayDesc')}
              />
              <StatsCard
                title={t('organizationAdmin.expectedToday')}
                value={formatNumber(summary.today_attendance.total)}
                icon={School}
                color="blue"
                description={t('organizationAdmin.expectedTodayDesc')}
              />
              <StatsCard
                title={t('organizationAdmin.attendanceRate')}
                value={formatPercentage(summary.today_attendance.rate)}
                icon={CalendarDays}
                color="emerald"
                description={t('organizationAdmin.attendanceRateDesc')}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('organizationAdmin.attendanceRateBySchool')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<ChartSkeleton />}>
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={overview.charts.attendance_rate_by_school}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={70} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>School Attendance Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School</TableHead>
                      <TableHead>Present</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schools.map((school) => (
                      <TableRow key={school.id}>
                        <TableCell>{school.name}</TableCell>
                        <TableCell>{formatNumber(school.today_attendance.present)}</TableCell>
                        <TableCell>{formatNumber(school.today_attendance.total)}</TableCell>
                        <TableCell>{formatPercentage(school.today_attendance.rate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finance" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatsCard
                title={t('organizationAdmin.incomeLabel')}
                value={formatCurrency(summary.finance.income)}
                icon={DollarSign}
                color="green"
                description={t('organizationAdmin.incomeDesc')}
              />
              <StatsCard
                title={t('organizationAdmin.expenseLabel')}
                value={formatCurrency(summary.finance.expense)}
                icon={DollarSign}
                color="red"
                description={t('organizationAdmin.expenseDesc')}
              />
              <StatsCard
                title={t('organizationAdmin.netLabel')}
                value={formatCurrency(summary.finance.net)}
                icon={DollarSign}
                color={summary.finance.net >= 0 ? 'emerald' : 'red'}
                description={t('organizationAdmin.netDesc')}
              />
              <StatsCard
                title={t('organizationAdmin.feeCollection')}
                value={formatCurrency(summary.finance.fee_collection)}
                icon={DollarSign}
                color="blue"
                description={t('organizationAdmin.feeCollectionDesc')}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('organizationAdmin.feeCollectionBySchool')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<ChartSkeleton />}>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overview.charts.fee_collection_by_school}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={70} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Suspense>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('organizationAdmin.incomeBySchool')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<ChartSkeleton />}>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overview.charts.income_by_school}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={70} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#16a34a" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Suspense>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('organizationAdmin.financeBySchool')}</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('organizationAdmin.school')}</TableHead>
                      <TableHead>{t('organizationAdmin.incomeLabel')}</TableHead>
                      <TableHead>{t('organizationAdmin.expenseLabel')}</TableHead>
                      <TableHead>{t('organizationAdmin.netLabel')}</TableHead>
                      <TableHead>{t('organizationAdmin.feeCollection')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schools.map((school) => (
                      <TableRow key={school.id}>
                        <TableCell className="font-medium">{school.name}</TableCell>
                        <TableCell>{formatCurrency(school.finance.income)}</TableCell>
                        <TableCell>{formatCurrency(school.finance.expense)}</TableCell>
                        <TableCell>
                          <Badge variant={school.finance.net >= 0 ? 'default' : 'destructive'}>
                            {formatCurrency(school.finance.net)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(school.finance.fee_collection)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
