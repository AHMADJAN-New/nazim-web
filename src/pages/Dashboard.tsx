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
  CheckCircle
} from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// Mock data - in real app, this would come from APIs
const dashboardStats = [
  {
    title: "Total Students",
    value: "2,847",
    icon: Users,
    description: "Active students",
    trend: { value: 12, label: "from last month", isPositive: true },
    color: "primary" as const
  },
  {
    title: "Total Teachers",
    value: "142",
    icon: GraduationCap,
    description: "Active staff",
    trend: { value: 3, label: "new this month", isPositive: true },
    color: "secondary" as const
  },
  {
    title: "Attendance Today",
    value: "94.2%",
    icon: UserCheck,
    description: "2,683 present",
    trend: { value: 2.1, label: "vs yesterday", isPositive: true },
    color: "success" as const
  },
  {
    title: "Fee Collection",
    value: "₹12.4L",
    icon: CreditCard,
    description: "This month",
    trend: { value: 8.3, label: "vs last month", isPositive: true },
    color: "warning" as const
  }
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardStats.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Recent Activities */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
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
              <Button variant="outline" className="w-full" size="sm">
                View All Activities
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
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
              <Button variant="outline" className="w-full" size="sm">
                View Calendar
              </Button>
            </CardContent>
          </Card>

          {/* Class Performance */}
          <Card className="lg:col-span-2 xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Class Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {classPerformance.map((cls, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{cls.class}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {cls.students} students
                      </span>
                      <Badge 
                        variant={cls.trend > 0 ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {cls.trend > 0 ? "+" : ""}{cls.trend}%
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Average Score</span>
                      <span className="font-medium">{cls.average}%</span>
                    </div>
                    <Progress 
                      value={cls.average} 
                      className="h-2"
                    />
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full" size="sm">
                View Detailed Reports
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { label: "Add Student", icon: Users, href: "/students/admissions" },
                { label: "Mark Attendance", icon: UserCheck, href: "/attendance" },
                { label: "Generate Report", icon: BookOpen, href: "/reports" },
                { label: "Fee Collection", icon: CreditCard, href: "/finance/fees" },
                { label: "Send Notice", icon: Bell, href: "/communication/announcements" },
                { label: "Manage Classes", icon: Building, href: "/academic/classes" }
              ].map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-20 flex-col gap-2 hover:bg-primary/5"
                  asChild
                >
                  <a href={action.href}>
                    <action.icon className="h-6 w-6" />
                    <span className="text-xs text-center">{action.label}</span>
                  </a>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}