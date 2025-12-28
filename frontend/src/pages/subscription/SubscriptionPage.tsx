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
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { SubscriptionStatusCard } from '@/components/subscription/SubscriptionStatusCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { 
  useSubscriptionStatus, 
  useUsage, 
  useFeatures,
  usePaymentHistory,
  useSubscriptionHistory,
} from '@/hooks/useSubscription';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function SubscriptionPage() {
  const { t: _t, isRTL } = useLanguage();
  const { data: status, isLoading: _statusLoading } = useSubscriptionStatus();
  const { data: usageData, isLoading: usageLoading } = useUsage();
  const { data: features, isLoading: featuresLoading } = useFeatures();
  const { data: payments, isLoading: paymentsLoading } = usePaymentHistory();
  const { data: history, isLoading: historyLoading } = useSubscriptionHistory();

  const [activeTab, setActiveTab] = useState('overview');

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscription</h1>
          <p className="text-muted-foreground">Manage your subscription and usage</p>
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
