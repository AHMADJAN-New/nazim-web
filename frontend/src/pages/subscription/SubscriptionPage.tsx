import { 
  CreditCard, 
  BarChart3, 
  History, 
  Settings, 
  Crown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Infinity as InfinityIcon,
  Receipt,
  FileText,
  Lock,
  RefreshCw,
  HeadphonesIcon,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

import { SubscriptionStatusCard } from '@/components/subscription/SubscriptionStatusCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { 
  useSubscriptionStatus, 
  useSubscriptionGateStatus,
  useUsage, 
  useFeatures,
  usePaymentHistory,
  useSubscriptionHistory,
} from '@/hooks/useSubscription';
import { 
  useMaintenanceFees,
  useLicenseFees,
} from '@/hooks/useMaintenanceLicenseFees';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function SubscriptionPage() {
  const { t, tUnsafe, isRTL } = useLanguage();
  const { data: status, isLoading: _statusLoading } = useSubscriptionStatus();
  const { data: gateStatus } = useSubscriptionGateStatus();
  const { data: usageData, isLoading: usageLoading } = useUsage();
  const { data: features, isLoading: featuresLoading } = useFeatures();
  const { data: payments, isLoading: paymentsLoading } = usePaymentHistory();
  const { data: history, isLoading: historyLoading } = useSubscriptionHistory();
  const { data: maintenanceStatus, isLoading: maintenanceLoading } = useMaintenanceFees();
  const { data: licenseStatus, isLoading: licenseLoading } = useLicenseFees();

  const [activeTab, setActiveTab] = useState('overview');
  
  // Determine subscription status for messaging
  const subscriptionAlert = useMemo(() => {
    if (!gateStatus) return null;
    
    const { status: subStatus, accessLevel, trialEndsAt, message } = gateStatus;
    
    // Check if trial is expired
    const isTrialExpired = subStatus === 'trial' && 
      trialEndsAt && 
      trialEndsAt < new Date();
    
    // Determine alert type based on status
    if (isTrialExpired) {
      return {
        type: 'trialEnded' as const,
        variant: 'destructive' as const,
        icon: Clock,
        // NOTE: Not in generated TranslationKey union yet, so use tUnsafe
        title: tUnsafe('subscription.trialEnded'),
        description: tUnsafe('subscription.trialEndedDescription'),
        showRenewButton: true,
      };
    }
    
    if (subStatus === 'suspended') {
      return {
        type: 'suspended' as const,
        variant: 'destructive' as const,
        icon: XCircle,
        title: t('subscription.suspended'),
        description: message || t('subscription.suspendedDescription'),
        showContactButton: true,
      };
    }
    
    if (subStatus === 'expired' || accessLevel === 'blocked' || accessLevel === 'none') {
      return {
        type: 'expired' as const,
        variant: 'destructive' as const,
        icon: XCircle,
        title: t('subscription.expired'),
        description: t('subscription.expiredDescription'),
        showRenewButton: true,
      };
    }
    
    if (subStatus === 'cancelled') {
      return {
        type: 'cancelled' as const,
        variant: 'destructive' as const,
        icon: XCircle,
        title: t('subscription.cancelled'),
        description: t('subscription.cancelledDescription'),
        showRenewButton: true,
      };
    }
    
    if (subStatus === 'readonly' || accessLevel === 'readonly') {
      return {
        type: 'readonly' as const,
        variant: 'default' as const,
        icon: Lock,
        title: t('subscription.readOnlyMode'),
        description: t('subscription.cannotMakeChanges'),
        showRenewButton: true,
      };
    }
    
    if (subStatus === 'grace_period' || accessLevel === 'grace') {
      return {
        type: 'grace' as const,
        variant: 'default' as const,
        icon: AlertTriangle,
        title: t('subscription.gracePeriod'),
        description: t('subscription.gracePeriodDescription'),
        showRenewButton: true,
      };
    }
    
    return null;
  }, [gateStatus, t]);

  const groupedFeatures = features?.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, typeof features>);

  const getPaymentStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'confirmed':
        return <Badge variant="default" className="bg-green-500">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{paymentStatus}</Badge>;
    }
  };

  const getHistoryActionIcon = (action: string) => {
    switch (action) {
      case 'created':
      case 'trial_started':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'activated':
      case 'renewed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'upgraded':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'grace_period':
      case 'readonly':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'expired':
      case 'suspended':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Subscription Status Alert */}
      {subscriptionAlert && (
        <Alert 
          variant={subscriptionAlert.variant} 
          className={cn(
            subscriptionAlert.variant === 'destructive' 
              ? 'border-red-500/50 bg-red-50 dark:bg-red-950/20' 
              : 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20'
          )}
        >
          <subscriptionAlert.icon className={cn(
            "h-5 w-5",
            subscriptionAlert.variant === 'destructive' 
              ? 'text-red-600 dark:text-red-500' 
              : 'text-yellow-600 dark:text-yellow-500'
          )} />
          <AlertTitle className={cn(
            "text-lg font-semibold",
            subscriptionAlert.variant === 'destructive' 
              ? 'text-red-800 dark:text-red-400' 
              : 'text-yellow-800 dark:text-yellow-400'
          )}>
            {subscriptionAlert.title}
          </AlertTitle>
          <AlertDescription className={cn(
            "mt-2",
            subscriptionAlert.variant === 'destructive' 
              ? 'text-red-700 dark:text-red-300' 
              : 'text-yellow-700 dark:text-yellow-300'
          )}>
            <p className="mb-4">{subscriptionAlert.description}</p>
            <div className="flex gap-2">
              {subscriptionAlert.showRenewButton && (
                <Button size="sm" asChild>
                  <Link to="/subscription/renew">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('subscription.renewNow')}
                  </Link>
                </Button>
              )}
              {subscriptionAlert.showContactButton && (
                <Button size="sm" variant="outline" asChild>
                  <a href="mailto:support@nazim.app">
                    <HeadphonesIcon className="h-4 w-4 mr-2" />
                    {t('subscription.contactSupport')}
                  </a>
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          {/* NOTE: Not in generated TranslationKey union yet, so use tUnsafe */}
          <h1 className="text-3xl font-bold">{tUnsafe('subscription.subscriptionManagement')}</h1>
          <p className="text-muted-foreground">{tUnsafe('subscription.yourSubscriptionStatus')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/subscription/plans">View Plans</Link>
          </Button>
          {status && !status.isTrial && (
            <Button asChild>
              <Link to="/subscription/renew">Renew</Link>
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-flex">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden md:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden md:inline">Usage</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden md:inline">Features</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden md:inline">History</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <SubscriptionStatusCard />

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {usageData?.warnings && usageData.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">{usageData.warnings.length} resource warning(s)</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {features?.filter(f => f.isEnabled).length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Active Features</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {payments?.filter(p => p.status === 'confirmed').length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Payments</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* License & Maintenance Fees */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* License Fee Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  {t('subscription.licenseFee') || 'License Fee'}
                </CardTitle>
                <CardDescription>
                  {t('subscription.licenseFeeDescription') || 'One-time payment for software access'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {licenseLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ) : licenseStatus ? (
                  <>
                    {licenseStatus.licensePaid ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-medium">{t('subscription.licensePaid') || 'License Paid'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">{t('subscription.licenseUnpaid') || 'License Unpaid'}</span>
                      </div>
                    )}
                    {licenseStatus.licensePaidAt && (
                      <div className="text-sm text-muted-foreground">
                        {t('subscription.paidOn') || 'Paid on'}: {formatDate(licenseStatus.licensePaidAt)}
                      </div>
                    )}
                    {licenseStatus.licenseAmount && (
                      <div className="text-sm text-muted-foreground">
                        {t('common.amount') || 'Amount'}: {licenseStatus.licenseAmount.toLocaleString()} {licenseStatus.currency}
                      </div>
                    )}
                    {!licenseStatus.licensePaid && (
                      <Button size="sm" variant="outline" asChild className="w-full">
                        <Link to="/subscription/license-fees">
                          {t('subscription.payLicense') || 'Pay License Fee'}
                        </Link>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" asChild className="w-full">
                      <Link to="/subscription/license-fees">
                        {t('subscription.viewLicenseHistory') || 'View License History'}
                      </Link>
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">{t('subscription.noSubscription') || 'No subscription found'}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Maintenance Fee Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  {t('subscription.maintenanceFee') || 'Maintenance Fee'}
                </CardTitle>
                <CardDescription>
                  {t('subscription.maintenanceFeeDescription') || 'Recurring payment for support, updates, and hosting'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {maintenanceLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ) : maintenanceStatus ? (
                  <>
                    {maintenanceStatus.isOverdue ? (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">{t('subscription.maintenanceOverdue') || 'Overdue'}</span>
                      </div>
                    ) : maintenanceStatus.nextDueDate ? (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">{t('subscription.nextMaintenanceDue') || 'Next Due'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-medium">{t('subscription.noMaintenanceDue') || 'No Maintenance Due'}</span>
                      </div>
                    )}
                    {maintenanceStatus.nextDueDate && (
                      <div className="text-sm text-muted-foreground">
                        {formatDate(maintenanceStatus.nextDueDate)}
                        {maintenanceStatus.daysUntilDue !== null && maintenanceStatus.daysUntilDue !== undefined && (
                          <span className="ml-2">
                            ({maintenanceStatus.daysUntilDue} {t('subscription.daysUntilDue') || 'days'})
                          </span>
                        )}
                      </div>
                    )}
                    {maintenanceStatus.lastPaidDate && (
                      <div className="text-sm text-muted-foreground">
                        {t('subscription.lastPaid') || 'Last paid'}: {formatDate(maintenanceStatus.lastPaidDate)}
                      </div>
                    )}
                    {maintenanceStatus.amount && (
                      <div className="text-sm text-muted-foreground">
                        {t('common.amount') || 'Amount'}: {maintenanceStatus.amount.toLocaleString()} {maintenanceStatus.currency}
                      </div>
                    )}
                    <Button size="sm" variant="outline" asChild className="w-full">
                      <Link to="/subscription/maintenance-fees">
                        {t('subscription.viewMaintenanceInvoices') || 'View Maintenance Invoices'}
                      </Link>
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">{t('subscription.noSubscription') || 'No subscription found'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Payments */}
          {payments && payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Recent Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.slice(0, 3).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <div className="font-medium">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: payment.currency,
                          }).format(payment.amount)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(payment.paymentDate)}
                          {payment.paymentType && (
                            <span className="ml-2">
                              ({payment.paymentType === 'license' 
                                ? t('subscription.licensePayment') || 'License'
                                : payment.paymentType === 'maintenance'
                                ? t('subscription.maintenancePayment') || 'Maintenance'
                                : t('subscription.renewalPayment') || 'Renewal'})
                            </span>
                          )}
                        </div>
                      </div>
                      {getPaymentStatusBadge(payment.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Resource Usage
              </CardTitle>
              <CardDescription>
                Monitor your resource utilization across all limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-2 bg-gray-200 rounded w-full"></div>
                    </div>
                  ))}
                </div>
              ) : usageData?.usage && usageData.usage.length > 0 ? (
                <div className="space-y-6">
                  {usageData.usage.map((item) => (
                    <div key={item.resourceKey} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={cn(
                            'font-medium',
                            item.isWarning && 'text-yellow-700',
                            item.percentage >= 100 && 'text-red-700'
                          )}>
                            {item.name}
                          </div>
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                        </div>
                        <div className="text-right">
                          {item.isUnlimited ? (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <InfinityIcon className="h-4 w-4" />
                              <span>Unlimited</span>
                            </div>
                          ) : (
                            <>
                              <div className={cn(
                                'font-medium',
                                item.isWarning && 'text-yellow-700',
                                item.percentage >= 100 && 'text-red-700'
                              )}>
                                {item.current.toLocaleString()} / {item.limit.toLocaleString()}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {item.percentage.toFixed(1)}%
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      {!item.isUnlimited && (
                        <Progress 
                          value={Math.min(item.percentage, 100)} 
                          className="h-2"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No usage data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          {featuresLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="h-10 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : groupedFeatures && Object.keys(groupedFeatures).length > 0 ? (
            Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="capitalize">{category.replace('_', ' ')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {categoryFeatures?.map((feature) => (
                      <div 
                        key={feature.featureKey}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg border',
                          feature.isEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                        )}
                      >
                        <div>
                          <div className="font-medium">{feature.name}</div>
                          {feature.description && (
                            <div className="text-sm text-muted-foreground">{feature.description}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {feature.isAddon && (
                            <Badge variant="outline" className="text-xs">Add-on</Badge>
                          )}
                          {feature.isEnabled ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No features data available</p>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : payments && payments.length > 0 ? (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <div className="font-medium">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: payment.currency,
                            }).format(payment.amount)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(payment.paymentDate)} • {payment.paymentMethod.replace('_', ' ')}
                          </div>
                        </div>
                        {getPaymentStatusBadge(payment.status)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No payments yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subscription History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Activity Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : history && history.length > 0 ? (
                  <div className="space-y-3">
                    {history.slice(0, 10).map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        {getHistoryActionIcon(entry.action)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium capitalize">
                            {entry.action.replace('_', ' ')}
                          </div>
                          {entry.toPlanName && (
                            <div className="text-sm text-muted-foreground">
                              {entry.fromPlanName ? `${entry.fromPlanName} → ` : ''}{entry.toPlanName}
                            </div>
                          )}
                          {entry.notes && (
                            <div className="text-sm text-muted-foreground truncate">{entry.notes}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDate(entry.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No history yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
