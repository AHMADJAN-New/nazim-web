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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getISOWeek, parseISO, format } from "date-fns";

export function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentInfo, setStudentInfo] = useState<{
    name: string;
    class: string;
    rollNumber: string;
    attendancePercentage?: number;
    currentGrade?: string;
    rank?: number | null;
    totalStudents?: number | null;
  } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [subjectPerformance, setSubjectPerformance] = useState<{
    subject: string;
    grade: string;
    percentage: number;
  }[]>([]);
  const [gradesLoading, setGradesLoading] = useState(true);
  const [gradesError, setGradesError] = useState<string | null>(null);

  const [attendanceTrend, setAttendanceTrend] = useState<{
    week: string;
    present: number;
    absent: number;
  }[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const [recentAnnouncements, setRecentAnnouncements] = useState<{
    title: string;
    date: string;
    priority: string;
  }[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);

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

  const calculateGrade = (percentage: number) => {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    return "D";
  };

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from("students")
        .select(`
          id,
          student_id,
          classes (name, section),
          profiles:user_id (full_name)
        `)
        .eq("user_id", user.id)
        .single();

      if (error) {
        setProfileError(error.message);
      } else if (data) {
        setStudentId(data.id);
        const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
        const cls = Array.isArray(data.classes) ? data.classes[0] : data.classes;
        setStudentInfo({
          name: profile?.full_name || "",
          class: `${cls?.name || ""}${cls?.section ? `-${cls.section}` : ""}`,
          rollNumber: data.student_id,
        });
      }
      setProfileLoading(false);
    };

    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!studentId) return;

    const fetchGrades = async () => {
      setGradesLoading(true);
      const { data, error } = await supabase
        .from("exam_results")
        .select(`
          grade,
          percentage,
          exam:exams!exam_id (
            subject:subjects!subject_id (name)
          )
        `)
        .eq("student_id", studentId);

      if (error) {
        setGradesError(error.message);
      } else if (data) {
        const performance = data.map((r: any) => ({
          subject: r.exam?.subject?.name || "",
          grade: r.grade || "",
          percentage: r.percentage || 0,
        }));
        setSubjectPerformance(performance);
        if (performance.length) {
          const avg =
            performance.reduce((sum, p) => sum + p.percentage, 0) /
            performance.length;
          setStudentInfo((info) =>
            info ? { ...info, currentGrade: calculateGrade(avg) } : info
          );
        }
      }
      setGradesLoading(false);
    };

    const fetchAttendance = async () => {
      setAttendanceLoading(true);
      const { data, error } = await supabase
        .from("attendance")
        .select("date,status")
        .eq("student_id", studentId);

      if (error) {
        setAttendanceError(error.message);
      } else if (data) {
        const total = data.length;
        const present = data.filter((r: any) => r.status === "present").length;
        const percentage = total ? Math.round((present / total) * 100) : 0;
        setStudentInfo((info) =>
          info ? { ...info, attendancePercentage: percentage } : info
        );

        const weekMap = new Map<string, { present: number; absent: number }>();
        data.forEach((r: any) => {
          const week = `Week ${getISOWeek(parseISO(r.date))}`;
          const entry = weekMap.get(week) || { present: 0, absent: 0 };
          if (r.status === "present") entry.present += 1;
          else entry.absent += 1;
          weekMap.set(week, entry);
        });
        setAttendanceTrend(
          Array.from(weekMap.entries()).map(([week, v]) => ({
            week,
            present: v.present,
            absent: v.absent,
          }))
        );
      }
      setAttendanceLoading(false);
    };

    fetchGrades();
    fetchAttendance();
  }, [studentId]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setAnnouncementsLoading(true);
      const { data, error } = await supabase
        .from("communications")
        .select("title,published_date,priority")
        .contains("target_audience", ["Students"])
        .order("published_date", { ascending: false })
        .limit(5);

      if (error) {
        setAnnouncementsError(error.message);
      } else if (data) {
        setRecentAnnouncements(
          data.map((a: any) => ({
            title: a.title,
            date: a.published_date
              ? format(parseISO(a.published_date), "MMM d, yyyy")
              : "",
            priority: a.priority || "normal",
          }))
        );
      }
      setAnnouncementsLoading(false);
    };

    fetchAnnouncements();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-hero p-6 rounded-lg text-primary-foreground">
        {profileLoading ? (
          <p>Loading profile...</p>
        ) : profileError ? (
          <p className="text-destructive">{profileError}</p>
        ) : studentInfo ? (
          <>
            <h1 className="text-2xl font-bold mb-2">Welcome back, {studentInfo.name}!</h1>
            <p className="text-primary-foreground/80">
              {studentInfo.class} • Roll Number: {studentInfo.rollNumber}
            </p>
          </>
        ) : null}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="text-center">
          <CardContent className="pt-6">
            {profileLoading ? (
              <p>Loading...</p>
            ) : profileError ? (
              <p className="text-destructive">Error</p>
            ) : (
              <>
                <UserCheck className="h-8 w-8 mx-auto mb-2 text-success" />
                <p className="text-2xl font-bold">{studentInfo?.attendancePercentage ?? 0}%</p>
                <p className="text-sm text-muted-foreground">Attendance</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            {gradesLoading ? (
              <p>Loading...</p>
            ) : gradesError ? (
              <p className="text-destructive">Error</p>
            ) : (
              <>
                <Trophy className="h-8 w-8 mx-auto mb-2 text-warning" />
                <p className="text-2xl font-bold">{studentInfo?.currentGrade || "-"}</p>
                <p className="text-sm text-muted-foreground">Current Grade</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            {profileLoading ? (
              <p>Loading...</p>
            ) : profileError ? (
              <p className="text-destructive">Error</p>
            ) : (
              <>
                <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">#{studentInfo?.rank ?? 0}</p>
                <p className="text-sm text-muted-foreground">Class Rank</p>
              </>
            )}
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
            {gradesLoading ? (
              <p>Loading grades...</p>
            ) : gradesError ? (
              <p className="text-destructive">{gradesError}</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={subjectPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
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
            {attendanceLoading ? (
              <p>Loading attendance...</p>
            ) : attendanceError ? (
              <p className="text-destructive">{attendanceError}</p>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subject Details */}
      <Card>
        <CardHeader>
          <CardTitle>Subject Grades</CardTitle>
        </CardHeader>
        <CardContent>
          {gradesLoading ? (
            <p>Loading grades...</p>
          ) : gradesError ? (
            <p className="text-destructive">{gradesError}</p>
          ) : (
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
          )}
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
            {announcementsLoading ? (
              <p>Loading announcements...</p>
            ) : announcementsError ? (
              <p className="text-destructive">{announcementsError}</p>
            ) : (
              recentAnnouncements.map((announcement, index) => (
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
              ))
            )}
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