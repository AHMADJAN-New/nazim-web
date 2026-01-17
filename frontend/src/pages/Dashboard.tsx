import {
  type LucideIcon,
  Users,
  GraduationCap,
  UserCheck,
  CreditCard,
  TrendingUp,
  Calendar,
  Bell,
  BookOpen,
  Building,
  Trophy,
  AlertCircle,
  CheckCircle,
  DollarSign,
  UserPlus,
  FileText,
  Home,
  ClipboardList,
  MessageSquare,
  BarChart3,
  Activity,
  Target,
  Gift,
  BedSingle,
  CalendarDays,
  GraduationCapIcon,
  Package,
  BookMarked,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingDown
} from "lucide-react";
import { useMemo, useEffect, useState, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
// Lazy load recharts to reduce initial bundle size
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  LineChart, 
  Line,
  Area,
  AreaChart,
  Legend,
  ChartSkeleton
} from "@/components/charts/LazyChart";

import { StatsCard } from "@/components/dashboard/StatsCard";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { LoadingSpinner } from "@/components/ui/loading";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats, useStudentsByClass, useWeeklyAttendance, useMonthlyFeeCollection, useUpcomingExams } from "@/hooks/useDashboardStats";
import { useLanguage } from "@/hooks/useLanguage";
import { useRecentActivities } from "@/hooks/useRecentActivities";
import { useUpcomingEvents } from "@/hooks/useUpcomingEvents";
import { useHasAnyPermissionAndFeature, useHasPermissionAndFeature } from "@/hooks/usePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { formatDate, formatDateTime } from '@/lib/utils';

// Lazy load dashboard components for performance (only load when tab is opened)
const FinanceDashboard = lazy(() => import('@/pages/finance/FinanceDashboard').then(m => ({ default: m.default })));
const AssetsDashboard = lazy(() => import('@/pages/assets/AssetsDashboard').then(m => ({ default: m.default })));
const LibraryDashboard = lazy(() => import('@/pages/LibraryDashboard').then(m => ({ default: m.default })));
const AttendanceDashboard = lazy(() => import('@/pages/dashboard/AttendanceDashboard').then(m => ({ default: m.default })));
const LeaveRequestsDashboard = lazy(() => import('@/pages/dashboard/LeaveRequestsDashboard').then(m => ({ default: m.default })));
const DmsDashboard = lazy(() => import('@/pages/dms/DmsDashboard').then(m => ({ default: m.default })));

const FINANCE_PERMISSIONS = [
  'finance_accounts.read',
  'income_entries.read',
  'expense_entries.read',
  'finance_projects.read',
  'donors.read',
  'finance_reports.read',
  'currencies.read',
  'exchange_rates.read',
  'fees.read',
  'fees.payments.create',
  'fees.exceptions.create',
  'finance_documents.read',
];

const LIBRARY_PERMISSIONS = [
  'library_books.read',
  'library_categories.read',
  'library_loans.read',
];

const DOCUMENTS_PERMISSIONS = [
  'dms.incoming.read',
  'dms.outgoing.read',
  'dms.templates.read',
  'dms.letterheads.read',
  'dms.letter_types.read',
  'dms.departments.read',
  'dms.reports.read',
  'dms.settings.read',
  'dms.archive.read',
];

const ATTENDANCE_PERMISSIONS = [
  'attendance_sessions.read',
  'attendance_sessions.report',
];

const LEAVE_PERMISSIONS = [
  'leave_requests.read',
];

const ASSETS_PERMISSIONS = [
  'assets.read',
];

const EXAMS_PERMISSIONS = [
  'exams.read',
];

export default function Dashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [activeTab, setActiveTab] = useState<string>('overview');

  const canSeeStudents = useHasPermissionAndFeature('students.read') === true;
  const canSeeStaff = useHasPermissionAndFeature('staff.read') === true;
  const canSeeClasses = useHasPermissionAndFeature('classes.read') === true;
  const canSeeBuildings = useHasPermissionAndFeature('buildings.read') === true;
  const canSeeRooms = useHasPermissionAndFeature('rooms.read') === true;
  const canSeeFinanceTab = useHasAnyPermissionAndFeature(FINANCE_PERMISSIONS) === true;
  const canSeeAssetsTab = useHasAnyPermissionAndFeature(ASSETS_PERMISSIONS) === true;
  const canSeeLibraryTab = useHasAnyPermissionAndFeature(LIBRARY_PERMISSIONS) === true;
  const canSeeAttendanceTab = useHasAnyPermissionAndFeature(ATTENDANCE_PERMISSIONS) === true;
  const canSeeLeaveTab = useHasAnyPermissionAndFeature(LEAVE_PERMISSIONS) === true;
  const canSeeDocumentsTab = useHasAnyPermissionAndFeature(DOCUMENTS_PERMISSIONS) === true;
  const canSeeExams = useHasAnyPermissionAndFeature(EXAMS_PERMISSIONS) === true;

  const allowedTabs = useMemo(() => {
    const tabs = ['overview'];
    if (canSeeFinanceTab) tabs.push('finance');
    if (canSeeAssetsTab) tabs.push('assets');
    if (canSeeLibraryTab) tabs.push('library');
    if (canSeeAttendanceTab) tabs.push('attendance');
    if (canSeeLeaveTab) tabs.push('leave');
    if (canSeeDocumentsTab) tabs.push('documents');
    return tabs;
  }, [
    canSeeFinanceTab,
    canSeeAssetsTab,
    canSeeLibraryTab,
    canSeeAttendanceTab,
    canSeeLeaveTab,
    canSeeDocumentsTab,
  ]);

  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0] || 'overview');
    }
  }, [activeTab, allowedTabs]);

  const availableTabLabels = useMemo(() => {
    const labels: string[] = [];
    if (canSeeFinanceTab) labels.push(t('nav.finance') || 'Finance');
    if (canSeeAssetsTab) labels.push(t('nav.assets') || 'Assets');
    if (canSeeLibraryTab) labels.push(t('nav.library') || 'Library');
    if (canSeeAttendanceTab) labels.push(t('nav.attendance') || 'Attendance');
    if (canSeeLeaveTab) labels.push(t('nav.leaveRequests') || 'Leave Requests');
    if (canSeeDocumentsTab) labels.push(t('students.documents') || 'Documents');
    return labels;
  }, [
    canSeeFinanceTab,
    canSeeAssetsTab,
    canSeeLibraryTab,
    canSeeAttendanceTab,
    canSeeLeaveTab,
    canSeeDocumentsTab,
    t,
  ]);

  // CRITICAL: Event users should not access dashboard - redirect to their event
  useEffect(() => {
    if (profile?.is_event_user && profile?.event_id) {
      // Redirect to their assigned event immediately
      navigate(`/events/${profile.event_id}`, { replace: true });
      return;
    }
  }, [profile, navigate]);

  // If event user, show loading while redirecting
  if (profile?.is_event_user && profile?.event_id) {
    return <LoadingSpinner text="Redirecting to event..." />;
  }
  
  // Only load data for the active tab (lazy loading for performance)
  // Overview tab data is always loaded (first tab)
  const { data: dashboardStats, isLoading: statsLoading } = useDashboardStats();
  const { data: studentsByClass, isLoading: classLoading } = useStudentsByClass();
  const { data: attendanceData, isLoading: attendanceLoading } = useWeeklyAttendance();
  const { data: feeCollectionData, isLoading: feeLoading } = useMonthlyFeeCollection();
  const { data: upcomingExams, isLoading: examsLoading } = useUpcomingExams();
  const { data: recentActivities, isLoading: activitiesLoading } = useRecentActivities();
  const { data: upcomingEvents, isLoading: eventsLoading } = useUpcomingEvents();

  const handleStatClick = (path: string) => {
    navigate(path);
  };

  // Create stats cards from real data
  const statsCards = dashboardStats ? ([
    canSeeStudents ? {
      title: t('students.totalStudents') || "Total Students",
      value: dashboardStats.totalStudents.toLocaleString(),
      icon: Users,
      description: t('dashboard.activeStudents') || "Active students",
      color: "blue" as const,
      onClick: "/students",
      showButton: true,
      buttonText: t('students.viewAll') || "View Students"
    } : null,
    canSeeStaff ? {
      title: t('dashboard.totalStaff') || "Total Staff",
      value: dashboardStats.totalStaff.toLocaleString(),
      icon: GraduationCap,
      description: t('dashboard.activeStaff') || "Active staff",
      color: "green" as const,
      onClick: "/staff",
      showButton: true,
      buttonText: t('staff.viewAll') || "View Staff"
    } : null,
    canSeeClasses ? {
      title: t('dashboard.totalClasses') || "Total Classes",
      value: dashboardStats.totalClasses.toLocaleString(),
      icon: BookOpen,
      description: t('dashboard.activeClasses') || "Active classes",
      color: "purple" as const,
      onClick: "/settings/classes",
      showButton: true,
      buttonText: t('classes.viewAll') || "View Classes"
    } : null,
    canSeeRooms ? {
      title: t('hostel.totalRooms') || "Total Rooms",
      value: dashboardStats.totalRooms.toLocaleString(),
      icon: Building,
      description: t('dashboard.availableRooms') || "Available rooms",
      color: "amber" as const,
      onClick: "/settings/buildings",
      showButton: true,
      buttonText: t('buildings.viewAll') || "View Buildings"
    } : null,
    canSeeBuildings ? {
      title: t('dashboard.totalBuildings') || "Total Buildings",
      value: dashboardStats.totalBuildings.toLocaleString(),
      icon: Home,
      description: t('dashboard.schoolBuildings') || "School buildings",
      color: "blue" as const,
      onClick: "/settings/buildings",
      showButton: true,
      buttonText: t('buildings.viewAll') || "View Buildings"
    } : null
  ].filter(Boolean) as Array<{
    title: string;
    value: string;
    icon: LucideIcon;
    description: string;
    color: "blue" | "green" | "purple" | "amber" | "red";
    onClick: string;
    showButton: boolean;
    buttonText: string;
  }>) : [];


  if (statsLoading || roleLoading) {
    return (
        <MainLayout title={t('dashboard.title') || "Dashboard"}>
          <LoadingSpinner />
        </MainLayout>
    );
  }

  const otherTabsMessage = availableTabLabels.length > 0
    ? `${t('dashboard.viewTabsForDetails') || 'View other tabs for'} ${availableTabLabels.join(', ')}`
    : (t('dashboard.viewTabsForDetails') || 'View other tabs for more details');

  const renderDefaultDashboard = () => {
    const quickActions = ([
      canSeeStudents ? { label: "Students", icon: Users, href: "/students", color: "hover:bg-primary/10 hover:border-primary" } : null,
      canSeeStaff ? { label: "Staff", icon: GraduationCap, href: "/staff", color: "hover:bg-secondary/10 hover:border-secondary" } : null,
      canSeeClasses ? { label: "Classes", icon: BookOpen, href: "/settings/classes", color: "hover:bg-primary/10 hover:border-primary" } : null,
      canSeeBuildings ? { label: "Buildings", icon: Building, href: "/settings/buildings", color: "hover:bg-accent/10 hover:border-accent" } : null,
    ].filter(Boolean) as Array<{
      label: string;
      icon: LucideIcon;
      href: string;
      color: string;
    }>);

    return (
      <div data-tour="dashboard">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 p-4 md:p-8 rounded-xl text-primary-foreground shadow-lg mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t('dashboard.welcomeBack') || 'Welcome back'}, {user?.email?.split('@')[0] || t('events.user') || 'User'}!</h1>
            <p className="text-primary-foreground/90 text-sm sm:text-lg">
              {t('dashboard.welcomeMessage') || "Here's what's happening at your school today"}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-primary-foreground/80">
            <Calendar className="h-5 w-5" />
            <span className="hidden lg:inline">{formatDate(new Date())}</span>
            <span className="lg:hidden">{formatDate(new Date())}</span>
          </div>
        </div>
      </div>

      {/* Key Metrics - Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        {statsCards.slice(0, 4).map((stat, index) => (
          <StatsCard 
            key={index}
            {...stat}
            onClick={() => handleStatClick(stat.onClick)}
          />
        ))}
      </div>

      {/* Analytics Section - Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
        {/* Students by Class - Bar Chart */}
        {canSeeClasses && studentsByClass && studentsByClass.length > 0 && (
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Students by Class
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/students")}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ChartSkeleton />}>
                <ChartContainer
                  config={{
                    students: {
                      label: "Students",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[200px] sm:h-[220px] md:h-[250px] lg:h-[300px] w-full"
                >
                  <BarChart data={studentsByClass}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="class" 
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      className="text-xs"
                    />
                    <YAxis 
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      className="text-xs"
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="students" 
                      fill="var(--color-students)"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </Suspense>
            </CardContent>
          </Card>
        )}

      </div>

      {/* Quick Actions & Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-2 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className={`h-24 flex-col gap-2 transition-all duration-200 ${action.color}`}
                  onClick={() => navigate(action.href)}
                >
                  <action.icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's Summary */}
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Today's Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canSeeExams && upcomingExams && upcomingExams.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Upcoming Exams</span>
                </div>
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary">
                  {upcomingExams.length}
                </Badge>
              </div>
            )}
            <div className="text-sm text-muted-foreground text-center py-4">
              {otherTabsMessage}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    );
  };

  return (
      <MainLayout title={t('dashboard.title') || "Dashboard"}>
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" data-tour="dashboard-tabs">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 h-auto p-1" data-tour="dashboard-tabs-list">
            <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-tour="tab-overview">
              <Home className="h-4 w-4" />
              <span>{t('dashboard.overview') || 'Overview'}</span>
            </TabsTrigger>
            {canSeeFinanceTab && (
              <TabsTrigger value="finance" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-tour="tab-finance">
                <DollarSign className="h-4 w-4" />
                <span>{t('nav.finance') || 'Finance'}</span>
              </TabsTrigger>
            )}
            {canSeeAssetsTab && (
              <TabsTrigger value="assets" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-tour="tab-assets">
                <Package className="h-4 w-4" />
                <span>{t('nav.assets') || 'Assets'}</span>
              </TabsTrigger>
            )}
            {canSeeLibraryTab && (
              <TabsTrigger value="library" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-tour="tab-library">
                <BookOpen className="h-4 w-4" />
                <span>{t('nav.library') || 'Library'}</span>
              </TabsTrigger>
            )}
            {canSeeAttendanceTab && (
              <TabsTrigger value="attendance" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-tour="tab-attendance">
                <Activity className="h-4 w-4" />
                <span>{t('nav.attendance') || 'Attendance'}</span>
              </TabsTrigger>
            )}
            {canSeeLeaveTab && (
              <TabsTrigger value="leave" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-tour="tab-leave">
                <Calendar className="h-4 w-4" />
                <span>{t('nav.leaveRequests') || 'Leave Requests'}</span>
              </TabsTrigger>
            )}
            {canSeeDocumentsTab && (
              <TabsTrigger value="documents" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-tour="tab-documents">
                <FileText className="h-4 w-4" />
                <span>{t('students.documents') || 'Documents'}</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            {renderDefaultDashboard()}
          </TabsContent>

          {canSeeFinanceTab && (
            <TabsContent value="finance" className="mt-6">
              <Suspense fallback={<LoadingSpinner text={t('common.loading') || 'Loading finance dashboard...'} />}>
                <FinanceDashboard />
              </Suspense>
            </TabsContent>
          )}

          {canSeeAssetsTab && (
            <TabsContent value="assets" className="mt-6">
              <Suspense fallback={<LoadingSpinner text={t('common.loading') || 'Loading assets dashboard...'} />}>
                <AssetsDashboard />
              </Suspense>
            </TabsContent>
          )}

          {canSeeLibraryTab && (
            <TabsContent value="library" className="mt-6">
              <Suspense fallback={<LoadingSpinner text={t('common.loading') || 'Loading library dashboard...'} />}>
                <LibraryDashboard />
              </Suspense>
            </TabsContent>
          )}

          {canSeeAttendanceTab && (
            <TabsContent value="attendance" className="mt-6">
              <Suspense fallback={<LoadingSpinner text={t('common.loading') || 'Loading attendance dashboard...'} />}>
                <AttendanceDashboard />
              </Suspense>
            </TabsContent>
          )}

          {canSeeLeaveTab && (
            <TabsContent value="leave" className="mt-6">
              <Suspense fallback={<LoadingSpinner text={t('common.loading') || 'Loading leave requests dashboard...'} />}>
                <LeaveRequestsDashboard />
              </Suspense>
            </TabsContent>
          )}

          {canSeeDocumentsTab && (
            <TabsContent value="documents" className="mt-6">
              <Suspense fallback={<LoadingSpinner text={t('common.loading') || 'Loading documents dashboard...'} />}>
                <DmsDashboard />
              </Suspense>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}
