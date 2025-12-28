import { BarChart3, AlertTriangle, Infinity as InfinityIcon, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/hooks/useLanguage';
import { useUsage } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

export function UsageSummaryCard() {
  const { data, isLoading } = useUsage();
  const { t: _t, isRTL: _isRTL } = useLanguage();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { usage, warnings } = data;

  // Get top 5 usage items by percentage
  const topUsage = [...usage]
    .filter((u) => !u.isUnlimited)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5);

  const getProgressColor = (percentage: number, isWarning: boolean) => {
    if (percentage >= 100) return 'bg-red-500';
    if (isWarning) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <Card className={warnings.length > 0 ? 'border-yellow-400' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Resource Usage
          </CardTitle>
          {warnings.length > 0 && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <CardDescription>
          Your current resource utilization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {topUsage.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <InfinityIcon className="h-8 w-8 mx-auto mb-2" />
            <p>All resources are unlimited on your plan</p>
          </div>
        ) : (
          <>
            {topUsage.map((item) => (
              <div key={item.resourceKey} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className={cn(
                    item.isWarning && 'text-yellow-700 font-medium',
                    item.percentage >= 100 && 'text-red-700 font-medium'
                  )}>
                    {item.name}
                  </span>
                  <span className={cn(
                    'text-muted-foreground',
                    item.isWarning && 'text-yellow-700',
                    item.percentage >= 100 && 'text-red-700'
                  )}>
                    {item.current.toLocaleString()} / {item.limit.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={Math.min(item.percentage, 100)} 
                  className={cn(
                    'h-2',
                    `[&>div]:${getProgressColor(item.percentage, item.isWarning)}`
                  )}
                />
              </div>
            ))}

            {/* Warnings Section */}
            {warnings.filter(w => w.isBlocked).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                <strong>Limit Reached:</strong> Some resources have reached their limits. 
                Upgrade your plan to continue adding.
              </div>
            )}
          </>
        )}

        <div className="pt-2">
          <Button variant="outline" asChild className="w-full">
            <Link to="/subscription/usage" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              View All Usage
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
