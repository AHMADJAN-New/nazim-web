import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { maintenanceApi } from '@/lib/api/client';
import MaintenancePage from '@/pages/MaintenancePage';

interface MaintenanceModeDetail {
  message?: string;
  retryAfter?: number | null;
  scheduledEnd?: string | null;
}

export function MaintenanceModeHandler({ children }: { children: React.ReactNode }) {
  const [maintenanceMode, setMaintenanceMode] = useState<MaintenanceModeDetail | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Check if user is a platform admin (has platform admin session flag)
  const isPlatformAdminSession = localStorage.getItem('is_platform_admin_session') === 'true';

  // CRITICAL: Periodically check maintenance status to clear maintenance mode when disabled
  // Also check on initial mount to handle page refreshes
  // Always check status (even when maintenanceMode is null) to detect when maintenance is enabled
  const { data: maintenanceStatus } = useQuery({
    queryKey: ['maintenance-status-check'],
    queryFn: async () => {
      try {
        const response = await maintenanceApi.getPublicStatus();
        return response.data;
      } catch (error) {
        // If we can't fetch status, assume maintenance is disabled
        return { is_maintenance_mode: false };
      }
    },
    refetchInterval: (data) => {
      // CRITICAL: Always poll when maintenanceMode state is set (to detect when it's disabled)
      // Also poll when API says maintenance is active
      // This ensures we can clear the state when maintenance is disabled
      if (maintenanceMode !== null) {
        // State is set - poll frequently to detect when it's disabled
        return 10000; // Check every 10 seconds
      }
      if (data?.is_maintenance_mode) {
        // API says maintenance is active - poll frequently
        return 10000; // Check every 10 seconds
      }
      // No maintenance active - poll less frequently (just to detect when it becomes active)
      return 30000; // Check every 30 seconds
    },
    staleTime: 5 * 1000, // Consider data stale after 5 seconds
  });

  // CRITICAL: On initial mount, check if maintenance is active and set state accordingly
  useEffect(() => {
    if (maintenanceStatus && maintenanceStatus.is_maintenance_mode && !maintenanceMode) {
      // Maintenance is active but state is not set - set it
      setMaintenanceMode({
        message: maintenanceStatus.message || undefined,
        retryAfter: null,
        scheduledEnd: maintenanceStatus.scheduled_end_at || undefined,
      });
    }
  }, [maintenanceStatus, maintenanceMode]);

  // CRITICAL: Clear maintenance mode when backend reports it's disabled
  useEffect(() => {
    if (maintenanceStatus && !maintenanceStatus.is_maintenance_mode) {
      // Maintenance mode has been disabled - clear the state immediately
      // Clear state even if it wasn't set (handles edge cases)
      if (maintenanceMode !== null) {
        setMaintenanceMode(null);
        
        // Dispatch event to notify other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('maintenance-mode-cleared'));
        }
      }
      
      // If user is on maintenance page, redirect to dashboard or home
      if (location.pathname === '/maintenance') {
        if (user) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/auth', { replace: true });
        }
      }
    }
  }, [maintenanceStatus, maintenanceMode, location.pathname, navigate, user]);

  useEffect(() => {
    const handleMaintenanceMode = (event: CustomEvent<MaintenanceModeDetail>) => {
      const detail = event.detail;
      setMaintenanceMode({
        message: detail.message,
        retryAfter: detail.retryAfter,
        scheduledEnd: detail.scheduledEnd,
      });

      // Allow platform admin routes to work even during maintenance
      const isPlatformAdminRoute = location.pathname.startsWith('/platform');
      
      // Allow public routes to work
      const isPublicRoute = 
        location.pathname === '/auth' ||
        location.pathname === '/platform/login' ||
        location.pathname.startsWith('/verify') ||
        location.pathname === '/';

      // CRITICAL: For regular users (not platform admins), redirect to maintenance page immediately
      // Only navigate to maintenance page if:
      // 1. Not on a platform admin route (platform admins can access)
      // 2. Not on a public route
      // 3. Not already on maintenance page
      if (!isPlatformAdminRoute && !isPublicRoute && location.pathname !== '/maintenance') {
        // Immediately redirect to maintenance page
        navigate('/maintenance', { replace: true });
      }
    };

    const handleMaintenanceModeCleared = () => {
      // Clear maintenance mode when explicitly cleared
      setMaintenanceMode(null);
      if (location.pathname === '/maintenance') {
        if (user) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/auth', { replace: true });
        }
      }
    };

    window.addEventListener('maintenance-mode', handleMaintenanceMode as EventListener);
    window.addEventListener('maintenance-mode-cleared', handleMaintenanceModeCleared);

    return () => {
      window.removeEventListener('maintenance-mode', handleMaintenanceMode as EventListener);
      window.removeEventListener('maintenance-mode-cleared', handleMaintenanceModeCleared);
    };
  }, [navigate, location.pathname, user]);

  // CRITICAL: If maintenance mode is active and user is logged in (not platform admin), show maintenance page
  // This ensures regular users see maintenance page even if they're on dashboard
  useEffect(() => {
    if (maintenanceMode && user && !isPlatformAdminSession) {
      // User is logged in but not a platform admin - redirect to maintenance page
      const isPlatformAdminRoute = location.pathname.startsWith('/platform');
      const isPublicRoute = 
        location.pathname === '/auth' ||
        location.pathname === '/platform/login' ||
        location.pathname.startsWith('/verify') ||
        location.pathname === '/';
      
      if (!isPlatformAdminRoute && !isPublicRoute && location.pathname !== '/maintenance') {
        navigate('/maintenance', { replace: true });
      }
    }
  }, [maintenanceMode, user, isPlatformAdminSession, location.pathname, navigate]);

  // CRITICAL: If maintenance mode is active, show maintenance page for regular users
  // Platform admins can still access their routes
  if (maintenanceMode) {
    const isPlatformAdminRoute = location.pathname.startsWith('/platform');
    const isPublicRoute = 
      location.pathname === '/auth' ||
      location.pathname === '/platform/login' ||
      location.pathname.startsWith('/verify') ||
      location.pathname === '/';
    
    // Allow platform admin routes to work
    if (isPlatformAdminRoute) {
      return <>{children}</>;
    }
    
    // Allow public routes to work
    if (isPublicRoute) {
      return <>{children}</>;
    }
    
    // For all other routes (including dashboard), show maintenance page
    // This ensures regular users see maintenance page instead of broken dashboard
    if (location.pathname === '/maintenance') {
      return (
        <MaintenancePage
          message={maintenanceMode.message}
          retryAfter={maintenanceMode.retryAfter}
          scheduledEnd={maintenanceMode.scheduledEnd}
        />
      );
    }
    
    // If not on maintenance page, show maintenance page directly (don't navigate during render)
    // This prevents the broken dashboard from showing
    return (
      <MaintenancePage
        message={maintenanceMode.message}
        retryAfter={maintenanceMode.retryAfter}
        scheduledEnd={maintenanceMode.scheduledEnd}
      />
    );
  }

  return <>{children}</>;
}

