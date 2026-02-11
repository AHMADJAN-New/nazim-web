import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  Building2,
  CalendarDays,
  DollarSign,
  GraduationCap,
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
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSchoolContext } from '@/contexts/SchoolContext';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationDashboardOverview } from '@/hooks/useOrganizationDashboardOverview';
import { useUserPermissions } from '@/hooks/usePermissions';
import { formatCurrency, formatDateTime } from '@/lib/utils';

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat().format(value || 0);
};

const formatPercentage = (value: number): string => {
  return `${(value || 0).toFixed(1)}%`;
};

export default function OrganizationDashboard() {
  const navigate = useNavigate();
  const { profile, loading, profileLoading } = useAuth();
  const { setSelectedSchoolId } = useSchoolContext();
  const { data: permissions = [], isLoading: permissionsLoading } = useUserPermissions();
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'finance'>('overview');

  const isAccessCheckLoading = loading || profileLoading || permissionsLoading;

  const canAccessOrganizationDashboard = useMemo(() => {
    if (!profile?.organization_id) return false;

    const hasAllSchoolsAccess = profile.schools_access_all === true;
    const isOrganizationAdmin = profile.role === 'organization_admin';
    const hasEquivalentPermission =
      permissions.includes('organizations.read') ||
      permissions.includes('dashboard.read') ||
      permissions.includes('school_branding.read');

    return hasAllSchoolsAccess && (isOrganizationAdmin || hasEquivalentPermission);
  }, [permissions, profile?.organization_id, profile?.role, profile?.schools_access_all]);

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
      <MainLayout title="Organization Dashboard">
        <LoadingSpinner text={isAccessCheckLoading ? 'Checking access...' : 'Redirecting...'} />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Organization Dashboard">
        <Card>
          <CardHeader>
            <CardTitle>Unable to load organization dashboard</CardTitle>
            <CardDescription>
              Please try again. If the issue continues, verify your organization permissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} disabled={isFetching}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  if (isLoading || !overview) {
    return (
      <MainLayout title="Organization Dashboard">
        <LoadingSpinner text="Loading organization overview..." />
      </MainLayout>
    );
  }

  const summary = overview.summary;
  const schools = overview.schools;

  const statsCards = [
    {
      title: 'Total Students',
      value: formatNumber(summary.total_students),
      icon: Users,
      description: 'Organization-wide students',
      color: 'blue' as const,
      onClick: '/students',
      buttonText: 'View Students',
    },
    {
      title: 'Total Staff',
      value: formatNumber(summary.total_staff),
      icon: GraduationCap,
      description: 'Organization-wide staff',
      color: 'green' as const,
      onClick: '/staff',
      buttonText: 'View Staff',
    },
    {
      title: 'Total Schools',
      value: formatNumber(summary.total_schools),
      icon: School,
      description: `${summary.active_schools} active schools`,
      color: 'purple' as const,
      onClick: '/settings/schools',
      buttonText: 'View Schools',
    },
    {
      title: 'Total Classes',
      value: formatNumber(summary.total_classes),
      icon: BookOpen,
      description: 'Across all schools',
      color: 'amber' as const,
      onClick: '/settings/classes',
      buttonText: 'View Classes',
    },
    {
      title: "Today's Attendance",
      value: formatPercentage(summary.today_attendance.rate),
      icon: CalendarDays,
      description: `${formatNumber(summary.today_attendance.present)} / ${formatNumber(summary.today_attendance.total)} present`,
      color: 'emerald' as const,
      onClick: '/attendance/reports',
      buttonText: 'View Attendance',
    },
    {
      title: 'Buildings / Rooms',
      value: `${formatNumber(summary.total_buildings)} / ${formatNumber(summary.total_rooms)}`,
      icon: Building2,
      description: 'Organization infrastructure',
      color: 'orange' as const,
      onClick: '/settings/buildings',
      buttonText: 'View Buildings',
    },
  ];

  const quickActions = [
    { label: 'Schools', href: '/settings/schools', icon: School },
    { label: 'Students', href: '/students', icon: Users },
    { label: 'Staff', href: '/staff', icon: GraduationCap },
    { label: 'Classes', href: '/settings/classes', icon: BookOpen },
    { label: 'Subscription', href: '/subscription', icon: DollarSign },
  ];

  const handleOpenSchoolDashboard = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    navigate('/dashboard');
  };

  return (
    <MainLayout title="Organization Dashboard">
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-primary to-primary/80 p-5 md:p-7 rounded-xl text-primary-foreground shadow-lg">
          <h1 className="text-2xl md:text-3xl font-bold">Organization Dashboard</h1>
          <p className="text-primary-foreground/90 mt-1">
            Organization-wide view across all schools.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'attendance' | 'finance')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
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
                <CardTitle>Schools Overview</CardTitle>
                <CardDescription>Compare school size and attendance across the organization.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Classes</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead className="text-right">Action</TableHead>
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
                            {school.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatNumber(school.students_count)}</TableCell>
                        <TableCell>{formatNumber(school.staff_count)}</TableCell>
                        <TableCell>{formatNumber(school.classes_count)}</TableCell>
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
                          >
                            Open <ArrowUpRight className="h-4 w-4 ml-1" />
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
                  <CardTitle>Students by School</CardTitle>
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
                  <CardTitle>Staff by School</CardTitle>
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
                  <CardTitle>Quick Actions</CardTitle>
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
                  <CardTitle>Today Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Upcoming Exams</div>
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
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {overview.today_summary.recent_activity.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="flex items-start justify-between gap-4 border-b last:border-b-0 pb-3 last:pb-0">
                      <div>
                        <p className="text-sm font-medium">
                          {activity.description || activity.event || 'Activity update'}
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
                title="Present Today"
                value={formatNumber(summary.today_attendance.present)}
                icon={Users}
                color="green"
                description="Students marked present"
              />
              <StatsCard
                title="Expected Today"
                value={formatNumber(summary.today_attendance.total)}
                icon={School}
                color="blue"
                description="Total attendance records"
              />
              <StatsCard
                title="Attendance Rate"
                value={formatPercentage(summary.today_attendance.rate)}
                icon={CalendarDays}
                color="emerald"
                description="Organization-wide attendance"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Attendance Rate by School</CardTitle>
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
                title="Income"
                value={formatCurrency(summary.finance.income)}
                icon={DollarSign}
                color="green"
                description="Total income (all schools)"
              />
              <StatsCard
                title="Expense"
                value={formatCurrency(summary.finance.expense)}
                icon={DollarSign}
                color="red"
                description="Total expense (all schools)"
              />
              <StatsCard
                title="Net"
                value={formatCurrency(summary.finance.net)}
                icon={DollarSign}
                color={summary.finance.net >= 0 ? 'emerald' : 'red'}
                description="Income - expense"
              />
              <StatsCard
                title="Fee Collection"
                value={formatCurrency(summary.finance.fee_collection)}
                icon={DollarSign}
                color="blue"
                description="Total fee payments"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Fee Collection by School</CardTitle>
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
                  <CardTitle>Income by School</CardTitle>
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
                <CardTitle>Finance by School</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School</TableHead>
                      <TableHead>Income</TableHead>
                      <TableHead>Expense</TableHead>
                      <TableHead>Net</TableHead>
                      <TableHead>Fee Collection</TableHead>
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
