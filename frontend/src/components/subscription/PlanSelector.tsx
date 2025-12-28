import { Check, Crown, Star, Zap, Building2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  enterprise: Building2,
};

const PLAN_HIGHLIGHTS: Record<string, string[]> = {
  trial: ['7-day free trial', 'Full feature access', 'Limited counts'],
  starter: ['Up to 50 students', '10 staff members', 'Basic reporting'],
  basic: ['Up to 200 students', '30 staff members', 'Finance module', 'Library'],
  pro: ['Up to 1000 students', 'All features', 'Question bank', 'Custom branding'],
  enterprise: ['Unlimited students', 'Multi-school', 'API access', 'Priority support'],
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

  const formatPrice = (plan: SubscriptionPlan) => {
    const price = currency === 'USD' ? plan.priceYearlyUsd : plan.priceYearlyAfn;
    if (price === 0) return 'Free';
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'fa-AF', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getSchoolsPrice = (plan: SubscriptionPlan) => {
    const price = currency === 'USD' ? plan.perSchoolPriceUsd : plan.perSchoolPriceAfn;
    if (price === 0 || plan.maxSchools <= 1) return null;
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'fa-AF', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
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
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle>{plan.name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="mb-4">
                  <span className="text-3xl font-bold">{formatPrice(plan)}</span>
                  {plan.priceYearlyAfn > 0 && (
                    <span className="text-muted-foreground">/year</span>
                  )}
                </div>

                {/* Schools Price */}
                {getSchoolsPrice(plan) && (
                  <p className="text-sm text-muted-foreground mb-4">
                    +{getSchoolsPrice(plan)}/school/year (up to {plan.maxSchools} included)
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
