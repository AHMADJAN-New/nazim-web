/**
 * Attendance Dashboard - Overview of attendance data
 */

import { Activity, Calendar, CheckCircle2, XCircle, Clock, TrendingUp, ArrowUpRight } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Sessions */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
              {t('attendance.totalSessions') || 'Total Sessions'}
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl sm:text-3xl font-bold mb-2 text-blue-600 break-words">
              {dashboardStats.totalSessions}
            </div>
            <div className="text-xs text-muted-foreground mb-2 break-words">
              {dashboardStats.todaySessions} {t('events.today') || 'today'}
            </div>
          </CardContent>
          <CardFooter className="pt-3 pb-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start whitespace-normal sm:whitespace-nowrap"
              onClick={() => navigate('/attendance')}
            >
              <ArrowUpRight className="h-4 w-4 mr-1.5 flex-shrink-0" />
              <span className="text-left">{t('attendance.viewSessions') || 'View Sessions'}</span>
            </Button>
          </CardFooter>
        </Card>

        {/* Attendance Rate */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
              {t('attendance.attendanceRate') || 'Attendance Rate'}
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10 flex-shrink-0">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl sm:text-3xl font-bold mb-2 text-green-600 break-words">
              {dashboardStats.attendanceRate}%
            </div>
            <div className="text-xs text-muted-foreground mb-2 break-words">
              {dashboardStats.presentCount} {t('examReports.present') || 'present'} / {dashboardStats.totalRecords} {t('events.total') || 'total'}
            </div>
          </CardContent>
        </Card>

        {/* Present */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
              {t('examReports.present') || 'Present'}
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10 flex-shrink-0">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl sm:text-3xl font-bold mb-2 text-green-600 break-words">
              {dashboardStats.presentCount}
            </div>
            <div className="text-xs text-muted-foreground mb-2 break-words">
              {t('table.students') || 'students'}
            </div>
          </CardContent>
        </Card>

        {/* Absent */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
              {t('attendance.absent') || 'Absent'}
            </CardTitle>
            <div className="p-2 rounded-lg bg-red-500/10 flex-shrink-0">
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl sm:text-3xl font-bold mb-2 text-red-600 break-words">
              {dashboardStats.absentCount}
            </div>
            <div className="text-xs text-muted-foreground mb-2 break-words">
              {t('table.students') || 'students'}
            </div>
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

