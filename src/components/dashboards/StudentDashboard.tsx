import { 
  BookOpen,
  UserCheck, 
  Trophy,
  Calendar,
  MessageSquare,
  Clock,
  Target,
  TrendingUp,
  AlertCircle
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  LineChart, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { useNavigate } from "react-router-dom";

export function StudentDashboard() {
  const navigate = useNavigate();

  // Mock student data
  const studentInfo = {
    name: "Ahmed Khan",
    class: "Grade 5-A",
    rollNumber: "05-001",
    attendancePercentage: 92,
    currentGrade: "A",
    rank: 3,
    totalStudents: 45
  };

  const subjectPerformance = [
    { subject: "Math", grade: "A+", percentage: 95 },
    { subject: "Science", grade: "A", percentage: 88 },
    { subject: "English", grade: "A", percentage: 90 },
    { subject: "Urdu", grade: "B+", percentage: 82 },
    { subject: "Islamiyat", grade: "A+", percentage: 96 }
  ];

  const attendanceTrend = [
    { week: "Week 1", present: 5, absent: 0 },
    { week: "Week 2", present: 4, absent: 1 },
    { week: "Week 3", present: 5, absent: 0 },
    { week: "Week 4", present: 5, absent: 0 }
  ];

  const upcomingExams = [
    {
      subject: "Mathematics",
      date: "Dec 18, 2024",
      time: "9:00 AM",
      syllabus: "Chapters 1-5"
    },
    {
      subject: "Science", 
      date: "Dec 20, 2024",
      time: "11:00 AM",
      syllabus: "Physics & Chemistry"
    }
  ];

  const libraryBooks = [
    {
      title: "The Adventures of Tom Sawyer",
      dueDate: "Dec 15, 2024",
      overdue: false
    },
    {
      title: "Basic Chemistry",
      dueDate: "Dec 10, 2024", 
      overdue: true
    }
  ];

  const recentAnnouncements = [
    {
      title: "Winter Break Schedule",
      date: "Dec 12, 2024",
      priority: "high"
    },
    {
      title: "Science Fair Registration",
      date: "Dec 10, 2024",
      priority: "medium"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-hero p-6 rounded-lg text-primary-foreground">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {studentInfo.name}!</h1>
        <p className="text-primary-foreground/80">
          {studentInfo.class} • Roll Number: {studentInfo.rollNumber}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="text-center">
          <CardContent className="pt-6">
            <UserCheck className="h-8 w-8 mx-auto mb-2 text-success" />
            <p className="text-2xl font-bold">{studentInfo.attendancePercentage}%</p>
            <p className="text-sm text-muted-foreground">Attendance</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <Trophy className="h-8 w-8 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold">{studentInfo.currentGrade}</p>
            <p className="text-sm text-muted-foreground">Current Grade</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">#{studentInfo.rank}</p>
            <p className="text-sm text-muted-foreground">Class Rank</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <BookOpen className="h-8 w-8 mx-auto mb-2 text-secondary" />
            <p className="text-2xl font-bold">{libraryBooks.length}</p>
            <p className="text-sm text-muted-foreground">Library Books</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance and Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" />
              Subject Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={subjectPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Weekly Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="present" fill="hsl(var(--success))" name="Present" />
                <Bar dataKey="absent" fill="hsl(var(--destructive))" name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Subject Details */}
      <Card>
        <CardHeader>
          <CardTitle>Subject Grades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {subjectPerformance.map((subject, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span className="font-medium">{subject.subject}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Progress value={subject.percentage} className="w-24" />
                  <Badge variant={subject.grade.includes('A') ? 'default' : 'secondary'}>
                    {subject.grade}
                  </Badge>
                  <span className="text-sm font-medium w-12 text-right">{subject.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Information Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Exams */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Exams
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingExams.map((exam, index) => (
              <div key={index} className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-medium text-sm">{exam.subject}</h4>
                <p className="text-xs text-muted-foreground mt-1">{exam.date} at {exam.time}</p>
                <p className="text-xs text-muted-foreground">Syllabus: {exam.syllabus}</p>
              </div>
            ))}
            <Button variant="outline" className="w-full" size="sm">
              View All Exams
            </Button>
          </CardContent>
        </Card>

        {/* Library Books */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Library Books
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {libraryBooks.map((book, index) => (
              <div key={index} className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-medium text-sm">{book.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">Due: {book.dueDate}</p>
                  {book.overdue && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Overdue
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" size="sm">
              View Library
            </Button>
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentAnnouncements.map((announcement, index) => (
              <div key={index} className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm flex-1">{announcement.title}</h4>
                  <Badge 
                    variant={announcement.priority === 'high' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {announcement.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{announcement.date}</p>
              </div>
            ))}
            <Button variant="outline" className="w-full" size="sm">
              View All Announcements
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
              onClick={() => navigate("/student/timetable")}
            >
              <Calendar className="h-6 w-6" />
              <span className="text-sm">Timetable</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/student/results")}
            >
              <Trophy className="h-6 w-6" />
              <span className="text-sm">Results</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/library")}
            >
              <BookOpen className="h-6 w-6" />
              <span className="text-sm">Library</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/student/assignments")}
            >
              <Clock className="h-6 w-6" />
              <span className="text-sm">Assignments</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}