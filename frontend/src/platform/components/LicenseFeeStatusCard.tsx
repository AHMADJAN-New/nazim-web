import { AlertTriangle, CheckCircle, CreditCard, Lock } from 'lucide-react';
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

interface LicenseFeeStatusCardProps {
  subscription: OrganizationSubscription | null;
  organizationId: string;
  onRecordPayment?: () => void;
}

export function LicenseFeeStatusCard({
  subscription,
  organizationId,
  onRecordPayment,
}: LicenseFeeStatusCardProps) {
  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            License Fee Status
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
          <Lock className="h-5 w-5" />
          License Fee Status
        </CardTitle>
        <CardDescription>One-time payment for software access</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {subscription.license_paid_at ? (
          <>
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">License Paid</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Paid on: {formatDate(new Date(subscription.license_paid_at))}
            </div>
            {(subscription.license_payment ?? subscription.plan) && (
              <div className="text-sm text-muted-foreground">
                Amount: {subscription.license_payment
                  ? `${Number(subscription.license_payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${subscription.license_payment.currency}`
                  : subscription.plan
                    ? (subscription.currency === 'AFN'
                      ? `${Number(subscription.plan.license_fee_afn ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} AFN`
                      : `${Number(subscription.plan.license_fee_usd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`)
                    : '—'}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">License Unpaid</span>
            </div>
            {subscription.plan && (
              <div className="text-sm text-muted-foreground">
                Amount Due: {subscription.currency === 'AFN'
                  ? `${subscription.plan.license_fee_afn?.toLocaleString() ?? 0} AFN`
                  : `${subscription.plan.license_fee_usd?.toLocaleString() ?? 0} USD`}
              </div>
            )}
            {onRecordPayment ? (
              <Button size="sm" onClick={onRecordPayment}>
                <CreditCard className="h-4 w-4 mr-2" />
                Record License Payment
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link to={`/platform/organizations/${organizationId}/subscription`}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record License Payment
                </Link>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
