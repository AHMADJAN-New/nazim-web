import { AlertTriangle, Ban, Sparkles, ChevronRight } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/hooks/useLanguage';
import { useResourceUsage, useSubscriptionStatus } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

interface UsageLimitWarningProps {
  resourceKey: string;
  className?: string;
  showProgress?: boolean;
  compact?: boolean;
}

/**
 * UsageLimitWarning component that shows warnings when approaching or reaching usage limits.
 * Use this in forms/pages where users create resources.
 */
export function UsageLimitWarning({
  resourceKey,
  className,
  showProgress = true,
  compact = false,
}: UsageLimitWarningProps) {
  const { t, isRTL } = useLanguage();
  const usage = useResourceUsage(resourceKey);
  const { data: status } = useSubscriptionStatus();

  // Don't show for unlimited resources or when under 80%
  if (usage.isUnlimited || usage.percentage < 80) {
    return null;
  }

  const isBlocked = !usage.canCreate;
  const isWarning = usage.percentage >= 80 && usage.percentage < 100;
  const isCritical = usage.percentage >= 90 || isBlocked;

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm',
          isBlocked 
            ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300'
            : isCritical
              ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300'
              : 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-300',
          className
        )}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {isBlocked ? (
          <Ban className="h-4 w-4 flex-shrink-0" />
        ) : (
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        )}
        <span className="flex-1">
          {isBlocked 
            ? (t('subscription.limitReachedCantCreate') || 'Limit reached. Cannot create more.')
            : resourceKey === 'storage_gb'
              ? `${Number(usage.current).toFixed(2)}/${usage.limit === -1 ? '∞' : Number(usage.limit).toFixed(2)} GB ${t('subscription.used') || 'used'} (${Math.round(usage.percentage)}%)`
              : `${usage.current}/${usage.limit === -1 ? '∞' : usage.limit}${usage.unit ? ` ${usage.unit}` : ''} ${t('subscription.used') || 'used'} (${Math.round(usage.percentage)}%)`
          }
        </span>
        {showProgress && !isBlocked && (
          <Progress 
            value={usage.percentage} 
            className={cn(
              'w-20 h-2',
              isCritical ? 'bg-red-200' : 'bg-amber-200'
            )}
          />
        )}
        <Link to="/subscription">
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
            {t('subscription.upgrade') || 'Upgrade'}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <Alert
      className={cn(
        isBlocked 
          ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
          : isCritical
            ? 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800'
            : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800',
        className
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {isBlocked ? (
        <Ban className={cn(
          'h-5 w-5',
          'text-red-500 dark:text-red-400'
        )} />
      ) : (
        <AlertTriangle className={cn(
          'h-5 w-5',
          isCritical ? 'text-amber-500 dark:text-amber-400' : 'text-yellow-500 dark:text-yellow-400'
        )} />
      )}
      <div className="flex-1">
        <AlertTitle className={cn(
          'font-semibold',
          isBlocked 
            ? 'text-red-700 dark:text-red-300'
            : isCritical
              ? 'text-amber-700 dark:text-amber-300'
              : 'text-yellow-700 dark:text-yellow-300'
        )}>
          {isBlocked 
            ? (t('subscription.limitReached') || 'Limit Reached')
            : (t('subscription.approachingLimit') || 'Approaching Limit')
          }
        </AlertTitle>
        <AlertDescription className={cn(
          'mt-1',
          isBlocked 
            ? 'text-red-600 dark:text-red-400'
            : isCritical
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-yellow-600 dark:text-yellow-400'
        )}>
          {isBlocked 
            ? (t('subscription.cannotCreateMore') || 'You have reached the maximum limit for this resource. Upgrade your plan to create more.')
            : (t('subscription.usageWarningMessage') || 'You are approaching the usage limit for this resource.')
          }
        </AlertDescription>
        
        {showProgress && (
          <div className="mt-3 flex items-center gap-3">
            <Progress 
              value={usage.percentage} 
              className={cn(
                'flex-1 h-2',
                isBlocked 
                  ? 'bg-red-200 dark:bg-red-800'
                  : isCritical 
                    ? 'bg-amber-200 dark:bg-amber-800' 
                    : 'bg-yellow-200 dark:bg-yellow-800'
              )}
            />
            <span className={cn(
              'text-sm font-medium whitespace-nowrap',
              isBlocked 
                ? 'text-red-700 dark:text-red-300'
                : isCritical
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-yellow-700 dark:text-yellow-300'
            )}>
              {resourceKey === 'storage_gb'
                ? `${Number(usage.current).toFixed(2)} / ${usage.limit === -1 ? '∞' : Number(usage.limit).toFixed(2)} GB`
                : `${usage.current} / ${usage.limit === -1 ? '∞' : usage.limit}${usage.unit ? ` ${usage.unit}` : ''}`
              }
            </span>
          </div>
        )}

        {/* Show current plan info */}
        {status?.plan && (
          <p className="mt-2 text-xs opacity-75">
            {t('subscription.currentPlan') || 'Current plan'}: {status.plan}
          </p>
        )}
      </div>
      
      <Link to="/subscription" className={isRTL ? 'mr-auto' : 'ml-auto'}>
        <Button 
          variant={isBlocked || isCritical ? 'default' : 'outline'} 
          size="sm"
        >
          <Sparkles className={cn('h-4 w-4', isRTL ? 'ml-2' : 'mr-2')} />
          {t('subscription.upgradePlan') || 'Upgrade Plan'}
          <ChevronRight className={cn('h-4 w-4', isRTL ? 'mr-1 rotate-180' : 'ml-1')} />
        </Button>
      </Link>
    </Alert>
  );
}

/**
 * Hook to check if creation is allowed for a resource
 */
export function useCanCreate(resourceKey: string): {
  canCreate: boolean;
  current: number;
  limit: number;
  remaining: number;
  percentage: number;
  isWarning: boolean;
  isUnlimited: boolean;
} {
  const usage = useResourceUsage(resourceKey);
  return {
    canCreate: usage.canCreate,
    current: usage.current,
    limit: usage.limit,
    remaining: usage.remaining,
    percentage: usage.percentage,
    isWarning: usage.isWarning,
    isUnlimited: usage.isUnlimited,
  };
}

export default UsageLimitWarning;
