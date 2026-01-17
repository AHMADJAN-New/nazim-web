/**
 * Attendance Dashboard - Overview of attendance data
 */

import { Activity, Calendar, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react';
import { useEffect, useMemo } from 'react';
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
  
  // Limit to last 30 days for dashboard performance
  const dateTo = new Date().toISOString().split('T')[0];
  const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Use pagination with larger page size for dashboard (100 sessions for better stats)
  const { sessions: attendanceSessions = [], isLoading, pageSize, setPageSize } = useAttendanceSessions(
    { dateFrom, dateTo },
    true // Use pagination
  );

  // Set larger page size on mount for dashboard (load more sessions for accurate stats)
  useEffect(() => {
    if (pageSize < 100) {
      setPageSize(100);
    }
  }, [pageSize, setPageSize]);

  // Calculate dashboard statistics - optimized computation
  // Note: Records are not included in the sessions list API response for performance
  // So we only calculate session-level stats here
  const dashboardStats = useMemo(() => {
    if (!attendanceSessions || attendanceSessions.length === 0) {
      return {
        totalSessions: 0,
        todaySessions: 0,
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        attendanceRate: 0,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalSessions = 0;
    let todaySessions = 0;

    // Single pass through sessions for better performance
    // Note: Records are not included in list response, so we can't calculate record-level stats
    for (const session of attendanceSessions) {
      totalSessions++;
      
      const sessionDate = new Date(session.sessionDate);
      sessionDate.setHours(0, 0, 0, 0);
      if (sessionDate.getTime() === today.getTime()) {
        todaySessions++;
      }
    }

    // Records are not available in list response, so we show 0
    // To get accurate record stats, we'd need to fetch individual sessions with records
    // For dashboard performance, we skip this and only show session counts
    return {
      totalSessions,
      todaySessions,
      totalRecords: 0, // Not available in list response
      presentCount: 0, // Not available in list response
      absentCount: 0, // Not available in list response
      attendanceRate: 0, // Not available in list response
    };
  }, [attendanceSessions]);

  if (isLoading) {
    return <LoadingSpinner text={t('common.loading') || 'Loading attendance data...'} />;
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
                        {session.className || t('attendance.session') || 'Session'}
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

