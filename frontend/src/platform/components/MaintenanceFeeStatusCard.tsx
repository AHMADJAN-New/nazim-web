import { AlertTriangle, CheckCircle, Clock, CreditCard, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import type { OrganizationSubscription } from '@/types/api/subscription';

interface MaintenanceFeeStatusCardProps {
  subscription: OrganizationSubscription | null;
  organizationId: string;
  onRecordPayment?: () => void;
}

export function MaintenanceFeeStatusCard({
  subscription,
  organizationId,
  onRecordPayment,
}: MaintenanceFeeStatusCardProps) {
  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Maintenance Fee Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No subscription data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Maintenance Fee Status
        </CardTitle>
        <CardDescription>Recurring payment for support, updates, and hosting</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {subscription.next_maintenance_due_at ? (
          <>
            {(() => {
              const nextDue = new Date(subscription.next_maintenance_due_at);
              const now = new Date();
              const isOverdue = nextDue < now;
              const daysDiff = Math.floor((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

              return (
                <>
                  {isOverdue ? (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Overdue</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Next Due</span>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {formatDate(nextDue)}
                    {!isOverdue && daysDiff >= 0 && (
                      <span className="ml-2">({daysDiff} days remaining)</span>
                    )}
                    {isOverdue && (
                      <span className="ml-2 text-red-600 dark:text-red-400">
                        ({Math.abs(daysDiff)} days overdue)
                      </span>
                    )}
                  </div>
                </>
              );
            })()}
            {subscription.last_maintenance_paid_at && (
              <div className="text-sm text-muted-foreground">
                Last paid: {formatDate(new Date(subscription.last_maintenance_paid_at))}
              </div>
            )}
            {subscription.plan && (
              <div className="text-sm text-muted-foreground">
                Amount: {subscription.currency === 'AFN'
                  ? `${subscription.plan.maintenance_fee_afn?.toLocaleString() ?? 0} AFN`
                  : `${subscription.plan.maintenance_fee_usd?.toLocaleString() ?? 0} USD`}
                {subscription.billing_period && (
                  <span className="ml-1">
                    ({subscription.billing_period === 'monthly' ? 'Monthly' :
                      subscription.billing_period === 'quarterly' ? 'Quarterly' :
                        subscription.billing_period === 'yearly' ? 'Yearly' : 'Custom'})
                  </span>
                )}
              </div>
            )}
            {onRecordPayment ? (
              <Button size="sm" onClick={onRecordPayment}>
                <CreditCard className="h-4 w-4 mr-2" />
                Record Maintenance Payment
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link to={`/platform/organizations/${organizationId}/subscription`}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Maintenance Payment
                </Link>
              </Button>
            )}
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm">No maintenance due</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
