import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  AlertTriangle,
  XCircle,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/hooks/useLanguage';
import { useSubscriptionStatus } from '@/hooks/useSubscription';
import { formatDate } from '@/lib/utils';


const STATUS_CONFIG = {
  trial: {
    icon: Zap,
    color: 'bg-blue-500',
    badgeVariant: 'default' as const,
    label: 'Trial',
  },
  active: {
    icon: CheckCircle2,
    color: 'bg-green-500',
    badgeVariant: 'default' as const,
    label: 'Active',
  },
  pending_renewal: {
    icon: Clock,
    color: 'bg-yellow-500',
    badgeVariant: 'secondary' as const,
    label: 'Pending Renewal',
  },
  grace_period: {
    icon: AlertCircle,
    color: 'bg-orange-500',
    badgeVariant: 'secondary' as const,
    label: 'Grace Period',
  },
  readonly: {
    icon: AlertTriangle,
    color: 'bg-red-400',
    badgeVariant: 'destructive' as const,
    label: 'Read Only',
  },
  expired: {
    icon: XCircle,
    color: 'bg-red-500',
    badgeVariant: 'destructive' as const,
    label: 'Expired',
  },
  suspended: {
    icon: XCircle,
    color: 'bg-gray-500',
    badgeVariant: 'destructive' as const,
    label: 'Suspended',
  },
  cancelled: {
    icon: XCircle,
    color: 'bg-gray-500',
    badgeVariant: 'secondary' as const,
    label: 'Cancelled',
  },
};

export function SubscriptionStatusCard() {
  const { data: status, isLoading } = useSubscriptionStatus();
  const { t: _t, isRTL: _isRTL } = useLanguage();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No subscription found</p>
          <Button asChild className="mt-4">
            <Link to="/subscription/plans">View Plans</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const config = STATUS_CONFIG[status.status];
  const StatusIcon = config.icon;

  const showWarning = ['pending_renewal', 'grace_period', 'readonly', 'expired'].includes(status.status);
  const showTrialDays = status.isTrial && status.trialDaysLeft !== null;

  return (
    <Card className={showWarning ? 'border-destructive' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
          <Badge variant={config.badgeVariant}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>
        <CardDescription>{status.message}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan Info */}
        {status.plan && (
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            <span className="font-medium">{status.plan.name}</span>
          </div>
        )}

        {/* Trial Days Progress */}
        {showTrialDays && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Trial Period</span>
              <span className="font-medium">{status.trialDaysLeft} days left</span>
            </div>
            <Progress 
              value={((7 - (status.trialDaysLeft || 0)) / 7) * 100} 
              className="h-2"
            />
          </div>
        )}

        {/* Expiry Info */}
        {status.expiresAt && !status.isTrial && (
          <div className="flex justify-between text-sm">
            <span>Expires</span>
            <span className={status.daysLeft !== null && status.daysLeft < 30 ? 'text-destructive font-medium' : ''}>
              {formatDate(status.expiresAt)}
              {status.daysLeft !== null && ` (${status.daysLeft} days)`}
            </span>
          </div>
        )}

        {/* Grace/Readonly Period Info */}
        {status.gracePeriodEndsAt && status.status === 'grace_period' && (
          <div className="flex justify-between text-sm text-orange-600">
            <span>Grace Period Ends</span>
            <span>{formatDate(status.gracePeriodEndsAt)}</span>
          </div>
        )}

        {status.readonlyPeriodEndsAt && status.status === 'readonly' && (
          <div className="flex justify-between text-sm text-red-600">
            <span>Account Blocks On</span>
            <span>{formatDate(status.readonlyPeriodEndsAt)}</span>
          </div>
        )}

        {/* Schools Info */}
        {status.totalSchoolsAllowed > 1 && (
          <div className="flex justify-between text-sm">
            <span>Schools</span>
            <span>{status.additionalSchools + 1} / {status.totalSchoolsAllowed}</span>
          </div>
        )}

        {/* Access Level Warning */}
        {!status.canWrite && status.canRead && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
            <AlertTriangle className="h-4 w-4 inline mr-2" />
            Your account is in read-only mode. Renew to restore full access.
          </div>
        )}

        {!status.canRead && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
            <XCircle className="h-4 w-4 inline mr-2" />
            Your account access has been blocked. Please renew your subscription.
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {showWarning && (
            <Button asChild className="flex-1">
              <Link to="/subscription/renew">Renew Now</Link>
            </Button>
          )}
          {status.isTrial && (
            <Button asChild className="flex-1">
              <Link to="/subscription/plans">Upgrade</Link>
            </Button>
          )}
          <Button variant="outline" asChild className="flex-1">
            <Link to="/subscription">Manage</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
