import { 
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
  PieChart,
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

import { MainLayout } from "@/components/layout/MainLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  PieChart as RechartsPieChart, 
  Pie,
  Cell, 
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
  Legend
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { useNavigate } from "react-router-dom";
import { useDashboardStats, useStudentsByClass, useWeeklyAttendance, useMonthlyFeeCollection, useUpcomingExams } from "@/hooks/useDashboardStats";
import { useRecentActivities } from "@/hooks/useRecentActivities";
import { useUpcomingEvents } from "@/hooks/useUpcomingEvents";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/hooks/useLanguage";
import { LoadingSpinner } from "@/components/ui/loading";
import { useAssetSummary } from "@/hooks/useAssetSummary";
import { useLibrarySummary } from "@/hooks/useLibrarySummary";
import { useLeaveRequestsSummary } from "@/hooks/useLeaveRequestsSummary";
import { useAttendanceTodaySummary } from "@/hooks/useAttendanceTodaySummary";
import { useMemo, useState, useEffect } from "react";
import { useBootstrap } from "@/hooks/useBootstrap";

export default function Dashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  
  // Fetch real data from hooks
  const { data: dashboardStats, isLoading: statsLoading } = useDashboardStats();
  const { data: studentsByClass, isLoading: classLoading } = useStudentsByClass();
  const { data: attendanceData, isLoading: attendanceLoading } = useWeeklyAttendance();
  const { data: feeCollectionData, isLoading: feeLoading } = useMonthlyFeeCollection();
  const { data: upcomingExams, isLoading: examsLoading } = useUpcomingExams();
  const { data: recentActivities, isLoading: activitiesLoading } = useRecentActivities();
  const { data: upcomingEvents, isLoading: eventsLoading } = useUpcomingEvents();
  
  // Use bootstrap data for initial load - this is the primary data source
  const { data: bootstrapData } = useBootstrap();
  
  // Only fetch detailed summaries after initial render (lazy load)
  // This prevents them from blocking initial page load
  // They will load after bootstrap completes
  const [loadSummaries, setLoadSummaries] = useState(false);
  
  useEffect(() => {
    // Load summaries after bootstrap data is available (or 1 second delay)
    if (bootstrapData) {
      const timer = setTimeout(() => {
        setLoadSummaries(true);
      }, 1000); // 1 second delay - allows bootstrap to complete first
      return () => clearTimeout(timer);
    }
  }, [bootstrapData]);
  
  // Fetch assets data (only after initial load)
  const { data: assetSummary, isLoading: assetStatsLoading } = useAssetSummary(loadSummaries);
  
  // Fetch library summary (only after initial load)
  const { data: librarySummary } = useLibrarySummary(loadSummaries);
  
  // Fetch leave requests summary (only after initial load)
  const { data: leaveRequestsSummary } = useLeaveRequestsSummary(loadSummaries);
  
  // Fetch attendance today summary (only after initial load)
  const { data: attendanceTodaySummary } = useAttendanceTodaySummary(loadSummaries);

  const handleStatClick = (path: string) => {
    navigate(path);
  };

  // Compute assets statistics from summary
  const assetsData = useMemo(() => {
    if (!assetSummary) return null;
    const stats = assetSummary as any; // Type assertion for API response
    const totalValue = stats.total_purchase_value || 0;
    const statusCounts = stats.status_counts || {};
    const statusData = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: value as number,
    }));
    return {
      total: stats.asset_count || 0,
      totalValue,
      statusData,
      statusCounts,
    };
  }, [assetSummary]);

  // Compute books statistics from summary
  const booksData = useMemo(() => {
    if (!librarySummary) {
      return {
        totalBooks: 0,
        totalCopies: 0,
        availableCopies: 0,
        onLoan: 0,
        booksStatusData: [],
      };
    }
    const booksStatusData = [
      { name: "Available", value: librarySummary.available_copies, color: "#10b981" },
      { name: "On Loan", value: librarySummary.on_loan, color: "#f59e0b" },
    ];
    return {
      totalBooks: librarySummary.total_books,
      totalCopies: librarySummary.total_copies,
      availableCopies: librarySummary.available_copies,
      onLoan: librarySummary.on_loan,
      booksStatusData,
    };
  }, [librarySummary]);

  // Compute leave requests statistics from summary
  const leaveRequestsData = useMemo(() => {
    if (!leaveRequestsSummary) {
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        leaveStatusData: [],
      };
    }
    const leaveStatusData = [
      { name: "Pending", value: leaveRequestsSummary.pending, color: "#f59e0b" },
      { name: "Approved", value: leaveRequestsSummary.approved, color: "#10b981" },
      { name: "Rejected", value: leaveRequestsSummary.rejected, color: "#ef4444" },
    ];
    return {
      total: leaveRequestsSummary.total,
      pending: leaveRequestsSummary.pending,
      approved: leaveRequestsSummary.approved,
      rejected: leaveRequestsSummary.rejected,
      leaveStatusData,
    };
  }, [leaveRequestsSummary]);

  // Compute attendance statistics from summary
  const attendanceDataComputed = useMemo(() => {
    if (!attendanceTodaySummary) {
      return {
        today: {
          percentage: 0,
          present: 0,
          absent: 0,
          total: 0,
        },
        weeklyTrend: [], // Weekly trend not available in summary
      };
    }
    
    return {
      today: attendanceTodaySummary.today,
      weeklyTrend: [], // Weekly trend not available in summary - would need separate endpoint if needed
    };
  }, [attendanceTodaySummary]);

  // Create stats cards from real data
  const statsCards = dashboardStats ? [
    {
      title: t('dashboard.totalStudents') || "Total Students",
      value: dashboardStats.totalStudents.toLocaleString(),
      icon: Users,
      description: t('dashboard.activeStudents') || "Active students",
      color: "primary" as const,
      onClick: "/students"
    },
    {
      title: t('dashboard.totalStaff') || "Total Staff",
      value: dashboardStats.totalStaff.toLocaleString(),
      icon: GraduationCap,
      description: t('dashboard.activeStaff') || "Active staff",
      color: "secondary" as const,
      onClick: "/staff"
    },
    {
      title: t('dashboard.totalClasses') || "Total Classes",
      value: dashboardStats.totalClasses.toLocaleString(),
      icon: BookOpen,
      description: t('dashboard.activeClasses') || "Active classes",
      color: "primary" as const,
      onClick: "/classes"
    },
    {
      title: t('dashboard.totalRooms') || "Total Rooms",
      value: dashboardStats.totalRooms.toLocaleString(),
      icon: Building,
      description: t('dashboard.availableRooms') || "Available rooms",
      color: "secondary" as const,
      onClick: "/settings/buildings"
    },
    {
      title: t('dashboard.totalBuildings') || "Total Buildings",
      value: dashboardStats.totalBuildings.toLocaleString(),
      icon: Home,
      description: t('dashboard.schoolBuildings') || "School buildings",
      color: "primary" as const,
      onClick: "/settings/buildings"
    }
  ] : [];

  const genderDistribution = dashboardStats ? [
    { name: t('students.male') || "Male", value: dashboardStats.studentGender.male, color: "#2563eb" },
    { name: t('students.female') || "Female", value: dashboardStats.studentGender.female, color: "#dc2626" }
  ] : [];

  if (statsLoading || roleLoading || assetStatsLoading) {
    return (
      <MainLayout title={t('dashboard.title') || "Dashboard"}>
        <LoadingSpinner />
      </MainLayout>
    );
  }

  // Render default admin/staff dashboard
  const renderDashboard = () => {
    return renderDefaultDashboard();
  };

  const renderDefaultDashboard = () => (
    <>
      {/* Welcome Section */}
      <div className="bg-gradient-hero p-6 rounded-lg text-primary-foreground">
        <h1 className="text-2xl font-bold mb-2">{t('dashboard.welcomeBack') || 'Welcome back'}, {user?.email?.split('@')[0] || t('common.user') || 'User'}!</h1>
        <p className="text-primary-foreground/80">
          {t('dashboard.welcomeMessage') || "Here's what's happening at your school today"}
        </p>
      <div className="bg-gradient-to-r from-primary to-primary/80 p-8 rounded-xl text-primary-foreground shadow-lg mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.email?.split('@')[0] || 'User'}!</h1>
            <p className="text-primary-foreground/90 text-lg">
              Here's what's happening at your school today
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-primary-foreground/80">
            <Calendar className="h-5 w-5" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Key Metrics - Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.slice(0, 4).map((stat, index) => (
          <div 
            key={index} 
            onClick={() => handleStatClick(stat.onClick)}
            className="cursor-pointer transform hover:scale-[1.02] transition-all duration-200"
          >
            <StatsCard {...stat} />
          </div>
        ))}
      </div>

      {/* Analytics Section - Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Students by Class - Bar Chart */}
        {studentsByClass && studentsByClass.length > 0 && (
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
              <ChartContainer
                config={{
                  students: {
                    label: "Students",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[300px]"
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
            </CardContent>
          </Card>
        )}

        {/* Gender Distribution - Pie Chart */}
        {dashboardStats && (dashboardStats.studentGender.male > 0 || dashboardStats.studentGender.female > 0) && (
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/students")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-secondary" />
                {t('dashboard.genderDistribution') || 'Gender Distribution'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  male: {
                    label: "Male",
                    color: "hsl(221.2 83.2% 53.3%)",
                  },
                  female: {
                    label: "Female",
                    color: "hsl(0 72.2% 50.6%)",
                  },
                }}
                className="h-[300px]"
              >
                <RechartsPieChart>
                  <Pie
                    data={genderDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {genderDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </RechartsPieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

        {/* Students by Class Chart - Show only if data exists */}
        {studentsByClass && studentsByClass.length > 0 && (
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/students")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                {t('dashboard.studentsByClass') || 'Students by Class'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  percentage: {
                    label: "Attendance %",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[300px]"
              >
                <AreaChart data={attendanceDataComputed.weeklyTrend}>
                  <defs>
                    <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
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
                    domain={[0, 100]}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => [`${value}%`, 'Attendance']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="percentage" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fill="url(#colorAttendance)"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Asset Status Distribution */}
        {assetsData && assetsData.statusData.length > 0 && (
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PieChart className="h-5 w-5 text-primary" />
                  Asset Status Distribution
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/assets")}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  Active: {
                    label: "Active",
                    color: "hsl(142.1 76.2% 36.3%)",
                  },
                  Inactive: {
                    label: "Inactive",
                    color: "hsl(0 72.2% 50.6%)",
                  },
                  Maintenance: {
                    label: "Maintenance",
                    color: "hsl(38 92% 50%)",
                  },
                }}
                className="h-[300px]"
              >
                <RechartsPieChart>
                  <Pie
                    data={assetsData.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {assetsData.statusData.map((entry, index) => {
                      const colors = ["hsl(221.2 83.2% 53.3%)", "hsl(142.1 76.2% 36.3%)", "hsl(38 92% 50%)", "hsl(0 72.2% 50.6%)", "hsl(262.1 83.3% 57.8%)"];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </RechartsPieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('dashboard.quickActions') || 'Quick Actions'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('nav.students') || "Students", icon: Users, href: "/students", color: "hover:bg-primary/10" },
              { label: t('nav.staff') || "Staff", icon: GraduationCap, href: "/staff", color: "hover:bg-secondary/10" },
              { label: t('nav.classes') || "Classes", icon: BookOpen, href: "/classes", color: "hover:bg-primary/10" },
              { label: t('dashboard.buildings') || "Buildings", icon: Building, href: "/settings/buildings", color: "hover:bg-accent/10" }
            ].map((action, index) => {
              const IconComponent = action.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  className={`h-20 flex-col gap-2 transition-all duration-200 ${action.color}`}
                  onClick={() => navigate(action.href)}
                >
                  <IconComponent className="h-6 w-6" />
                  <span className="text-sm">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Asset Value Chart - Full Width */}
      {assetsData && assetsData.statusData.length > 0 && (
        <Card className="shadow-md hover:shadow-lg transition-shadow mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                Assets by Status
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/assets")}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: {
                  label: "Count",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <BarChart data={assetsData.statusData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
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
                  dataKey="value" 
                  fill="var(--color-value)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions & Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-2 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Students", icon: Users, href: "/students", color: "hover:bg-primary/10 hover:border-primary" },
                { label: "Staff", icon: GraduationCap, href: "/staff", color: "hover:bg-secondary/10 hover:border-secondary" },
                { label: "Classes", icon: BookOpen, href: "/classes", color: "hover:bg-primary/10 hover:border-primary" },
                { label: "Buildings", icon: Building, href: "/settings/buildings", color: "hover:bg-accent/10 hover:border-accent" }
              ].map((action, index) => (
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
            {attendanceDataComputed && attendanceDataComputed.today.total > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Attendance</span>
                  <span className="font-semibold">{attendanceDataComputed.today.percentage}%</span>
                </div>
                <Progress value={attendanceDataComputed.today.percentage} className="h-2" />
              </div>
            )}
            {leaveRequestsData && leaveRequestsData.pending > 0 && (
              <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium">Pending Leaves</span>
                </div>
                <Badge variant="outline" className="bg-warning/20 text-warning border-warning">
                  {leaveRequestsData.pending}
                </Badge>
              </div>
            )}
            {upcomingExams && upcomingExams.length > 0 && (
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
          </CardContent>
        </Card>
      </div>
    </>
  );

  return (
    <MainLayout title={t('dashboard.title') || "Dashboard"}>
      <div className="space-y-6">
        {renderDashboard()}
      </div>
    </MainLayout>
  );
}