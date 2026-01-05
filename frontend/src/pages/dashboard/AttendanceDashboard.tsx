/**
 * Attendance Dashboard - Overview of attendance data
 */

import { Activity, Calendar, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { useAttendanceSessions } from '@/hooks/useAttendance';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';


export default function AttendanceDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // Only load data when this component is mounted (lazy loading)
  const { sessions: attendanceSessions = [], isLoading } = useAttendanceSessions({}, false);

  // Calculate dashboard statistics
  const dashboardStats = useMemo(() => {
    const totalSessions = attendanceSessions.length;
    const todaySessions = attendanceSessions.filter(session => {
      const sessionDate = new Date(session.sessionDate);
      const today = new Date();
      return sessionDate.toDateString() === today.toDateString();
    }).length;

    // Calculate total attendance records
    const totalRecords = attendanceSessions.reduce((sum, session) => {
      return sum + (session.records?.length || 0);
    }, 0);

    // Calculate present/absent counts
    const presentCount = attendanceSessions.reduce((sum, session) => {
      return sum + (session.records?.filter(r => r.status === 'present').length || 0);
    }, 0);

    const absentCount = attendanceSessions.reduce((sum, session) => {
      return sum + (session.records?.filter(r => r.status === 'absent').length || 0);
    }, 0);

    const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;

    return {
      totalSessions,
      todaySessions,
      totalRecords,
      presentCount,
      absentCount,
      attendanceRate: Math.round(attendanceRate * 10) / 10,
    };
  }, [attendanceSessions]);

  if (isLoading) {
    return <LoadingSpinner text={t('events.loading') || 'Loading attendance data...'} />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('attendance.totalSessions') || 'Total Sessions'}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.todaySessions} {t('events.today') || 'today'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('attendance.attendanceRate') || 'Attendance Rate'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.presentCount} {t('examReports.present') || 'present'} / {dashboardStats.totalRecords} {t('events.total') || 'total'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('examReports.present') || 'Present'}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboardStats.presentCount}</div>
            <p className="text-xs text-muted-foreground">
              {t('table.students') || 'students'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('attendance.absent') || 'Absent'}
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dashboardStats.absentCount}</div>
            <p className="text-xs text-muted-foreground">
              {t('table.students') || 'students'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('attendance.recentSessions') || 'Recent Sessions'}</CardTitle>
              <CardDescription>
                {t('attendance.latestAttendanceSessions') || 'Latest attendance sessions'}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => navigate('/attendance')}>
              {t('events.viewAll') || 'View All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {attendanceSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('attendance.noSessions') || 'No attendance sessions found'}
            </div>
          ) : (
            <div className="space-y-4">
              {attendanceSessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{formatDate(session.sessionDate)}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.records?.length || 0} {t('attendance.records') || 'records'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={session.status === 'closed' ? 'secondary' : 'default'}>
                    {session.status === 'closed' ? t('attendance.closed') || 'Closed' : t('common.open') || 'Open'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

