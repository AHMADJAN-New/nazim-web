import { 
  AlertTriangle, 
  Clock, 
  Lock, 
  AlertOctagon, 
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/hooks/useLanguage';
import { useSubscriptionStatus, useUsage } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

interface SubscriptionStatusBannerProps {
  className?: string;
  showUsageWarnings?: boolean;
  onDismiss?: () => void;
  compact?: boolean;
}

export function SubscriptionStatusBanner({
  className,
  showUsageWarnings = true,
  onDismiss,
  compact = false,
}: SubscriptionStatusBannerProps) {
  const { t, isRTL } = useLanguage();
  const { data: status, isLoading: statusLoading } = useSubscriptionStatus();
  const { data: usageData, isLoading: usageLoading } = useUsage();

  // Don't show anything while loading
  if (statusLoading || usageLoading) {
    return null;
  }

  // No subscription info available
  if (!status) {
    return null;
  }

  // Get status-specific banner configuration
  const getBannerConfig = () => {
    switch (status.status) {
      case 'trial':
        return {
          variant: 'default' as const,
          icon: Sparkles,
          title: t('subscription.trialPeriod') || 'Trial Period',
          message: status.trialDaysLeft !== undefined && status.trialDaysLeft > 0
            ? `${t('subscription.trialEndsIn') || 'Trial ends in'} ${status.trialDaysLeft} ${t('events.days') || 'days'}. ${t('subscription.upgradeToKeepAccess') || 'Upgrade to keep full access.'}`
            : t('subscription.trialEnding') || 'Your trial is ending soon. Upgrade to continue.',
          urgency: status.trialDaysLeft !== undefined && status.trialDaysLeft <= 3 ? 'high' : 'low',
          showUpgrade: true,
          bgClass: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
          textClass: 'text-blue-700 dark:text-blue-300',
          iconClass: 'text-blue-500',
        };
      
      case 'grace_period':
        return {
          variant: 'warning' as const,
          icon: Clock,
          title: t('subscription.gracePeriod') || 'Grace Period',
          message: status.daysLeft !== undefined && status.daysLeft > 0
            ? `${t('subscription.subscriptionExpired') || 'Your subscription has expired.'} ${status.daysLeft} ${t('subscription.daysLeftToRenew') || 'days left to renew.'}`
            : t('subscription.renewNow') || 'Renew now to continue full access.',
          urgency: status.daysLeft !== undefined && status.daysLeft <= 7 ? 'high' : 'medium',
          showUpgrade: true,
          bgClass: 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800',
          textClass: 'text-amber-700 dark:text-amber-300',
          iconClass: 'text-amber-500',
        };
      
      case 'readonly':
        return {
          variant: 'destructive' as const,
          icon: Lock,
          title: t('subscription.readOnlyMode') || 'Read-Only Mode',
          message: t('subscription.cannotMakeChanges') || 'You can view data but cannot make changes. Renew your subscription to restore full access.',
          urgency: 'high',
          showUpgrade: true,
          bgClass: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
          textClass: 'text-red-700 dark:text-red-300',
          iconClass: 'text-red-500',
        };
      
      case 'blocked':
        return {
          variant: 'destructive' as const,
          icon: AlertOctagon,
          title: t('subscription.accountBlocked') || 'Account Blocked',
          message: t('footer.contactSupport') || 'Your account access has been blocked. Please contact support or renew your subscription.',
          urgency: 'critical',
          showUpgrade: true,
          bgClass: 'bg-red-100 border-red-300 dark:bg-red-950 dark:border-red-700',
          textClass: 'text-red-800 dark:text-red-200',
          iconClass: 'text-red-600',
        };
      
      case 'active':
      default:
        // Only show if there are usage warnings
        if (showUsageWarnings && usageData?.warnings && usageData.warnings.length > 0) {
          return {
            variant: 'warning' as const,
            icon: AlertTriangle,
            title: t('subscription.usageLimitsWarning') || 'Usage Limits Warning',
            message: t('subscription.approachingLimits') || 'You are approaching some usage limits.',
            urgency: 'medium',
            showUpgrade: true,
            bgClass: 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800',
            textClass: 'text-amber-700 dark:text-amber-300',
            iconClass: 'text-amber-500',
          };
        }
        return null;
    }
  };

  const config = getBannerConfig();

  // No banner needed
  if (!config) {
    return null;
  }

  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-2 px-3 py-2 rounded-lg border',
          config.bgClass,
          className
        )}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', config.iconClass)} />
          <span className={cn('text-sm font-medium', config.textClass)}>
            {config.title}
          </span>
          <span className={cn('text-sm', config.textClass, 'opacity-80')}>
            {config.message}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {config.showUpgrade && (
            <Link to="/subscription">
              <Button variant="outline" size="sm" className="h-7 text-xs">
                {t('subscription.manageSubscription') || 'Manage'}
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Alert
      className={cn(config.bgClass, 'border', className)}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <Icon className={cn('h-5 w-5', config.iconClass)} />
      <div className="flex-1">
        <AlertTitle className={cn('font-semibold', config.textClass)}>
          {config.title}
        </AlertTitle>
        <AlertDescription className={cn('mt-1', config.textClass, 'opacity-90')}>
          {config.message}
        </AlertDescription>

        {/* Show usage warnings if any */}
        {showUsageWarnings && usageData?.warnings && usageData.warnings.length > 0 && (
          <div className="mt-3 space-y-2">
            {usageData.warnings.slice(0, 3).map((warning) => (
              <div key={warning.resourceKey} className="flex items-center gap-2">
                <span className={cn('text-sm', config.textClass)}>
                  {warning.name}:
                </span>
                <div className="flex-1 max-w-xs">
                  <Progress 
                    value={warning.percentage} 
                    className={cn(
                      'h-2',
                      warning.percentage >= 90 ? 'bg-red-200' : 'bg-amber-200'
                    )}
                  />
                </div>
                <span className={cn('text-sm font-medium', config.textClass)}>
                  {warning.resourceKey === 'storage_gb'
                    ? `${Number(warning.current).toFixed(2)}/${warning.limit === -1 ? '∞' : Number(warning.limit).toFixed(2)} GB`
                    : `${warning.current}/${warning.limit === -1 ? '∞' : warning.limit}`
                  }
                </span>
                {warning.isBlocked && (
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                    ({t('subscription.limitReached') || 'Limit reached'})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={cn('flex items-center gap-2', isRTL ? 'mr-auto' : 'ml-auto')}>
        {config.showUpgrade && (
          <Link to="/subscription">
            <Button 
              variant={config.urgency === 'critical' || config.urgency === 'high' ? 'default' : 'outline'} 
              size="sm"
              className={config.urgency === 'critical' || config.urgency === 'high' ? '' : config.textClass}
            >
              {t('subscription.upgrade') || 'Upgrade'}
              <ChevronRight className={cn('h-4 w-4', isRTL ? 'mr-1 rotate-180' : 'ml-1')} />
            </Button>
          </Link>
        )}
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', config.textClass)}
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
}

export default SubscriptionStatusBanner;
