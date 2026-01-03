import { Lock, Sparkles, ChevronRight } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasFeature, useFeatures } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

interface FeatureGuardProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

/**
 * FeatureGuard component that conditionally renders children based on feature access.
 * If the feature is not available, shows an upgrade prompt or custom fallback.
 */
export function FeatureGuard({
  featureKey,
  children,
  fallback,
  showUpgradePrompt = true,
}: FeatureGuardProps) {
  const hasFeature = useHasFeature(featureKey);
  const { data: features, isLoading } = useFeatures();
  const { t, isRTL } = useLanguage();

  // While loading, show nothing or a loading state
  if (isLoading) {
    return null;
  }

  // Feature is available, render children
  if (hasFeature) {
    return <>{children}</>;
  }

  // Feature not available - show fallback or upgrade prompt
  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  // Get feature info for display
  const featureInfo = features?.find((f) => f.featureKey === featureKey);
  const featureName = featureInfo?.name || featureKey;
  const featureDescription = featureInfo?.description || '';
  const canPurchaseAddon = featureInfo?.canPurchaseAddon ?? false;

  return (
    <Card 
      className="border-dashed border-2 border-muted-foreground/25"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg">
          {t('subscription.featureNotAvailable') || 'Feature Not Available'}
        </CardTitle>
        <CardDescription>
          {featureName} {t('subscription.isNotIncluded') || 'is not included in your current plan.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        {featureDescription && (
          <p className="text-sm text-muted-foreground">
            {featureDescription}
          </p>
        )}
        
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link to="/subscription">
            <Button variant="default">
              <Sparkles className={cn('h-4 w-4', isRTL ? 'ml-2' : 'mr-2')} />
              {canPurchaseAddon 
                ? (t('subscription.purchaseAddon') || 'Purchase Add-on')
                : (t('subscription.upgradePlan') || 'Upgrade Plan')
              }
              <ChevronRight className={cn('h-4 w-4', isRTL ? 'mr-1 rotate-180' : 'ml-1')} />
            </Button>
          </Link>
          <Link to="/subscription#features">
            <Button variant="outline">
              {t('subscription.viewFeatures') || 'View Features'}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Hook-based feature check for programmatic usage
 */
export function useFeatureGuard(featureKey: string): {
  hasAccess: boolean;
  isLoading: boolean;
  featureInfo: {
    name: string;
    description: string;
    canPurchaseAddon: boolean;
    addonPriceAfn: number;
    addonPriceUsd: number;
  } | null;
} {
  const hasFeature = useHasFeature(featureKey);
  const { data: features, isLoading } = useFeatures();

  const featureInfo = features?.find((f) => f.featureKey === featureKey);

  return {
    hasAccess: hasFeature,
    isLoading,
    featureInfo: featureInfo ? {
      name: featureInfo.name,
      description: featureInfo.description,
      canPurchaseAddon: featureInfo.canPurchaseAddon,
      addonPriceAfn: featureInfo.addonPriceAfn,
      addonPriceUsd: featureInfo.addonPriceUsd,
    } : null,
  };
}

export default FeatureGuard;
