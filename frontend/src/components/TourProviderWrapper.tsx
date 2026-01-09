/**
 * Tour Provider Wrapper
 * 
 * Wraps TourProvider with profile data from AuthContext and handles tour completion.
 */

import { useEffect, useState } from 'react';
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
  const { profile, profileLoading, refreshAuth } = useAuth();
  const [shouldAutoStart, setShouldAutoStart] = useState(false);

  // Wait for profile to load before deciding to auto-start
  useEffect(() => {
    if (!profileLoading) {
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
    }
  }, [profileLoading, profile, autoStart]);

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

