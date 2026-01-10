import { Check, Crown, Star, Zap, Building2, Info, Shield } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/hooks/useLanguage';
import { useSubscriptionPlans, type SubscriptionPlan } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

interface PlanSelectorProps {
  onSelectPlan: (plan: SubscriptionPlan, additionalSchools: number) => void;
  currentPlanSlug?: string;
}

const PLAN_ICONS: Record<string, React.ElementType> = {
  trial: Zap,
  starter: Star,
  basic: Star,
  pro: Crown,
  complete: Shield,
  enterprise: Building2,
};

const PLAN_ICON_COLORS: Record<string, string> = {
  trial: 'text-yellow-500', // Bright yellow for trial
  starter: 'text-blue-500', // Blue for starter
  basic: 'text-blue-500', // Legacy alias for starter
  pro: 'text-amber-500', // Amber/gold for pro
  complete: 'text-emerald-500', // Emerald for complete
  enterprise: 'text-purple-500', // Purple for enterprise
};

const PLAN_HIGHLIGHTS: Record<string, string[]> = {
  trial: ['7-day free trial', 'Full feature access', 'Limited counts'],
  starter: ['Up to 250 students', '10 users', 'Exams Lite', 'Timetable & attendance'],
  basic: ['Up to 250 students', '10 users', 'Exams Lite', 'Timetable & attendance'],
  pro: ['Up to 600 students', 'Exams Full', 'Materials + library', 'Short courses'],
  complete: ['Up to 1200 students', 'Finance + DMS', 'Certificates + cards', 'Report templates'],
  enterprise: ['Custom limits', 'Multi-branch', 'Multi-currency', 'Integrations'],
};

export function PlanSelector({ onSelectPlan, currentPlanSlug }: PlanSelectorProps) {
  const { data: plans, isLoading } = useSubscriptionPlans();
  const { t: _t, isRTL: _isRTL } = useLanguage();
  const [currency, setCurrency] = useState<'AFN' | 'USD'>('AFN');
  const [additionalSchools, _setAdditionalSchools] = useState(0);

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No plans available</p>
      </div>
    );
  }

  // Filter out trial plan from selection (it's automatic)
  const selectablePlans = plans.filter((p) => p.slug !== 'trial');

  const formatPrice = (amount: number) => {
    if (amount === 0) return 'Free';
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'fa-AF', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getLicenseFee = (plan: SubscriptionPlan) => {
    return currency === 'USD' ? plan.licenseFeeUsd : plan.licenseFeeAfn;
  };

  const getMaintenanceFee = (plan: SubscriptionPlan) => {
    return currency === 'USD' ? plan.maintenanceFeeUsd : plan.maintenanceFeeAfn;
  };

  const getTotalFee = (plan: SubscriptionPlan) => {
    return currency === 'USD' ? plan.totalFeeUsd : plan.totalFeeAfn;
  };

  const getSchoolsPrice = (plan: SubscriptionPlan) => {
    const price = currency === 'USD' ? plan.perSchoolPriceUsd : plan.perSchoolPriceAfn;
    if (price === 0 || plan.maxSchools <= 1) return null;
    return formatPrice(price);
  };

  // Get billing period label for maintenance fees
  const getBillingPeriodSuffix = (plan: SubscriptionPlan) => {
    switch (plan.billingPeriod) {
      case 'monthly': return '/month';
      case 'quarterly': return '/quarter';
      case 'yearly': return '/year';
      case 'custom': return plan.customBillingDays ? `/${plan.customBillingDays} days` : '/period';
      default: return '/year';
    }
  };

  return (
    <div className="space-y-6">
      {/* Currency Toggle */}
      <div className="flex items-center justify-center gap-4">
        <Label htmlFor="currency-toggle">AFN</Label>
        <Switch
          id="currency-toggle"
          checked={currency === 'USD'}
          onCheckedChange={(checked) => setCurrency(checked ? 'USD' : 'AFN')}
        />
        <Label htmlFor="currency-toggle">USD</Label>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {selectablePlans.map((plan) => {
          const Icon = PLAN_ICONS[plan.slug] || Star;
          const iconColor = PLAN_ICON_COLORS[plan.slug] || 'text-gray-500';
          const highlights = PLAN_HIGHLIGHTS[plan.slug] || [];
          const isCurrent = plan.slug === currentPlanSlug;
          const isPopular = plan.slug === 'pro';

          return (
            <Card 
              key={plan.id} 
              className={cn(
                'relative flex flex-col',
                isCurrent && 'border-primary border-2',
                isPopular && !isCurrent && 'border-yellow-400 border-2'
              )}
            >
              {isPopular && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-yellow-400 text-yellow-900">Most Popular</Badge>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge>Current Plan</Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-5 w-5", iconColor)} />
                  <CardTitle>{plan.name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                {/* Fee Breakdown */}
                <div className="mb-4 space-y-2">
                  {/* License Fee (One-time) */}
                  {plan.hasLicenseFee && (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{formatPrice(getLicenseFee(plan))}</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-help">
                              One-time
                              <Info className="h-3 w-3" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>License fee is a one-time payment for software access</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                  
                  {/* Maintenance Fee (Recurring) */}
                  {plan.hasMaintenanceFee && (
                    <div className="flex items-center gap-2">
                      <span className={cn("font-bold", plan.hasLicenseFee ? "text-xl" : "text-2xl")}>
                        {plan.hasLicenseFee && "+ "}
                        {formatPrice(getMaintenanceFee(plan))}
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-help">
                              {plan.billingPeriodLabel}
                              <Info className="h-3 w-3" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Maintenance fee is a recurring payment for support, updates, and hosting</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}

                  {/* Total (if both fees exist) */}
                  {plan.hasLicenseFee && plan.hasMaintenanceFee && (
                    <div className="pt-2 border-t mt-2">
                      <p className="text-sm text-muted-foreground">
                        First year total: <span className="font-semibold">{formatPrice(getTotalFee(plan))}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Then {formatPrice(getMaintenanceFee(plan))}{getBillingPeriodSuffix(plan)}
                      </p>
                    </div>
                  )}

                  {/* Legacy display for plans without fee separation */}
                  {!plan.hasLicenseFee && !plan.hasMaintenanceFee && (
                    <>
                      <span className="text-3xl font-bold">{formatPrice(currency === 'USD' ? plan.priceYearlyUsd : plan.priceYearlyAfn)}</span>
                      {plan.priceYearlyAfn > 0 && (
                        <span className="text-muted-foreground">/year</span>
                      )}
                    </>
                  )}
                </div>

                {/* Schools Price */}
                {getSchoolsPrice(plan) && (
                  <p className="text-sm text-muted-foreground mb-4">
                    +{getSchoolsPrice(plan)}/school{getBillingPeriodSuffix(plan)} (up to {plan.maxSchools} included)
                  </p>
                )}

                <ul className="space-y-2">
                  {highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={isCurrent}
                  onClick={() => onSelectPlan(plan, additionalSchools)}
                >
                  {isCurrent ? 'Current Plan' : 'Select Plan'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
