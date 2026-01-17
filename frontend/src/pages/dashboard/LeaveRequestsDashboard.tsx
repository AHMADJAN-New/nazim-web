/**
 * Leave Requests Dashboard - Overview of leave requests data
 */

import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, TrendingUp, ArrowUpRight } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { formatDate } from '@/lib/utils';


export default function LeaveRequestsDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // Only load data when this component is mounted (lazy loading)
  const { requests: leaveRequests = [], isLoading } = useLeaveRequests({});

  // Calculate dashboard statistics
  const dashboardStats = useMemo(() => {
    const total = leaveRequests.length;
    const pending = leaveRequests.filter(r => r.status === 'pending').length;
    const approved = leaveRequests.filter(r => r.status === 'approved').length;
    const rejected = leaveRequests.filter(r => r.status === 'rejected').length;
    
    // This month's requests
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthRequests = leaveRequests.filter(r => {
      const requestDate = new Date(r.startDate);
      return requestDate.getMonth() === currentMonth && requestDate.getFullYear() === currentYear;
    }).length;

    const approvalRate = total > 0 ? (approved / total) * 100 : 0;

    return {
      total,
      pending,
      approved,
      rejected,
      thisMonthRequests,
      approvalRate: Math.round(approvalRate * 10) / 10,
    };
  }, [leaveRequests]);

  if (isLoading) {
    return <LoadingSpinner text={t('common.loading') || 'Loading leave requests data...'} />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Requests */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
              {t('leave.totalRequests') || 'Total Requests'}
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl sm:text-3xl font-bold mb-2 text-blue-600 break-words">
              {dashboardStats.total}
            </div>
            <div className="text-xs text-muted-foreground mb-2 break-words">
              {dashboardStats.thisMonthRequests} {t('finance.thisMonth') || 'this month'}
            </div>
          </CardContent>
          <CardFooter className="pt-3 pb-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start whitespace-normal sm:whitespace-nowrap"
              onClick={() => navigate('/leave-management')}
            >
              <ArrowUpRight className="h-4 w-4 mr-1.5 flex-shrink-0" />
              <span className="text-left">{t('leave.viewRequests') || 'View Requests'}</span>
            </Button>
          </CardFooter>
        </Card>

        {/* Pending */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
              {t('leave.pending') || 'Pending'}
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10 flex-shrink-0">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl sm:text-3xl font-bold mb-2 text-amber-600 break-words">
              {dashboardStats.pending}
            </div>
            <div className="text-xs text-muted-foreground mb-2 break-words">
              {t('leave.awaitingApproval') || 'awaiting approval'}
            </div>
          </CardContent>
        </Card>

        {/* Approved */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
              {t('status.approved') || 'Approved'}
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10 flex-shrink-0">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl sm:text-3xl font-bold mb-2 text-green-600 break-words">
              {dashboardStats.approved}
            </div>
            <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
              <span className="text-green-600 dark:text-green-400 font-medium whitespace-nowrap">
                {dashboardStats.approvalRate}%
              </span>
              <span className="text-muted-foreground break-words">
                {t('leave.approvalRate') || 'approval rate'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Rejected */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
              {t('leave.rejected') || 'Rejected'}
            </CardTitle>
            <div className="p-2 rounded-lg bg-red-500/10 flex-shrink-0">
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl sm:text-3xl font-bold mb-2 text-red-600 break-words">
              {dashboardStats.rejected}
            </div>
            <div className="text-xs text-muted-foreground mb-2 break-words">
              {t('leave.requests') || 'requests'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('leave.recentRequests') || 'Recent Requests'}</CardTitle>
              <CardDescription>
                {t('leave.latestLeaveRequests') || 'Latest leave requests'}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => navigate('/leave-management')}>
              {t('events.viewAll') || 'View All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {leaveRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('leave.noRequests') || 'No leave requests found'}
            </div>
          ) : (
            <div className="space-y-4">
              {leaveRequests.slice(0, 5).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {request.student?.fullName || t('leave.student') || 'Student'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(request.startDate)} - {formatDate(request.endDate)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      request.status === 'approved'
                        ? 'default'
                        : request.status === 'rejected'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {request.status === 'pending'
                      ? t('leave.pending') || 'Pending'
                      : request.status === 'approved'
                      ? t('status.approved') || 'Approved'
                      : t('leave.rejected') || 'Rejected'}
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



