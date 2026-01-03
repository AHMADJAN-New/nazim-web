import { useEffect, type ReactNode } from 'react';

import { initializeAccessibility } from './lib/accessibility';
import { initializePerformanceMonitoring } from './lib/performance';
import { initializeSecurity } from './lib/security-core';

export function RootBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Run after first paint - initialize security measures
    initializeSecurity();

    // Initialize performance monitoring only in production or when explicitly enabled
    if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_PERF_MONITORING === 'true') {
      initializePerformanceMonitoring();
    }

    // Accessibility can be completely non-critical - defer by 1 second
    setTimeout(() => {
      initializeAccessibility();
    }, 1000);

    // Suppress ResizeObserver loop warnings (benign browser warnings)
    const resizeObserverErrorHandler = (e: ErrorEvent) => {
      if (e.message === 'ResizeObserver loop completed with undelivered notifications.' || 
          e.message === 'ResizeObserver loop limit exceeded') {
        e.stopImmediatePropagation();
        return false;
      }
      return true;
    };

    window.addEventListener('error', resizeObserverErrorHandler, true);

    return () => {
      window.removeEventListener('error', resizeObserverErrorHandler, true);
    };
  }, []);

  return <>{children}</>;
}
