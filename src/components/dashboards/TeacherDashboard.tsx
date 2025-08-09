import { 
  Users, 
  GraduationCap, 
  UserCheck, 
  ClipboardList,
  Calendar,
  BookOpen,
  MessageSquare,
  Trophy,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Target
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useTeacherPortal } from "@/hooks/useTeacherPortal";

export function TeacherDashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useTeacherPortal();

  const teacherInfo = data?.teacherInfo || {
    name: "Teacher",
    subject: undefined,
    classes: [],
    totalStudents: 0
  };

  const formatTime = (t: string) =>
    new Date(`1970-01-01T${t}`).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  const todaySchedule = (data?.schedule || []).map((s) => ({
    time: `${formatTime(s.start_time)} - ${formatTime(s.end_time)}`,
    class: s.class_name,
    subject: s.subject || "Class",
    room: s.room || "",
  }));

  const classPerformance = data?.classPerformance || [];

  const attendanceOverview = data?.attendanceOverview || [
    { name: "Present", value: 0, color: "hsl(var(--success))" },
    { name: "Absent", value: 0, color: "hsl(var(--destructive))" }
  ];

  const weeklyTrend = [
    { day: "Mon", present: 0, absent: 0 },
    { day: "Tue", present: 0, absent: 0 },
    { day: "Wed", present: 0, absent: 0 },
    { day: "Thu", present: 0, absent: 0 },
    { day: "Fri", present: 0, absent: 0 }
  ];

  const pendingTasks = [
    {
      task: "Grade Assignments",
      class: teacherInfo.classes[0]?.name || "Your Class",
      due: "Today",
      priority: "high",
      count: 10
    }
  ];

  const upcomingExams = data?.upcomingExams || [];

  const recentMessages = data?.recentMessages || [];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-hero p-6 rounded-lg text-primary-foreground">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {teacherInfo.name}!</h1>
        <p className="text-primary-foreground/80">
          {teacherInfo.subject} Teacher • {teacherInfo.totalStudents} Students across {teacherInfo.classes.length} classes
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="text-center">
          <CardContent className="pt-6">
            <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{teacherInfo.totalStudents}</p>
            <p className="text-sm text-muted-foreground">Total Students</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <GraduationCap className="h-8 w-8 mx-auto mb-2 text-secondary" />
            <p className="text-2xl font-bold">{teacherInfo.classes.length}</p>
            <p className="text-sm text-muted-foreground">Classes</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold">{pendingTasks.length}</p>
            <p className="text-sm text-muted-foreground">Pending Tasks</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <UserCheck className="h-8 w-8 mx-auto mb-2 text-success" />
            <p className="text-2xl font-bold">91%</p>
            <p className="text-sm text-muted-foreground">Avg Attendance</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {todaySchedule.map((schedule, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm font-medium">{schedule.time}</p>
                  </div>
                  <div>
                    <h4 className="font-medium">{schedule.class}</h4>
                    <p className="text-sm text-muted-foreground">{schedule.subject} • {schedule.room}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Mark Attendance
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" />
              Class Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={classPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="avgGrade" fill="hsl(var(--primary))" name="Avg Grade" radius={[4,4,0,0]} />
                <Bar dataKey="attendance" fill="hsl(var(--secondary))" name="Attendance %" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-success" />
              Today's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={attendanceOverview}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {attendanceOverview.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-success rounded-full"></div>
                <span className="text-sm">Present (82)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-destructive rounded-full"></div>
                <span className="text-sm">Absent (8)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Pending Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingTasks.map((task, index) => (
              <div key={index} className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm flex-1">{task.task}</h4>
                  <Badge 
                    variant={task.priority === 'high' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {task.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{task.class}</p>
                <p className="text-xs text-muted-foreground">Due: {task.due}</p>
                {task.count > 1 && (
                  <p className="text-xs font-medium text-primary">{task.count} items</p>
                )}
              </div>
            ))}
            <Button variant="outline" className="w-full" size="sm">
              View All Tasks
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Exams */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Upcoming Exams
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingExams.map((exam, index) => (
              <div key={index} className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-medium text-sm">{exam.subject}</h4>
                <p className="text-xs text-muted-foreground mt-1">{exam.class}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">{exam.date}</p>
                  <Badge 
                    variant={exam.status === 'scheduled' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {exam.status}
                  </Badge>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" size="sm">
              Manage Exams
            </Button>
          </CardContent>
        </Card>

        {/* Recent Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Recent Messages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentMessages.map((message, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg transition-colors cursor-pointer ${
                  message.unread ? 'bg-primary/10 hover:bg-primary/20' : 'bg-muted/50 hover:bg-muted/70'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm flex-1">{message.from}</h4>
                  {message.unread && <div className="w-2 h-2 bg-primary rounded-full" />}
                </div>
                <p className="text-xs text-muted-foreground">{message.subject}</p>
                <p className="text-xs text-muted-foreground mt-1">{message.time}</p>
              </div>
            ))}
            <Button variant="outline" className="w-full" size="sm">
              View All Messages
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/attendance")}
            >
              <UserCheck className="h-6 w-6" />
              <span className="text-sm">Mark Attendance</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/exams/results")}
            >
              <Trophy className="h-6 w-6" />
              <span className="text-sm">Enter Results</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/communication/messages")}
            >
              <MessageSquare className="h-6 w-6" />
              <span className="text-sm">Send Message</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/academic/timetable")}
            >
              <Calendar className="h-6 w-6" />
              <span className="text-sm">View Timetable</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}