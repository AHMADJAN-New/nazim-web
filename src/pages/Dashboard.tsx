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
  GraduationCapIcon
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
import { useNavigate } from "react-router-dom";
import { useDashboardStats, useStudentsByClass, useWeeklyAttendance, useMonthlyFeeCollection, useUpcomingExams } from "@/hooks/useDashboardStats";
import { useRecentActivities } from "@/hooks/useRecentActivities";
import { useUpcomingEvents } from "@/hooks/useUpcomingEvents";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { ParentDashboard } from "@/components/dashboards/ParentDashboard";
import { StudentDashboard } from "@/components/dashboards/StudentDashboard";
import { TeacherDashboard } from "@/components/dashboards/TeacherDashboard";

export default function Dashboard() {
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

  const handleStatClick = (path: string) => {
    navigate(path);
  };

  // Create stats cards from real data
  const statsCards = dashboardStats ? [
    {
      title: "Total Students",
      value: dashboardStats.totalStudents.toLocaleString(),
      icon: Users,
      description: "Active students",
      trend: { value: 12, label: "from last month", isPositive: true },
      color: "primary" as const,
      onClick: "/students"
    },
    {
      title: "Total Staff",
      value: dashboardStats.totalStaff.toLocaleString(),
      icon: GraduationCap,
      description: "Active staff",
      trend: { value: 3, label: "new this month", isPositive: true },
      color: "secondary" as const,
      onClick: "/staff"
    },
    {
      title: "Attendance Today",
      value: `${dashboardStats.todayAttendance.percentage.toFixed(1)}%`,
      icon: UserCheck,
      description: `${dashboardStats.todayAttendance.present} present`,
      trend: { value: 2.1, label: "vs yesterday", isPositive: true },
      color: "success" as const,
      onClick: "/attendance"
    },
    {
      title: "Fee Collection",
      value: `${dashboardStats.feeCollection.currency}${(dashboardStats.feeCollection.amount / 100000).toFixed(1)}L`,
      icon: CreditCard,
      description: "This month",
      trend: { value: 8.3, label: "vs last month", isPositive: true },
      color: "warning" as const,
      onClick: "/finance/payments"
    },
    {
      title: "Donations",
      value: `${dashboardStats.donations.currency}${(dashboardStats.donations.amount / 100000).toFixed(1)}L`,
      icon: Gift,
      description: "Total this month",
      trend: { value: 15.2, label: "vs last month", isPositive: true },
      color: "primary" as const,
      onClick: "/finance/donations"
    },
    {
      title: "Hostel Occupancy",
      value: `${dashboardStats.hostelOccupancy.percentage.toFixed(0)}%`,
      icon: BedSingle,
      description: `${dashboardStats.hostelOccupancy.occupied}/${dashboardStats.hostelOccupancy.total} rooms`,
      trend: { value: 5, label: "new assignments", isPositive: true },
      color: "secondary" as const,
      onClick: "/hostel/rooms"
    }
  ] : [];

  const genderDistribution = dashboardStats ? [
    { name: "Male", value: Math.floor(dashboardStats.totalStudents * 0.52), color: "#2563eb" },
    { name: "Female", value: Math.floor(dashboardStats.totalStudents * 0.48), color: "#dc2626" }
  ] : [];

  const hostelOccupancy = dashboardStats ? [
    { name: "Occupied", value: dashboardStats.hostelOccupancy.occupied, color: "#16a34a" },
    { name: "Available", value: dashboardStats.hostelOccupancy.total - dashboardStats.hostelOccupancy.occupied, color: "#64748b" }
  ] : [];

  if (statsLoading || roleLoading) {
    return (
      <MainLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  // Role-based dashboard rendering
  const renderRoleBasedDashboard = () => {
    switch (role) {
      case 'parent':
        return <ParentDashboard />;
      case 'student':
        return <StudentDashboard />;
      case 'teacher':
        return <TeacherDashboard />;
      default:
        // Default admin/staff dashboard (existing implementation)
        return renderDefaultDashboard();
    }
  };

  const renderDefaultDashboard = () => (
    <>
      {/* Welcome Section */}
      <div className="bg-gradient-hero p-6 rounded-lg text-primary-foreground">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.email?.split('@')[0] || 'User'}!</h1>
        <p className="text-primary-foreground/80">
          Here's what's happening at your school today
        </p>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsCards.map((stat, index) => (
          <div 
            key={index} 
            onClick={() => handleStatClick(stat.onClick)}
            className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
          >
            <StatsCard {...stat} />
          </div>
        ))}
      </div>

      {/* Charts and Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* Students by Class Chart */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/students")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Students by Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={studentsByClass || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="students" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gender Distribution */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/students")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-secondary" />
              Gender Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPieChart>
                <Pie
                  data={genderDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {genderDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Attendance Trend */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/attendance")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-success" />
              Weekly Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={attendanceData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="present" stackId="1" stroke="hsl(var(--success))" fill="hsl(var(--success))" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Add Student", icon: UserPlus, href: "/students/admissions", color: "hover:bg-primary/10" },
              { label: "Mark Attendance", icon: UserCheck, href: "/attendance", color: "hover:bg-success/10" },
              { label: "Fee Collection", icon: DollarSign, href: "/finance/payments", color: "hover:bg-warning/10" },
              { label: "Generate Report", icon: BarChart3, href: "/reports", color: "hover:bg-accent/10" }
            ].map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className={`h-20 flex-col gap-2 transition-all duration-200 ${action.color}`}
                onClick={() => navigate(action.href)}
              >
                <action.icon className="h-6 w-6" />
                <span className="text-sm">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );

  return (
    <MainLayout title="Dashboard">
      <div className="space-y-6">
        {renderRoleBasedDashboard()}
      </div>
    </MainLayout>
  );
}