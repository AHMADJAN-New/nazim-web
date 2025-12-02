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
import { LoadingSpinner } from "@/components/ui/loading";

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
      color: "primary" as const,
      onClick: "/students"
    },
    {
      title: "Total Staff",
      value: dashboardStats.totalStaff.toLocaleString(),
      icon: GraduationCap,
      description: "Active staff",
      color: "secondary" as const,
      onClick: "/staff"
    },
    {
      title: "Total Classes",
      value: dashboardStats.totalClasses.toLocaleString(),
      icon: BookOpen,
      description: "Active classes",
      color: "primary" as const,
      onClick: "/classes"
    },
    {
      title: "Total Rooms",
      value: dashboardStats.totalRooms.toLocaleString(),
      icon: Building,
      description: "Available rooms",
      color: "secondary" as const,
      onClick: "/settings/buildings"
    },
    {
      title: "Total Buildings",
      value: dashboardStats.totalBuildings.toLocaleString(),
      icon: Home,
      description: "School buildings",
      color: "primary" as const,
      onClick: "/settings/buildings"
    }
  ] : [];

  const genderDistribution = dashboardStats ? [
    { name: "Male", value: dashboardStats.studentGender.male, color: "#2563eb" },
    { name: "Female", value: dashboardStats.studentGender.female, color: "#dc2626" }
  ] : [];

  if (statsLoading || roleLoading) {
    return (
      <MainLayout title="Dashboard">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gender Distribution */}
        {dashboardStats && (dashboardStats.studentGender.male > 0 || dashboardStats.studentGender.female > 0) && (
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
        )}

        {/* Students by Class Chart - Show only if data exists */}
        {studentsByClass && studentsByClass.length > 0 && (
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/students")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Students by Class
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={studentsByClass}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="class" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="students" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
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
              { label: "Students", icon: Users, href: "/students", color: "hover:bg-primary/10" },
              { label: "Staff", icon: GraduationCap, href: "/staff", color: "hover:bg-secondary/10" },
              { label: "Classes", icon: BookOpen, href: "/classes", color: "hover:bg-primary/10" },
              { label: "Buildings", icon: Building, href: "/settings/buildings", color: "hover:bg-accent/10" }
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
        {renderDashboard()}
      </div>
    </MainLayout>
  );
}