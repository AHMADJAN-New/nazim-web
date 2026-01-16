/**
 * Tour Provider Wrapper
 * 
 * Wraps TourProvider with profile data from AuthContext and handles tour completion.
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api/client';
import { TourProvider } from '@/onboarding';
import type { TourDefinition } from '@/onboarding/types';

interface TourProviderWrapperProps {
  children: React.ReactNode;
  tours: TourDefinition[];
  autoStart?: boolean;
}

export function TourProviderWrapper({ children, tours, autoStart = false }: TourProviderWrapperProps) {
  const location = useLocation();
  const { profile, profileLoading, refreshAuth } = useAuth();
  const [shouldAutoStart, setShouldAutoStart] = useState(false);

  // Prevent auto-start loops in a single browser session (e.g., strict mode remounts)
  const AUTO_START_SESSION_KEY = 'tour:autoStart:done';

  // Wait for profile to load before deciding to auto-start
  useEffect(() => {
    if (!profileLoading) {
      // Never auto-start tours on subscription routes (blocked users are forced here)
      // This prevents infinite “start → missing targets → cleanup → start” loops and UI blinking.
      const isOnSubscriptionRoute = location.pathname.startsWith('/subscription');
      if (isOnSubscriptionRoute) {
        setShouldAutoStart(false);
        return;
      }

      // If we've already auto-started once in this session, don't do it again.
      const alreadyAutoStarted = typeof window !== 'undefined' && sessionStorage.getItem(AUTO_START_SESSION_KEY) === 'true';
      if (alreadyAutoStarted) {
        setShouldAutoStart(false);
        return;
      }

      // Auto-start initial setup tour if:
      // 1. autoStart is explicitly true, OR
      // 2. User hasn't completed onboarding (profile is null OR has_completed_onboarding is false/undefined)
      // If profile is null, assume user hasn't completed onboarding (show tour)
      const hasCompletedOnboarding = profile?.has_completed_onboarding === true;
      const shouldStart = autoStart || !hasCompletedOnboarding;
      
      if (import.meta.env.DEV) {
        console.log('[TourProviderWrapper] Auto-start decision:', {
          autoStart,
          profile: profile ? 'loaded' : 'null',
          has_completed_onboarding: profile?.has_completed_onboarding,
          shouldStart,
        });
      }
      
      setShouldAutoStart(shouldStart);

      if (shouldStart && typeof window !== 'undefined') {
        sessionStorage.setItem(AUTO_START_SESSION_KEY, 'true');
      }
    }
  }, [profileLoading, profile, autoStart, location.pathname]);

  // Handle tour completion - mark profile as completed
  const handleTourComplete = async (tourId: string) => {
    if (tourId === 'initialSetup' && profile && profile.has_completed_onboarding !== true) {
      try {
        // Update profile to mark onboarding as completed
        await authApi.updateProfile({
          has_completed_onboarding: true,
          onboarding_completed_at: new Date().toISOString(),
        });
        
        // Refresh auth to get updated profile
        await refreshAuth();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[TourProviderWrapper] Failed to mark onboarding as completed:', error);
        }
      }
    }
  };

  return (
    <TourProvider
      tours={tours}
      autoStart={shouldAutoStart}
      profile={profile}
      onTourComplete={handleTourComplete}
    >
      {children}
    </TourProvider>
  );
}

