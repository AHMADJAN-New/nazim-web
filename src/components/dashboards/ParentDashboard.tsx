import { 
  Users, 
  GraduationCap, 
  UserCheck, 
  CreditCard,
  Calendar,
  BookOpen,
  MessageSquare,
  Trophy,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp
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
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useParentPortal } from "@/hooks/useParentPortal";

export function ParentDashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useParentPortal();

  const children = data?.children || [];

  const attendanceTrend = data?.attendanceTrend || [
    { week: "Week 1", attendance: 0 },
    { week: "Week 2", attendance: 0 },
    { week: "Week 3", attendance: 0 },
    { week: "Week 4", attendance: 0 }
  ];

  const feeBreakdown = [
    { name: "Tuition", amount: Math.max(10000, children.reduce((s, c) => s + (c.pendingFees || 0), 0)), color: "hsl(var(--primary))" },
    { name: "Transport", amount: 3000, color: "hsl(var(--secondary))" },
    { name: "Activities", amount: 2000, color: "hsl(var(--accent))" }
  ];

  const upcomingEvents = data?.upcomingEvents || [];

  const recentMessages = data?.recentMessages || [];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-hero p-6 rounded-lg text-primary-foreground">
        <h1 className="text-2xl font-bold mb-2">Welcome, Parent!</h1>
        <p className="text-primary-foreground/80">
          Stay updated with your children's academic progress and school activities
        </p>
      </div>

      {/* Children Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {children.map((child) => (
          <Card key={child.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-4">
                <img 
                  src={child.profilePhoto} 
                  alt={child.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold text-lg">{child.name}</h3>
                  <p className="text-sm text-muted-foreground">{child.class} • Roll #{child.rollNumber}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <UserCheck className="h-5 w-5 mx-auto mb-1 text-success" />
                  <p className="text-sm font-medium">{child.attendancePercentage}%</p>
                  <p className="text-xs text-muted-foreground">Attendance</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Trophy className="h-5 w-5 mx-auto mb-1 text-warning" />
                  <p className="text-sm font-medium">{child.recentGrade}</p>
                  <p className="text-xs text-muted-foreground">Last Grade</p>
                </div>
              </div>
              
              {child.pendingFees > 0 && (
                <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium">Pending Fees</span>
                  </div>
                  <span className="text-sm font-semibold text-destructive">₹{child.pendingFees.toLocaleString()}</span>
                </div>
              )}
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate(`/parent/child/${child.id}`)}
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Attendance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="attendance" stroke="hsl(var(--primary))" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fee Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-secondary" />
              Fee Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={feeBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="amount"
                >
                  {feeBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Information Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingEvents.map((event, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <h4 className="text-sm font-medium">{event.title}</h4>
                  <p className="text-xs text-muted-foreground">{event.date} at {event.time}</p>
                </div>
                <Badge variant="outline">
                  {event.type}
                </Badge>
              </div>
            ))}
            <Button variant="outline" className="w-full" size="sm">
              View Calendar
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
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                  message.unread ? 'bg-primary/10 hover:bg-primary/20' : 'bg-muted/50 hover:bg-muted/70'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">{message.from}</h4>
                    {message.unread && <div className="w-2 h-2 bg-primary rounded-full" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">{message.subject}</p>
                  <p className="text-xs text-muted-foreground mt-1">{message.time}</p>
                </div>
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
              onClick={() => navigate("/parent/attendance")}
            >
              <UserCheck className="h-6 w-6" />
              <span className="text-sm">Attendance</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/parent/fees")}
            >
              <CreditCard className="h-6 w-6" />
              <span className="text-sm">Fee Payment</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/parent/results")}
            >
              <Trophy className="h-6 w-6" />
              <span className="text-sm">Results</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/parent/messages")}
            >
              <MessageSquare className="h-6 w-6" />
              <span className="text-sm">Messages</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}