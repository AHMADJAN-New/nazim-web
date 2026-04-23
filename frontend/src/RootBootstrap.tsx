import { useEffect, type ReactNode } from 'react';

type IdleCallback = (cb: () => void) => number;

const scheduleIdle: IdleCallback = (cb) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return (window as unknown as { requestIdleCallback: IdleCallback }).requestIdleCallback(cb);
  }
  return window.setTimeout(cb, 1);
};

export function RootBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    let cancelled = false;

    // Defer non-critical bootstrap modules until after first paint so they
    // don't bloat the initial bundle. Each module is code-split via import().
    const idleHandle = scheduleIdle(() => {
      if (cancelled) return;

      import('./lib/security-core')
        .then(({ initializeSecurity }) => {
          if (!cancelled) initializeSecurity();
        })
        .catch(() => { /* non-fatal */ });

      if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_PERF_MONITORING === 'true') {
        import('./lib/performance')
          .then(({ initializePerformanceMonitoring }) => {
            if (!cancelled) initializePerformanceMonitoring();
          })
          .catch(() => { /* non-fatal */ });
      }
    });

    // Accessibility is fully non-critical — defer further.
    const a11yTimer = window.setTimeout(() => {
      if (cancelled) return;
      import('./lib/accessibility')
        .then(({ initializeAccessibility }) => {
          if (!cancelled) initializeAccessibility();
        })
        .catch(() => { /* non-fatal */ });
    }, 1500);

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
      cancelled = true;
      window.clearTimeout(a11yTimer);
      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as unknown as { cancelIdleCallback: (h: number) => void }).cancelIdleCallback(idleHandle);
      }
      window.removeEventListener('error', resizeObserverErrorHandler, true);
    };
  }, []);

  return <>{children}</>;
}
