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

// Mock data - in real app, this would come from APIs
const dashboardStats = [
  {
    title: "Total Students",
    value: "2,847",
    icon: Users,
    description: "Active students",
    trend: { value: 12, label: "from last month", isPositive: true },
    color: "primary" as const,
    onClick: "/students"
  },
  {
    title: "Total Teachers",
    value: "142",
    icon: GraduationCap,
    description: "Active staff",
    trend: { value: 3, label: "new this month", isPositive: true },
    color: "secondary" as const,
    onClick: "/staff"
  },
  {
    title: "Attendance Today",
    value: "94.2%",
    icon: UserCheck,
    description: "2,683 present",
    trend: { value: 2.1, label: "vs yesterday", isPositive: true },
    color: "success" as const,
    onClick: "/attendance"
  },
  {
    title: "Fee Collection",
    value: "₹12.4L",
    icon: CreditCard,
    description: "This month",
    trend: { value: 8.3, label: "vs last month", isPositive: true },
    color: "warning" as const,
    onClick: "/finance/payments"
  },
  {
    title: "Donations",
    value: "₹3.2L",
    icon: Gift,
    description: "Total this month",
    trend: { value: 15.2, label: "vs last month", isPositive: true },
    color: "primary" as const,
    onClick: "/finance/donations"
  },
  {
    title: "Hostel Occupancy",
    value: "87%",
    icon: BedSingle,
    description: "348/400 beds",
    trend: { value: 5, label: "new assignments", isPositive: true },
    color: "secondary" as const,
    onClick: "/hostel/rooms"
  }
];

// Additional data for charts
const studentsByClass = [
  { class: "Class 10", students: 245, male: 128, female: 117 },
  { class: "Class 9", students: 238, male: 125, female: 113 },
  { class: "Class 8", students: 252, male: 132, female: 120 },
  { class: "Class 7", students: 234, male: 119, female: 115 },
  { class: "Class 6", students: 241, male: 126, female: 115 },
  { class: "Class 5", students: 228, male: 118, female: 110 }
];

const attendanceData = [
  { day: "Mon", present: 94, absent: 6 },
  { day: "Tue", present: 96, absent: 4 },
  { day: "Wed", present: 92, absent: 8 },
  { day: "Thu", present: 95, absent: 5 },
  { day: "Fri", present: 89, absent: 11 },
  { day: "Sat", present: 87, absent: 13 },
  { day: "Sun", present: 0, absent: 0 }
];

const feeCollectionData = [
  { month: "Aug", collected: 8.5, pending: 2.1 },
  { month: "Sep", collected: 9.2, pending: 1.8 },
  { month: "Oct", collected: 10.1, pending: 1.5 },
  { month: "Nov", collected: 11.3, pending: 1.2 },
  { month: "Dec", collected: 12.4, pending: 0.9 }
];

const genderDistribution = [
  { name: "Male", value: 1485, color: "#2563eb" },
  { name: "Female", value: 1362, color: "#dc2626" }
];

const donationData = [
  { month: "Aug", amount: 1.2 },
  { month: "Sep", amount: 1.8 },
  { month: "Oct", amount: 2.1 },
  { month: "Nov", amount: 2.7 },
  { month: "Dec", amount: 3.2 }
];

const hostelOccupancy = [
  { name: "Occupied", value: 348, color: "#16a34a" },
  { name: "Available", value: 52, color: "#64748b" }
];

const upcomingExams = [
  { subject: "Mathematics", date: "2024-01-25", enrolled: 245 },
  { subject: "Science", date: "2024-01-27", enrolled: 238 },
  { subject: "English", date: "2024-01-30", enrolled: 252 },
  { subject: "Urdu", date: "2024-02-02", enrolled: 234 }
];

const recentActivities = [
  {
    id: 1,
    title: "New student admission",
    description: "Ahmed Ali has been admitted to Class 10-A",
    time: "2 minutes ago",
    type: "admission",
    icon: Users
  },
  {
    id: 2,
    title: "Fee payment received",
    description: "₹15,000 received from Muhammad Khan (Class 9-B)",
    time: "15 minutes ago",
    type: "payment",
    icon: CreditCard
  },
  {
    id: 3,
    title: "Exam results published",
    description: "Mid-term exam results for Class 8 are now available",
    time: "1 hour ago",
    type: "exam",
    icon: Trophy
  },
  {
    id: 4,
    title: "Staff meeting scheduled",
    description: "Monthly staff meeting scheduled for tomorrow at 10 AM",
    time: "2 hours ago",
    type: "meeting",
    icon: Calendar
  }
];

const upcomingEvents = [
  {
    id: 1,
    title: "Annual Sports Day",
    date: "2024-01-20",
    time: "9:00 AM",
    type: "event",
    status: "confirmed"
  },
  {
    id: 2,
    title: "Parent-Teacher Meeting",
    date: "2024-01-18",
    time: "2:00 PM", 
    type: "meeting",
    status: "pending"
  },
  {
    id: 3,
    title: "Final Exams Begin",
    date: "2024-01-25",
    time: "10:00 AM",
    type: "exam",
    status: "confirmed"
  }
];

const classPerformance = [
  { class: "Class 10-A", average: 87, students: 45, trend: 3.2 },
  { class: "Class 10-B", average: 84, students: 42, trend: -1.1 },
  { class: "Class 9-A", average: 91, students: 48, trend: 5.7 },
  { class: "Class 9-B", average: 78, students: 44, trend: 2.3 },
  { class: "Class 8-A", average: 82, students: 46, trend: 1.8 }
];

export default function Dashboard() {
  const navigate = useNavigate();

  const handleStatClick = (path: string) => {
    navigate(path);
  };

  return (
    <MainLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-hero p-6 rounded-lg text-primary-foreground">
          <h1 className="text-2xl font-bold mb-2">Welcome back, Ahmed Khan!</h1>
          <p className="text-primary-foreground/80">
            Here's what's happening at your school today
          </p>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardStats.map((stat, index) => (
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
                <AreaChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="present" stackId="1" stroke="hsl(var(--success))" fill="hsl(var(--success))" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Fee Collection Trend */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/finance/payments")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-warning" />
                Fee Collection (₹L)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={feeCollectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="collected" stroke="hsl(var(--warning))" strokeWidth={3} />
                  <Line type="monotone" dataKey="pending" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Donations Trend */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/finance/donations")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Monthly Donations (₹L)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={donationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Hostel Occupancy */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/hostel/rooms")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BedSingle className="h-5 w-5 text-secondary" />
                Hostel Occupancy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPieChart>
                  <Pie
                    data={hostelOccupancy}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {hostelOccupancy.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Information Widgets Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          
          {/* Recent Activities */}
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivities.slice(0, 4).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="p-2 rounded-full bg-primary/10">
                    <activity.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground">
                      {activity.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
              <Button 
                variant="outline" 
                className="w-full" 
                size="sm"
                onClick={() => navigate("/communication/announcements")}
              >
                View All Activities
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer">
                  <div>
                    <h4 className="text-sm font-medium text-foreground">
                      {event.title}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {event.date} at {event.time}
                    </p>
                  </div>
                  <Badge 
                    variant={event.status === 'confirmed' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {event.status === 'confirmed' ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <AlertCircle className="h-3 w-3 mr-1" />
                    )}
                    {event.status}
                  </Badge>
                </div>
              ))}
              <Button 
                variant="outline" 
                className="w-full" 
                size="sm"
                onClick={() => navigate("/communication/events")}
              >
                View Calendar
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Exams */}
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Upcoming Exams
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingExams.map((exam, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer">
                  <div>
                    <h4 className="text-sm font-medium text-foreground">
                      {exam.subject}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {exam.date}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {exam.enrolled} enrolled
                  </Badge>
                </div>
              ))}
              <Button 
                variant="outline" 
                className="w-full" 
                size="sm"
                onClick={() => navigate("/exams")}
              >
                Manage Exams
              </Button>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium">Parent Meeting</h4>
                    <p className="text-xs text-muted-foreground">Request for meeting about...</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                    <GraduationCap className="h-4 w-4 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium">Teacher Query</h4>
                    <p className="text-xs text-muted-foreground">Question about exam schedule...</p>
                    <p className="text-xs text-muted-foreground">5 hours ago</p>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full" 
                size="sm"
                onClick={() => navigate("/communication/messaging")}
              >
                View All Messages
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {[
                { label: "Add Student", icon: UserPlus, href: "/students/admissions", color: "hover:bg-primary/10 hover:border-primary/20" },
                { label: "Bulk Import", icon: FileText, href: "/students/bulk-import", color: "hover:bg-secondary/10 hover:border-secondary/20" },
                { label: "Mark Attendance", icon: UserCheck, href: "/attendance", color: "hover:bg-success/10 hover:border-success/20" },
                { label: "Fee Collection", icon: DollarSign, href: "/finance/payments", color: "hover:bg-warning/10 hover:border-warning/20" },
                { label: "Generate Report", icon: BarChart3, href: "/reports", color: "hover:bg-accent/10 hover:border-accent/20" },
                { label: "Send Notice", icon: Bell, href: "/communication/announcements", color: "hover:bg-primary/10 hover:border-primary/20" },
                { label: "Assign Rooms", icon: Home, href: "/hostel/student-assignment", color: "hover:bg-secondary/10 hover:border-secondary/20" },
                { label: "Manage Events", icon: CalendarDays, href: "/communication/events", color: "hover:bg-success/10 hover:border-success/20" }
              ].map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className={`h-24 flex-col gap-2 transition-all duration-200 ${action.color}`}
                  onClick={() => navigate(action.href)}
                >
                  <action.icon className="h-6 w-6" />
                  <span className="text-xs text-center leading-tight">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}