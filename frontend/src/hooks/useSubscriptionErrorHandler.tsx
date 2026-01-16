import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLanguage } from './useLanguage';

import { showToast } from '@/lib/toast';

interface SubscriptionErrorDetail {
  code: string;
  message: string;
  resourceKey?: string;
  featureKey?: string;
  missingDependencies?: string[];
  requiredPlan?: { slug: string; name: string } | null;
  current?: number;
  limit?: number;
  subscriptionStatus?: string;
  accessLevel?: string;
}

/**
 * Global subscription error handler that listens for subscription-related API errors
 * and shows appropriate toast messages and/or redirects users.
 * 
 * Add this hook to your App or main layout component.
 */
// Track recently shown error toasts to prevent duplicates
const recentlyShownErrors = new Map<string, number>();
const ERROR_TOAST_DEBOUNCE_MS = 3000; // Don't show same error toast within 3 seconds

export function useSubscriptionErrorHandler() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubscriptionError = useCallback((event: CustomEvent<SubscriptionErrorDetail>) => {
    const { code, message, resourceKey, featureKey, current, limit, missingDependencies, requiredPlan } = event.detail;
    
    // Create a unique key for this error to prevent duplicate toasts
    const errorKey = `${code}-${featureKey || resourceKey || 'unknown'}`;
    const now = Date.now();
    const lastShown = recentlyShownErrors.get(errorKey);
    
    // Skip if we've shown this error recently
    if (lastShown && now - lastShown < ERROR_TOAST_DEBOUNCE_MS) {
      return;
    }
    
    // Mark as shown
    recentlyShownErrors.set(errorKey, now);

    switch (code) {
      case 'NO_SUBSCRIPTION':
        showToast.error(
          t('subscription.noSubscription') || 
          'No active subscription. Please subscribe to access this feature.'
        );
        // Redirect to subscription page
        navigate('/subscription');
        break;

      case 'LIMIT_REACHED':
        showToast.error(
          message || 
          t('subscription.limitReachedMessage') || 
          `You have reached the limit for ${resourceKey || 'this resource'} (${current}/${limit}). Please upgrade your plan.`
        );
        break;

      case 'FEATURE_NOT_AVAILABLE':
        showToast.error(
          message || 
          t('subscription.featureNotAvailableMessage') || 
          `The ${featureKey || 'requested'} feature is not available on your current plan.`
        );
        break;

      case 'FEATURE_DEPENDENCY_MISSING': {
        const dependencyList = (missingDependencies && missingDependencies.length > 0)
          ? ` Missing: ${missingDependencies.join(', ')}.`
          : '';
        const planInfo = requiredPlan?.name ? ` Requires ${requiredPlan.name} plan.` : '';

        showToast.error(
          message || 
          `This feature requires additional modules.${dependencyList}${planInfo}`
        );
        break;
      }

      case 'FEATURE_READONLY':
        showToast.warning(
          message || 
          'This feature is in read-only mode. You can view data but cannot edit until you upgrade.'
        );
        break;

      case 'WRITE_ACCESS_DENIED':
        showToast.warning(
          message || 
          t('subscription.writeAccessDenied') || 
          'Your subscription does not allow write access. Please renew to make changes.'
        );
        break;

      case 'READ_ACCESS_DENIED':
        showToast.error(
          message || 
          t('subscription.readAccessDenied') || 
          'Your subscription has expired. Please renew to access your data.'
        );
        // Redirect to subscription page
        navigate('/subscription');
        break;

      default:
        // Generic subscription error
        showToast.error(
          message || 
          t('subscription.genericError') || 
          'A subscription error occurred. Please check your subscription status.'
        );
    }
  }, [t, navigate]);

  useEffect(() => {
    const handler = (event: Event) => {
      handleSubscriptionError(event as CustomEvent<SubscriptionErrorDetail>);
    };

    window.addEventListener('subscription-error', handler);

    return () => {
      window.removeEventListener('subscription-error', handler);
    };
  }, [handleSubscriptionError]);
}

/**
 * Type guard to check if an error is a subscription error
 */
export function isSubscriptionError(error: unknown): error is Error & {
  isSubscriptionError: true;
  code: string;
  subscriptionStatus?: string;
  accessLevel?: string;
  resourceKey?: string;
  featureKey?: string;
  missingDependencies?: string[];
  requiredPlan?: { slug: string; name: string } | null;
  current?: number;
  limit?: number;
  upgradeRequired?: boolean;
  availableAddons?: string[];
} {
  return error instanceof Error && (error as any).isSubscriptionError === true;
}

/**
 * Get subscription error details from an error object
 */
export function getSubscriptionErrorDetails(error: unknown) {
  if (!isSubscriptionError(error)) {
    return null;
  }

  return {
    code: error.code,
    message: error.message,
    subscriptionStatus: error.subscriptionStatus,
    accessLevel: error.accessLevel,
    resourceKey: error.resourceKey,
    featureKey: error.featureKey,
    missingDependencies: error.missingDependencies,
    requiredPlan: error.requiredPlan,
    current: error.current,
    limit: error.limit,
    upgradeRequired: error.upgradeRequired,
    availableAddons: error.availableAddons,
  };
}

export default useSubscriptionErrorHandler;
