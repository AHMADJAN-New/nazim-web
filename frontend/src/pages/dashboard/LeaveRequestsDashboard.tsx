/**
 * Leave Requests Dashboard - Overview of leave requests data
 */

import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    return <LoadingSpinner text={t('events.loading') || 'Loading leave requests data...'} />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('leave.totalRequests') || 'Total Requests'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.thisMonthRequests} {t('finance.thisMonth') || 'this month'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('leave.pending') || 'Pending'}
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{dashboardStats.pending}</div>
            <p className="text-xs text-muted-foreground">
              {t('leave.awaitingApproval') || 'awaiting approval'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('status.approved') || 'Approved'}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboardStats.approved}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.approvalRate}% {t('leave.approvalRate') || 'approval rate'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('leave.rejected') || 'Rejected'}
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dashboardStats.rejected}</div>
            <p className="text-xs text-muted-foreground">
              {t('leave.requests') || 'requests'}
            </p>
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



