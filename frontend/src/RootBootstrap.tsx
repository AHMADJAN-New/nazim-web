import { useEffect, type ReactNode } from 'react';
import { initializeSecurity } from './lib/security-core';
import { initializePerformanceMonitoring } from './lib/performance';
import { initializeAccessibility } from './lib/accessibility';

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
  }, []);

  return <>{children}</>;
}
